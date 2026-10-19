import type {
  LanguageOption,
  SessionConfig,
  SessionState,
  TranscriptMessage,
  ProviderError,
  GeminiVoiceName,
} from '../types/interpreter';
import type { VoiceTranslationProvider } from './providers/types';
import { GeminiLiveProvider } from './providers/geminiLiveProvider';
import {
  RealtimeAudioPlayer,
  float32ToInt16,
  arrayBufferToBase64,
  downsampleTo16k,
  getSharedOutputLevel,
  isSharedPlaybackActive,
  playNormalizedAudioWav,
} from './audio/pcmHelper';
import { TranslationGuard } from './translationSupervisor';
import { extractMedicalDosages } from './languageCatalog';
import { detectSpeakerByLanguage } from '../utils/speakerDetection';
import {
  detectMedicalTutorialVideo,
  NURSE_CALL_VIDEO_URL,
} from '../utils/medicalTutorialDetection';

// How long the interpreter's echo can linger in the room after its voice stops
const ECHO_TAIL_MS = 350;
// Someone counts as "talking now" if speech was heard this recently
const SPEAKING_NOW_MS = 300;
// ...and as "finished" after this much quiet
const SPEECH_ENDED_MS = 500;
// Never hold a translation back longer than this
const MAX_HOLD_MS = 3000;

export class InterpreterSession {
  private activeProvider: VoiceTranslationProvider | null = null;
  private audioPlayer: RealtimeAudioPlayer;
  private mediaStream: MediaStream | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private silenceGainNode: GainNode | null = null;

  private onStateChangeCb: (state: SessionState) => void = () => {};
  private onTranscriptCb: (msg: TranscriptMessage) => void = () => {};
  private onInterimCb: (text: string) => void = () => {};
  private onLanguageDetectedCb: (lang: LanguageOption) => void = () => {};
  private onAudioLevelCb: (level: number) => void = () => {};
  private onMuteChangeCb: (muted: boolean) => void = () => {};
  private onErrorCb: (err: ProviderError) => void = () => {};

  private isRunning: boolean = false;
  private isStarting: boolean = false;
  private isStopping: boolean = false;
  private isMuted: boolean = false;
  private isAiSpeaking: boolean = false;
  private activeTargetLanguage: LanguageOption | null = null;
  private activeVoiceName: GeminiVoiceName = 'Zephyr';
  private pcmChunkBuffer: number[] = [];
  private lastAudioLevelTime: number = 0;
  private lastAudioProcessTime: number = 0;
  private healthTimer: ReturnType<typeof setInterval> | null = null;

  // Strict sequential lifecycle lock: guarantees that start() and stop() NEVER run concurrently,
  // preventing any race conditions even if the user starts and stops 10+ times in a row.
  private lifecycleMutex: Promise<void> = Promise.resolve();

  // Local speech detection (adaptive to the room's background noise)
  private noiseFloor = 0.004;
  private lastLocalSpeechAt = 0;
  // Live translation audio held back while someone is still talking
  private heldAudio: string[] = [];
  private holdStartedAt = 0;
  private holdTimer: ReturnType<typeof setInterval> | null = null;

  private guard: TranslationGuard;

  constructor() {
    this.audioPlayer = new RealtimeAudioPlayer((playing) => {
      this.isAiSpeaking = playing;
      if (playing) {
        this.onStateChangeCb('speaking');
      } else if (this.isRunning) {
        this.onStateChangeCb('listening');
      }
    });

    this.guard = new TranslationGuard({
      emitMessage: (msg) => this.onTranscriptCb(msg),
      speak: (text, lang) => this.speakWhenQuiet(text, lang),
      suppressLiveAudio: (turnId) => this.activeProvider?.suppressTurnAudio?.(turnId),
      recalibrate: (reason) => void this.recalibrateWhenQuiet(reason),
      getTargetLanguage: () => this.activeTargetLanguage,
    });
  }

  /** Interpreter audio is playing, or stopped so recently that its echo may still be in the room. */
  private isOutputActive(): boolean {
    return this.audioPlayer.msSincePlaybackEnd() < ECHO_TAIL_MS || isSharedPlaybackActive(ECHO_TAIL_MS);
  }

  private isSomeoneSpeaking(withinMs: number): boolean {
    return performance.now() - this.lastLocalSpeechAt < withinMs;
  }

  /** Live audio waits while the speaker is still talking, so a pause mid-sentence never talks over them. */
  private enqueueLiveAudio(chunk: string) {
    if (this.heldAudio.length === 0 && (this.audioPlayer.isPlaying() || !this.isSomeoneSpeaking(SPEAKING_NOW_MS))) {
      this.audioPlayer.playPcmChunk(chunk);
      return;
    }
    if (this.heldAudio.length === 0) this.holdStartedAt = performance.now();
    this.heldAudio.push(chunk);
    if (!this.holdTimer) {
      this.holdTimer = setInterval(() => {
        const waited = performance.now() - this.holdStartedAt;
        if (!this.isSomeoneSpeaking(SPEECH_ENDED_MS) || waited > MAX_HOLD_MS) this.releaseHeldAudio(true);
      }, 80);
    }
  }

  private releaseHeldAudio(play: boolean) {
    if (this.holdTimer) {
      clearInterval(this.holdTimer);
      this.holdTimer = null;
    }
    const chunks = this.heldAudio;
    this.heldAudio = [];
    if (play) chunks.forEach((c) => this.audioPlayer.playPcmChunk(c));
  }

  private isRoomQuiet(speechQuietMs: number): boolean {
    return (
      !this.audioPlayer.isPlaying() &&
      this.audioPlayer.msSincePlaybackEnd() > 400 &&
      !isSharedPlaybackActive(200) &&
      this.heldAudio.length === 0 &&
      !this.isSomeoneSpeaking(speechQuietMs)
    );
  }

  /** Restarts the live session between utterances, never in the middle of one. */
  private async recalibrateWhenQuiet(reason: string): Promise<void> {
    const deadline = performance.now() + 20000;
    while (performance.now() < deadline) {
      if (!this.isRunning) return;
      if (this.isRoomQuiet(1200)) {
        console.info('[TranslationGuard] Recalibrating live interpreter:', reason);
        this.activeProvider?.recalibrate?.(reason);
        return;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  /** Speaks a guard translation/correction once the room is quiet (gives up after a while). */
  private async speakWhenQuiet(text: string, languageCode: string): Promise<void> {
    if (!this.isRunning || !text.trim()) return;
    let audio: string | null = null;
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceName: this.activeVoiceName }),
      });
      if (res.ok) audio = (await res.json()).audio || null;
    } catch (err) {
      console.warn('[InterpreterSession] Correction speech unavailable:', err);
    }

    const deadline = performance.now() + 12000;
    while (performance.now() < deadline) {
      if (!this.isRunning) return;
      if (this.isRoomQuiet(700)) break;
      await new Promise((r) => setTimeout(r, 150));
    }
    if (!this.isRunning || performance.now() >= deadline) return;

    if (audio) {
      this.onStateChangeCb('speaking');
      await playNormalizedAudioWav(audio);
      if (this.isRunning) this.onStateChangeCb('listening');
      return;
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    await new Promise<void>((resolve) => {
      try {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = languageCode === 'tr' ? 'tr-TR' : languageCode;
        utter.onend = () => resolve();
        utter.onerror = () => resolve();
        window.speechSynthesis.speak(utter);
      } catch {
        resolve();
      }
    });
  }

  public setListeners(listeners: {
    onStateChange: (state: SessionState) => void;
    onTranscript: (msg: TranscriptMessage) => void;
    onInterim: (text: string) => void;
    onLanguageDetected: (lang: LanguageOption) => void;
    onAudioLevel?: (level: number) => void;
    onMuteChange?: (muted: boolean) => void;
    onError: (err: ProviderError) => void;
  }) {
    this.onStateChangeCb = listeners.onStateChange;
    this.onTranscriptCb = listeners.onTranscript;
    this.onInterimCb = listeners.onInterim;
    this.onLanguageDetectedCb = listeners.onLanguageDetected;
    if (listeners.onAudioLevel) {
      this.onAudioLevelCb = listeners.onAudioLevel;
    }
    if (listeners.onMuteChange) {
      this.onMuteChangeCb = listeners.onMuteChange;
    }
    this.onErrorCb = listeners.onError;
  }

  public start(config: SessionConfig): Promise<void> {
    this.lifecycleMutex = this.lifecycleMutex.then(
      () => this.executeStart(config),
      () => this.executeStart(config)
    );
    return this.lifecycleMutex;
  }

  public stop(): Promise<void> {
    this.lifecycleMutex = this.lifecycleMutex.then(
      () => this.executeStop(),
      () => this.executeStop()
    );
    return this.lifecycleMutex;
  }

  private async executeStart(config: SessionConfig): Promise<void> {
    if (this.isRunning) return;

    this.isStarting = true;

    if (!navigator.onLine) {
      this.isStarting = false;
      this.onErrorCb({
        code: 'OFFLINE',
        message: 'İnternet bağlantısı gerekli.',
      });
      this.onStateChangeCb('idle');
      return;
    }

    this.activeTargetLanguage = config.targetLanguage || null;
    this.isMuted = Boolean(config.initialMuted);
    this.pcmChunkBuffer = [];
    this.lastAudioProcessTime = performance.now();

    try {
      this.onStateChangeCb('connecting');

      // 1. Clean up old nodes / stream before starting fresh
      await this.cleanupAudioNodes();

      // 2. Request microphone stream (Compatible across iOS Safari, Android, Huawei & Desktop)
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (permErr: unknown) {
        console.error('[Microphone] Permission denied or device error:', permErr);
        this.isStarting = false;
        this.onErrorCb({
          code: 'MIC_PERMISSION_DENIED',
          message: 'Canlı tercüman için mikrofon izni verilmesi gerekiyor.',
        });
        this.onStateChangeCb('idle');
        return;
      }

      // Apply initial hardware track mute state if configured
      if (this.isMuted && this.mediaStream) {
        this.mediaStream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }

      // 3. Connect to Gemini Live Provider FIRST and confirm full connection readiness
      const provider = new GeminiLiveProvider();
      this.activeProvider = provider;

      const sessionConfig: SessionConfig = {
        ...config,
        voiceName: config.voiceName || this.activeVoiceName,
      };
      if (sessionConfig.voiceName) {
        this.activeVoiceName = sessionConfig.voiceName;
      }
      await this.connectLiveProvider(sessionConfig);

      // Verify that provider is actively connected
      if (!this.activeProvider?.isConnected) {
        throw new Error('Canlı tercüme sunucusuna bağlanılamadı.');
      }

      // 4. Setup or reuse Web Audio Context (resilient across desktop, Android, iPhone, and Huawei)
      // Reusing the AudioContext prevents hitting browser maximum limit of 6 contexts!
      const ctx = this.getOrCreateAudioContext();
      if (!ctx || !this.mediaStream) {
        throw new Error('Ses donanımı başlatılamadı');
      }

      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch (e) {
          console.warn('AudioContext resume note:', e);
        }
      }

      const sampleRate = ctx.sampleRate;
      this.sourceNode = ctx.createMediaStreamSource(this.mediaStream);

      // ScriptProcessor with 2048 buffer gives ~42ms low latency chunking
      this.processorNode = ctx.createScriptProcessor(2048, 1, 1);

      // WebKit / iOS Safari / Mobile Fix:
      // Connecting processorNode through a 0-gain node to audioCtx.destination guarantees that
      // onaudioprocess continues firing without pausing in background, and zero gain prevents feedback!
      this.silenceGainNode = ctx.createGain();
      this.silenceGainNode.gain.value = 0;

      this.processorNode.onaudioprocess = (e) => {
        if (!this.isRunning) return;
        this.lastAudioProcessTime = performance.now();

        // If muted, notify zero level and send nothing
        if (this.isMuted) {
          if (this.lastAudioLevelTime !== 0) {
            this.lastAudioLevelTime = 0;
            this.onAudioLevelCb(0);
          }
          return;
        }

        const channelData = e.inputBuffer.getChannelData(0);
        const now = performance.now();

        let sum = 0;
        for (let i = 0; i < channelData.length; i++) {
          sum += channelData[i] * channelData[i];
        }
        const rms = Math.sqrt(sum / channelData.length);

        // UI level meter (throttled to ~12fps)
        if (now - this.lastAudioLevelTime > 80) {
          this.lastAudioLevelTime = now;
          this.onAudioLevelCb(Math.min(1, rms * 8));
        }

        // While the interpreter's own voice (or its echo) is in the room, the microphone sends silence:
        // otherwise the model hears itself, transcribes its own translation and translates it again.
        // Silence (instead of nothing) keeps the server's end-of-speech timing intact.
        const echoGate = this.isOutputActive();

        if (!echoGate) {
          // Adaptive speech detection: follows the background noise level of the room
          if (rms < this.noiseFloor) this.noiseFloor = this.noiseFloor * 0.9 + rms * 0.1;
          else this.noiseFloor = Math.min(0.05, this.noiseFloor * 0.99 + rms * 0.01);
          if (rms > Math.max(0.012, this.noiseFloor * 3.2)) this.lastLocalSpeechAt = now;
        }

        // Resample native browser microphone rate down to 16kHz PCM for Gemini Live
        const resampled = echoGate
          ? new Float32Array(Math.round((channelData.length * 16000) / sampleRate))
          : downsampleTo16k(channelData, sampleRate);
        for (let i = 0; i < resampled.length; i++) {
          this.pcmChunkBuffer.push(resampled[i]);
        }

        // Stream continuous chunks of 2048 samples (~128ms)
        if (this.pcmChunkBuffer.length >= 2048) {
          const chunkToSend = new Float32Array(this.pcmChunkBuffer.slice(0, 2048));
          this.pcmChunkBuffer = this.pcmChunkBuffer.slice(2048);
          const int16 = float32ToInt16(chunkToSend);
          const base64 = arrayBufferToBase64(
            new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength)
          );

          if (this.activeProvider) {
            this.activeProvider.sendAudio(base64);
          }
        }
      };

      if (this.sourceNode && this.processorNode && this.silenceGainNode && this.inputAudioCtx) {
        this.sourceNode.connect(this.processorNode);
        this.processorNode.connect(this.silenceGainNode);
        this.silenceGainNode.connect(this.inputAudioCtx.destination);
      }

      // Everything is verified and connected!
      this.isRunning = true;
      this.isStarting = false;
      this.guard.start();
      this.onStateChangeCb('listening');

      // Start periodic health monitor to auto-revive audio graph if browser pauses it
      this.startHealthMonitor();
    } catch (err: unknown) {
      console.error('Session start error:', err);
      this.isStarting = false;
      const message =
        err instanceof Error ? err.message : 'Ses hattı başlatılamadı. Lütfen tekrar deneyin.';
      this.onErrorCb({
        code: 'SESSION_START_FAILED',
        message,
      });
      await this.executeStop();
    }
  }

  private startHealthMonitor() {
    if (this.healthTimer) clearInterval(this.healthTimer);
    this.healthTimer = setInterval(() => {
      if (!this.isRunning) return;
      if (this.inputAudioCtx && this.inputAudioCtx.state === 'suspended') {
        this.inputAudioCtx.resume().catch(() => {});
      }
    }, 2000);
  }

  private stopHealthMonitor() {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
  }

  public async checkAndReviveAudioGraph(): Promise<void> {
    if (!this.isRunning) return;
    if (this.inputAudioCtx && this.inputAudioCtx.state === 'suspended') {
      try {
        await this.inputAudioCtx.resume();
      } catch {}
    }
  }

  private getOrCreateAudioContext(): AudioContext | null {
    if (this.inputAudioCtx && this.inputAudioCtx.state !== 'closed') {
      return this.inputAudioCtx;
    }
    const audioWindow = window as unknown as { webkitAudioContext?: typeof AudioContext };
    const AudioCtxClass = window.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioCtxClass) return null;
    try {
      this.inputAudioCtx = new AudioCtxClass({ sampleRate: 16000 });
    } catch {
      try {
        this.inputAudioCtx = new AudioCtxClass();
      } catch (inner) {
        console.warn('AudioContext creation note:', inner);
      }
    }
    return this.inputAudioCtx;
  }

  private async connectLiveProvider(config: SessionConfig) {
    if (!this.activeProvider) return;
    await this.activeProvider.startSession(config, {
      onAudio: (audioData) => {
        this.enqueueLiveAudio(audioData);
      },
      onTurnUpdate: (turn) => {
        this.guard.onTurnUpdate(turn);
      },
      onTurnClosed: (turn) => {
        this.guard.onTurnClosed(turn);
      },
      onTranscript: (msg) => {
        this.onTranscriptCb(msg);
      },
      onInterimTranscript: (text) => {
        this.onInterimCb(text);
      },
      onStateChange: (state) => {
        if (this.isRunning) {
          this.onStateChangeCb(state);
        }
      },
      onLanguageDetected: (lang) => {
        this.activeTargetLanguage = lang;
        this.onLanguageDetectedCb(lang);
      },
      onInterrupted: () => {
        this.releaseHeldAudio(false);
        this.audioPlayer.interrupt();
        this.onInterimCb('');
      },
      onError: (error) => {
        console.warn('[GeminiLive Error notice]:', error.message);
      },
    });
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    if (muted) {
      this.onAudioLevelCb(0);
      this.onInterimCb('');
    }
    this.onMuteChangeCb(muted);
  }

  public toggleMute(): boolean {
    const next = !this.isMuted;
    this.setMuted(next);
    return next;
  }

  /** Loudness of the interpreter's spoken output (live + fallback speech), 0–1. */
  public getOutputLevel(): number {
    return Math.max(this.audioPlayer.getOutputLevel(), getSharedOutputLevel());
  }

  public isMicMuted(): boolean {
    return this.isMuted;
  }

  public setTargetLanguage(language: LanguageOption) {
    this.activeTargetLanguage = language;
    if (this.activeProvider) {
      this.activeProvider.setTargetLanguage(language);
    }
    this.guard.reset();
    this.releaseHeldAudio(false);
    this.audioPlayer.interrupt();
    this.isAiSpeaking = false;
    if (this.isRunning) {
      this.onStateChangeCb('listening');
    }
  }

  public setVoice(voiceName: GeminiVoiceName) {
    this.activeVoiceName = voiceName;
    if (this.activeProvider?.setVoice) {
      this.activeProvider.setVoice(voiceName);
    }
  }

  public getVoice(): GeminiVoiceName {
    return this.activeVoiceName;
  }

  public sendText(text: string) {
    if (this.isMuted || !text.trim()) return;
    const trimmed = text.trim();
    if (this.activeProvider?.isConnected) {
      this.activeProvider.sendText(trimmed);
      return;
    }

    // Direct fallback to REST translate endpoint if provider is offline
    (async () => {
      try {
        const detection = detectSpeakerByLanguage(trimmed, this.activeTargetLanguage?.code);
        const dosages = extractMedicalDosages(trimmed);
        const msgId = `txt-${Date.now()}`;

        this.onTranscriptCb({
          id: msgId,
          speaker: detection.speaker,
          originalText: trimmed,
          timestamp: Date.now(),
          highlightedDosages: dosages,
        });

        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: trimmed,
            targetLanguage: this.activeTargetLanguage?.name || 'English',
            speaker: detection.speaker,
          }),
        });

        if (res.ok) {
          const transData = await res.json();
          if (transData.translatedText) {
            const outDosages = extractMedicalDosages(transData.translatedText);
            const tutorial = detectMedicalTutorialVideo(trimmed, transData.translatedText);
            const isNurseCall =
              transData.showNurseCallTutorial || tutorial.type === 'nurse_call';
            const showTutorial =
              transData.showTutorialVideo || tutorial.shouldShow;
            const tutorialType =
              transData.tutorialVideoType || tutorial.type;
            const videoUrl =
              transData.tutorialVideoUrl || tutorial.videoUrl;

            this.onTranscriptCb({
              id: msgId,
              speaker: detection.speaker,
              originalText: trimmed,
              translatedText: transData.translatedText,
              timestamp: Date.now(),
              highlightedDosages: Array.from(new Set([...dosages, ...outDosages])),
              showNurseCallTutorial: isNurseCall,
              nurseCallTutorialVideoUrl: isNurseCall ? NURSE_CALL_VIDEO_URL : undefined,
              showTutorialVideo: showTutorial,
              tutorialVideoType: tutorialType || undefined,
              tutorialVideoUrl: videoUrl,
              tutorialVideoAltUrl: tutorial.altVideoUrl,
              tutorialVideoTitle: tutorial.title,
            });
          }
        }
      } catch (err) {
        console.error('Fallback text translation error:', err);
      }
    })();
  }

  /** Called when the visible conversation is replaced (new, restored or deleted conversation). */
  public resetConversationContext() {
    this.activeProvider?.resetTurnContext?.();
    this.guard.reset();
    this.onInterimCb('');
  }

  public interrupt() {
    this.releaseHeldAudio(false);
    this.audioPlayer.interrupt();
    if (this.activeProvider) {
      this.activeProvider.interrupt();
    }
  }

  private async cleanupAudioNodes() {
    if (this.processorNode) {
      this.processorNode.onaudioprocess = null;
      try {
        this.processorNode.disconnect();
      } catch {
        // ignore
      }
      this.processorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // ignore
      }
      this.sourceNode = null;
    }

    if (this.silenceGainNode) {
      try {
        this.silenceGainNode.disconnect();
      } catch {
        // ignore
      }
      this.silenceGainNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      this.mediaStream = null;
    }

    // Suspend AudioContext instead of closing it: this avoids browser limit exhaustion
    // and keeps the audio graph ready to resume instantly when restarted
    if (this.inputAudioCtx && this.inputAudioCtx.state === 'running') {
      try {
        await this.inputAudioCtx.suspend();
      } catch {
        // ignore
      }
    }
  }

  private async executeStop(): Promise<void> {
    if (this.isStopping) return;
    this.isStopping = true;
    this.isRunning = false;
    this.isStarting = false;
    this.isAiSpeaking = false;
    this.pcmChunkBuffer = [];
    this.stopHealthMonitor();
    this.guard.stop();
    this.releaseHeldAudio(false);

    await this.cleanupAudioNodes();
    this.interrupt();

    const providerToStop = this.activeProvider;
    this.activeProvider = null;
    if (providerToStop) {
      try {
        await providerToStop.stopSession();
      } catch {
        // ignore
      }
    }

    this.onAudioLevelCb(0);
    this.onInterimCb('');
    this.isStopping = false;
    this.onStateChangeCb('idle');
  }

  public destroy() {
    this.stopHealthMonitor();
    this.executeStop().catch(() => {});
    if (this.inputAudioCtx && this.inputAudioCtx.state !== 'closed') {
      try {
        this.inputAudioCtx.close();
      } catch {}
      this.inputAudioCtx = null;
    }
    this.audioPlayer.close();
  }
}

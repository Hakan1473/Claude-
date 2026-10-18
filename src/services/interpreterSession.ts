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
} from './audio/pcmHelper';
import { extractMedicalDosages } from './languageCatalog';
import { detectSpeakerByLanguage } from '../utils/speakerDetection';
import {
  detectMedicalTutorialVideo,
  NURSE_CALL_VIDEO_URL,
} from '../utils/medicalTutorialDetection';

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

  constructor() {
    this.audioPlayer = new RealtimeAudioPlayer((playing) => {
      this.isAiSpeaking = playing;
      if (playing) {
        this.onStateChangeCb('speaking');
      } else if (this.isRunning) {
        this.onStateChangeCb('listening');
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

        // Compute RMS volume level for UI equalizer and visualizer (throttled to ~12fps)
        const now = performance.now();
        if (now - this.lastAudioLevelTime > 80) {
          this.lastAudioLevelTime = now;
          let sum = 0;
          for (let i = 0; i < channelData.length; i++) {
            sum += channelData[i] * channelData[i];
          }
          const rms = Math.sqrt(sum / channelData.length);
          this.onAudioLevelCb(Math.min(1, rms * 8));
        }

        // When AI is actively outputting spoken translation, pause microphone sending to prevent echo loop
        if (this.isAiSpeaking || this.audioPlayer.isPlaying()) {
          this.pcmChunkBuffer = [];
          return;
        }

        // Resample native browser microphone rate down to 16kHz PCM for Gemini Live
        const resampled = downsampleTo16k(channelData, sampleRate);
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
        this.audioPlayer.playPcmChunk(audioData);
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

  public isMicMuted(): boolean {
    return this.isMuted;
  }

  public setTargetLanguage(language: LanguageOption) {
    this.activeTargetLanguage = language;
    if (this.activeProvider) {
      this.activeProvider.setTargetLanguage(language);
    }
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
    this.onInterimCb('');
  }

  public interrupt() {
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

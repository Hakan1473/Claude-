import type { VoiceTranslationProvider, ProviderCallbacks } from './types';
import type { SessionConfig, LanguageOption } from '../../types/interpreter';
import { extractMedicalDosages, fastDetectLanguage } from '../languageCatalog';
import { playNormalizedAudioWav } from '../audio/pcmHelper';
import { detectSpeakerByLanguage } from '../../utils/speakerDetection';
import {
  detectMedicalTutorialVideo,
  NURSE_CALL_VIDEO_URL,
} from '../../utils/medicalTutorialDetection';
import { speechCoordinator } from '../audio/speechCoordinator';

interface BrowserSpeechEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
}

interface BrowserSpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechEvent) => void) | null;
  onerror: ((err: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export class FallbackTranslationProvider implements VoiceTranslationProvider {
  public readonly name = 'REST Fallback (Gemini 3.8 Flash + TTS)';
  private callbacks: ProviderCallbacks = {};
  private activeTargetLanguage: LanguageOption | null = null;
  private isSessionActive = false;
  private recognition: BrowserSpeechRecognitionInstance | null = null;
  private lastProcessedFinalText = '';
  private lastProcessedTime = 0;

  public get isConnected(): boolean {
    return this.isSessionActive;
  }

  public async startSession(config: SessionConfig, callbacks: ProviderCallbacks): Promise<void> {
    this.callbacks = callbacks;
    this.activeTargetLanguage = config.targetLanguage || null;
    this.isSessionActive = true;
    this.lastProcessedFinalText = '';
    this.lastProcessedTime = 0;

    this.callbacks.onStateChange?.(
      this.activeTargetLanguage ? 'ready' : 'waiting_for_language'
    );

    // Initialize browser speech recognition if supported
    const speechWindow = window as unknown as {
      SpeechRecognition?: new () => BrowserSpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognitionInstance;
    };
    const SpeechRecognitionClass =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      try {
        this.recognition = new SpeechRecognitionClass();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'tr-TR';

        this.recognition.onresult = async (event: BrowserSpeechEvent) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          if (interim) {
            this.callbacks.onInterimTranscript?.(interim);
          }

          const trimmedFinal = final.trim();
          if (trimmedFinal) {
            const now = Date.now();
            if (
              trimmedFinal === this.lastProcessedFinalText &&
              now - this.lastProcessedTime < 3500
            ) {
              // Ignore duplicate final event for same utterance
              return;
            }
            this.lastProcessedFinalText = trimmedFinal;
            this.lastProcessedTime = now;
            await this.processSpokenText(trimmedFinal);
          }
        };

        this.recognition.onerror = (err: unknown) => {
          console.warn('[Fallback Speech Recognition Error]:', err);
        };

        this.recognition.onend = () => {
          if (this.isSessionActive) {
            try {
              this.recognition?.start();
            } catch {
              // ignore
            }
          }
        };

        this.recognition.start();
        this.callbacks.onStateChange?.('listening');
      } catch (_initErr) {
        console.warn('SpeechRecognition initialization failed:', _initErr);
      }
    }
  }

  private async processSpokenText(spokenText: string) {
    // 1. If language not set, check if it's a language statement (e.g. "Çinli hasta")
    if (!this.activeTargetLanguage) {
      const detected = fastDetectLanguage(spokenText);
      if (detected) {
        this.setTargetLanguage(detected);
        this.callbacks.onLanguageDetected?.(detected);
        this.callbacks.onTranscript?.({
          id: `sys-${Date.now()}`,
          speaker: 'nurse',
          originalText: spokenText,
          timestamp: Date.now(),
        });
        return;
      }
    }

    // Determine speaker: Turkish = nurse, Foreign/Target = patient
    const detection = detectSpeakerByLanguage(spokenText, this.activeTargetLanguage?.code);
    let speaker: 'nurse' | 'patient' = detection.speaker;
    const dosages = extractMedicalDosages(spokenText);
    const msgId = `in-${Date.now()}`;

    const tutorial = detectMedicalTutorialVideo(spokenText);
    const isNurseCall = tutorial.type === 'nurse_call';

    this.callbacks.onTranscript?.({
      id: msgId,
      speaker,
      originalText: spokenText,
      timestamp: Date.now(),
      highlightedDosages: dosages,
      showNurseCallTutorial: isNurseCall,
      nurseCallTutorialVideoUrl: isNurseCall ? NURSE_CALL_VIDEO_URL : undefined,
      showTutorialVideo: tutorial.shouldShow,
      tutorialVideoType: tutorial.type || undefined,
      tutorialVideoUrl: tutorial.videoUrl,
      tutorialVideoAltUrl: tutorial.altVideoUrl,
      tutorialVideoTitle: tutorial.title,
    });

    this.callbacks.onStateChange?.('interpreting');

    try {
      // Call server /api/translate
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: spokenText,
          targetLanguage: this.activeTargetLanguage?.name || 'English',
          speaker,
        }),
      });

      if (res.ok) {
        const transData = await res.json();
        const translatedText = transData.translatedText;
        if (transData.speaker === 'nurse' || transData.speaker === 'patient') {
          speaker = transData.speaker;
        }

        if (translatedText) {
          const outDosages = extractMedicalDosages(translatedText);
          const outTutorial = detectMedicalTutorialVideo(spokenText, translatedText);
          const isOutNurseCall =
            transData.showNurseCallTutorial ||
            tutorial.type === 'nurse_call' ||
            outTutorial.type === 'nurse_call';
          const showTutorial =
            transData.showTutorialVideo ||
            tutorial.shouldShow ||
            outTutorial.shouldShow;
          const tutorialType =
            transData.tutorialVideoType ||
            outTutorial.type ||
            tutorial.type;
          const videoUrl =
            transData.tutorialVideoUrl ||
            outTutorial.videoUrl ||
            tutorial.videoUrl;

          this.callbacks.onTranscript?.({
            id: msgId,
            speaker,
            originalText: spokenText,
            translatedText,
            timestamp: Date.now(),
            highlightedDosages: Array.from(new Set([...dosages, ...outDosages])),
            showNurseCallTutorial: isOutNurseCall,
            nurseCallTutorialVideoUrl: isOutNurseCall ? NURSE_CALL_VIDEO_URL : undefined,
            showTutorialVideo: showTutorial,
            tutorialVideoType: tutorialType || undefined,
            tutorialVideoUrl: videoUrl,
            tutorialVideoAltUrl: outTutorial.altVideoUrl || tutorial.altVideoUrl,
            tutorialVideoTitle: outTutorial.title || tutorial.title,
          });

          // Request speech synthesis ONLY if never vocalized before
          speechCoordinator.recordTranslation(spokenText, translatedText);
          const canSpeak = speechCoordinator.canVocalizeAutomatically(msgId, translatedText);
          if (canSpeak) {
            speechCoordinator.markVocalized(msgId, translatedText);
            const speechLangCode = speaker === 'nurse' ? (this.activeTargetLanguage?.code || 'en') : 'tr';
            this.speakTranslation(translatedText, speechLangCode);
          }
        }
      }
    } catch (err) {
      console.error('Translate call error:', err);
    }
  }

  private async speakTranslation(text: string, languageCode: string) {
    try {
      this.callbacks.onStateChange?.('speaking');

      // First try Gemini Flash Lite TTS
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, languageCode }),
      });

      if (res.ok) {
        const { audio } = await res.json();
        if (audio) {
          await playNormalizedAudioWav(audio);
          this.callbacks.onStateChange?.('listening');
          return;
        }
      }
    } catch (e) {
      console.warn('Backend TTS failed, using browser synthesis:', e);
    }

    // Fallback to browser SpeechSynthesis with maximum volume
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = languageCode;
      utterance.volume = 1.0;
      utterance.rate = 1.0;
      utterance.onend = () => this.callbacks.onStateChange?.('listening');
      window.speechSynthesis.speak(utterance);
    } else {
      this.callbacks.onStateChange?.('listening');
    }
  }

  public sendAudio(_base64Pcm16k: string): void {
    // In fallback mode, browser speech recognition directly captures mic
  }

  public sendText(text: string): void {
    this.processSpokenText(text);
  }

  public setTargetLanguage(language: LanguageOption): void {
    this.activeTargetLanguage = language;
  }

  public interrupt(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.callbacks.onInterrupted?.();
  }

  public async stopSession(): Promise<void> {
    this.isSessionActive = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
    this.interrupt();
    this.callbacks.onStateChange?.('idle');
  }
}

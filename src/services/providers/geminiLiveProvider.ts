import type { VoiceTranslationProvider, ProviderCallbacks } from './types';
import type { SessionConfig, LanguageOption, TranscriptMessage, GeminiVoiceName } from '../../types/interpreter';
import { extractMedicalDosages } from '../languageCatalog';
import { detectSpeakerByLanguage, mergeUtteranceClauses } from '../../utils/speakerDetection';
import {
  detectMedicalTutorialVideo,
  NURSE_CALL_VIDEO_URL,
} from '../../utils/medicalTutorialDetection';
import {
  normalizeTranscriptText,
  extractMedicalEntities,
} from '../../utils/medicalEntityExtractor';
import { speechCoordinator } from '../audio/speechCoordinator';
import { playNormalizedAudioWav } from '../audio/pcmHelper';

interface LiveServerPayload {
  type?: string;
  audio?: string;
  text?: string;
  speaker?: 'nurse' | 'patient';
  message?: string;
  fallbackRequired?: boolean;
  languageCode?: string;
  [key: string]: unknown;
}

export class GeminiLiveProvider implements VoiceTranslationProvider {
  public readonly name = 'Gemini Live (gemini-3.8-live)';
  private ws: WebSocket | null = null;
  private callbacks: ProviderCallbacks = {};
  private activeTargetLanguage: LanguageOption | null = null;
  private activeVoiceName: GeminiVoiceName = 'Zephyr';
  private isSessionActive = false;
  private isLiveReady = false;
  private lastInputText = '';
  private accumulatedOutputText = '';
  private lastInputMessage: TranscriptMessage | null = null;
  private translationFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private pendingOutgoingAudio: string[] = [];

  public get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public get isReady(): boolean {
    return this.isConnected && this.isLiveReady;
  }

  public async startSession(config: SessionConfig, callbacks: ProviderCallbacks): Promise<void> {
    this.callbacks = callbacks;
    this.activeTargetLanguage = config.targetLanguage || null;
    this.activeVoiceName = config.voiceName || 'Zephyr';
    this.isSessionActive = true;
    this.isLiveReady = false;
    this.reconnectAttempts = 0;
    this.pendingOutgoingAudio = [];

    this.callbacks.onStateChange?.('connecting');
    await this.connectWebSocket();
    this.startPingInterval();
  }

  private startPingInterval() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isSessionActive) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 8000);
  }

  private connectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private closeExistingWs() {
    if (this.connectTimeoutId) {
      clearTimeout(this.connectTimeoutId);
      this.connectTimeoutId = null;
    }
    if (this.ws) {
      const oldWs = this.ws;
      this.ws = null;
      try {
        oldWs.onopen = null;
        oldWs.onmessage = null;
        oldWs.onerror = null;
        oldWs.onclose = null;
        oldWs.close();
      } catch {
        // ignore
      }
    }
  }

  private connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isSessionActive) {
        resolve();
        return;
      }

      let settled = false;
      const safeResolve = () => {
        if (!settled) {
          settled = true;
          if (this.connectTimeoutId) {
            clearTimeout(this.connectTimeoutId);
            this.connectTimeoutId = null;
          }
          resolve();
        }
      };

      const safeReject = (err: unknown) => {
        if (!settled) {
          settled = true;
          if (this.connectTimeoutId) {
            clearTimeout(this.connectTimeoutId);
            this.connectTimeoutId = null;
          }
          reject(err);
        }
      };

      // Close any previous socket first: closeExistingWs() also clears connectTimeoutId,
      // so the watchdog below must be armed afterwards or it would be cancelled immediately
      this.closeExistingWs();

      // 7-second handshake watchdog ensures UI never gets stuck
      this.connectTimeoutId = setTimeout(() => {
        if (!this.isLiveReady) {
          if (this.isSessionActive) {
            this.scheduleReconnect();
          }
          safeReject(new Error('Tercüme bağlantısı zaman aşımına uğradı'));
        } else {
          safeResolve();
        }
      }, 7000);

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;

      try {
        const socket = new WebSocket(wsUrl);
        this.ws = socket;

        socket.onopen = () => {
          if (this.ws !== socket) return;
          this.reconnectAttempts = 0;
          // Send initial configuration to start the Gemini Live session
          socket.send(
            JSON.stringify({
              type: 'init',
              targetLanguage: this.activeTargetLanguage?.name,
              targetCountry: this.activeTargetLanguage?.country,
              voiceName: this.activeVoiceName,
            })
          );
        };

        socket.onmessage = (event) => {
          if (this.ws !== socket) return;
          try {
            const data = JSON.parse(event.data);
            this.handleServerMessage(data);
            if (data.type === 'ready') {
              this.isLiveReady = true;
              // Flush any buffered speech chunks accumulated during connection
              this.flushPendingAudio();
              this.callbacks.onStateChange?.(
                this.activeTargetLanguage ? 'ready' : 'waiting_for_language'
              );
              safeResolve();
            }
          } catch (e) {
            console.error('[GeminiLiveProvider] Error handling message:', e);
          }
        };

        socket.onerror = (err) => {
          if (this.ws !== socket) return;
          console.warn('[GeminiLiveProvider] WS connection error:', err);
          this.isLiveReady = false;
          if (this.isSessionActive) {
            this.scheduleReconnect();
          }
          safeReject(new Error('Canlı ses sunucusuna bağlanılamadı'));
        };

        socket.onclose = () => {
          if (this.ws === socket) {
            this.ws = null;
            this.isLiveReady = false;
            if (this.isSessionActive) {
              this.scheduleReconnect();
            }
          }
          safeReject(new Error('Canlı ses bağlantısı kapandı'));
        };
      } catch (err: unknown) {
        console.warn('[GeminiLiveProvider] WS init error:', err);
        this.isLiveReady = false;
        if (this.isSessionActive) {
          this.scheduleReconnect();
        }
        safeReject(err);
      }
    });
  }

  private flushPendingAudio() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isLiveReady) return;
    while (this.pendingOutgoingAudio.length > 0) {
      const chunk = this.pendingOutgoingAudio.shift();
      if (chunk) {
        try {
          this.ws.send(JSON.stringify({ type: 'audio', audio: chunk }));
        } catch {
          break;
        }
      }
    }
  }

  private scheduleReconnect() {
    if (!this.isSessionActive) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    const delay = Math.min(3000, 500 * (1.3 ** this.reconnectAttempts));
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      if (this.isSessionActive && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
        this.connectWebSocket().catch((e) => console.warn('Reconnect retry note:', e.message));
      }
    }, delay);
  }

  private handleServerMessage(data: LiveServerPayload) {
    switch (data.type) {
      case 'ready':
        this.isLiveReady = true;
        this.flushPendingAudio();
        this.callbacks.onStateChange?.(
          this.activeTargetLanguage ? 'ready' : 'waiting_for_language'
        );
        break;

      case 'voiceUpdated':
        if (data.voiceName) {
          this.activeVoiceName = data.voiceName as GeminiVoiceName;
        }
        this.isLiveReady = true;
        this.flushPendingAudio();
        break;

      case 'sessionReconnecting':
        this.isLiveReady = false;
        this.callbacks.onStateChange?.('connecting');
        break;

      case 'audio':
        if (data.audio) {
          // Live spoken audio arrived - cancel any pending fallback speech instantly
          if (this.translationFallbackTimer) {
            clearTimeout(this.translationFallbackTimer);
            this.translationFallbackTimer = null;
          }
          if (this.lastInputMessage?.id) {
            speechCoordinator.markVocalized(this.lastInputMessage.id);
          }
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
              window.speechSynthesis.cancel();
            } catch {
              // ignore
            }
          }
          this.callbacks.onAudio?.(data.audio);
          this.callbacks.onStateChange?.('speaking');
        }
        break;

      case 'interrupted':
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
          } catch {
            // ignore
          }
        }
        this.callbacks.onInterrupted?.();
        this.accumulatedOutputText = '';
        this.callbacks.onStateChange?.('listening');
        break;

      case 'interimTranscription':
        if (data.text) {
          this.callbacks.onInterimTranscript?.(data.text);
          this.callbacks.onStateChange?.('listening');
        }
        break;

      case 'inputTranscription':
        if (data.text) {
          const rawText = data.text.trim();
          // Filter out tiny phantom acoustic clicks
          if (rawText.length < 2) break;

          if (rawText && rawText !== this.lastInputText) {
            this.lastInputText = rawText;

            // Role Law:
            // Turkish speech = ALWAYS nurse (Hemşire)
            // Target language / foreign speech = ALWAYS patient (Hasta)
            const detection = detectSpeakerByLanguage(rawText, this.activeTargetLanguage?.code);
            const speaker: 'nurse' | 'patient' =
              (data.speaker as 'nurse' | 'patient') || detection.speaker;

            // Merge incoming clause with existing turn if open so long multi-clause sentences stay unbroken
            if (
              this.lastInputMessage &&
              !this.lastInputMessage.translatedText &&
              this.lastInputMessage.speaker === speaker
            ) {
              const mergedText = mergeUtteranceClauses(this.lastInputMessage.originalText, rawText);
              const dosages = extractMedicalDosages(mergedText);
              const tutorial = detectMedicalTutorialVideo(mergedText);
              const isNurseCall =
                this.lastInputMessage.showNurseCallTutorial || tutorial.type === 'nurse_call';
              this.lastInputMessage = {
                ...this.lastInputMessage,
                originalText: mergedText,
                showNurseCallTutorial: isNurseCall,
                nurseCallTutorialVideoUrl: isNurseCall ? NURSE_CALL_VIDEO_URL : undefined,
                showTutorialVideo: this.lastInputMessage.showTutorialVideo || tutorial.shouldShow,
                tutorialVideoType: tutorial.type || this.lastInputMessage.tutorialVideoType,
                tutorialVideoUrl: tutorial.videoUrl || this.lastInputMessage.tutorialVideoUrl,
                tutorialVideoAltUrl: tutorial.altVideoUrl || this.lastInputMessage.tutorialVideoAltUrl,
                tutorialVideoTitle: tutorial.title || this.lastInputMessage.tutorialVideoTitle,
                highlightedDosages: Array.from(
                  new Set([...(this.lastInputMessage.highlightedDosages || []), ...dosages])
                ),
              };
              this.callbacks.onTranscript?.(this.lastInputMessage);
            } else {
              const cleanText = normalizeTranscriptText(rawText, data.languageCode);
              const dosages = extractMedicalDosages(cleanText);
              const entities = extractMedicalEntities(cleanText);
              const tutorial = detectMedicalTutorialVideo(cleanText);
              const isNurseCall = tutorial.type === 'nurse_call';
              const msg: TranscriptMessage = {
                id: `in-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                speaker,
                originalText: cleanText,
                timestamp: Date.now(),
                language: data.languageCode || (speaker === 'nurse' ? 'tr' : this.activeTargetLanguage?.code),
                highlightedDosages: dosages,
                highlightedEntities: entities,
                showNurseCallTutorial: isNurseCall,
                nurseCallTutorialVideoUrl: isNurseCall ? NURSE_CALL_VIDEO_URL : undefined,
                showTutorialVideo: tutorial.shouldShow,
                tutorialVideoType: tutorial.type || undefined,
                tutorialVideoUrl: tutorial.videoUrl,
                tutorialVideoAltUrl: tutorial.altVideoUrl,
                tutorialVideoTitle: tutorial.title,
              };
              this.lastInputMessage = msg;
              this.callbacks.onTranscript?.(msg);
            }

            // Watchdog fallback auto-translation in case Gemini Live output audio stream is delayed
            if (this.translationFallbackTimer) {
              clearTimeout(this.translationFallbackTimer);
            }
            const targetMsg = this.lastInputMessage;
            this.translationFallbackTimer = setTimeout(async () => {
              if (targetMsg && !targetMsg.translatedText && targetMsg.originalText.length > 2) {
                try {
                  const res = await fetch('/api/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      text: targetMsg.originalText,
                      targetLanguage: this.activeTargetLanguage?.name || 'English',
                      speaker: targetMsg.speaker,
                    }),
                  });
                  if (res.ok) {
                    const transData = await res.json();
                    if (transData.translatedText && !targetMsg.translatedText) {
                      const outDosages = extractMedicalDosages(transData.translatedText);
                      const tutorial = detectMedicalTutorialVideo(targetMsg.originalText, transData.translatedText);
                      const isNurseCall =
                        targetMsg.showNurseCallTutorial ||
                        transData.showNurseCallTutorial ||
                        tutorial.type === 'nurse_call';
                      const showTutorial =
                        targetMsg.showTutorialVideo ||
                        transData.showTutorialVideo ||
                        tutorial.shouldShow;
                      const tutorialType =
                        transData.tutorialVideoType ||
                        tutorial.type ||
                        targetMsg.tutorialVideoType;
                      const videoUrl =
                        transData.tutorialVideoUrl ||
                        tutorial.videoUrl ||
                        targetMsg.tutorialVideoUrl;

                      const finalized: TranscriptMessage = {
                        ...targetMsg,
                        translatedText: transData.translatedText,
                        speaker: transData.speaker || targetMsg.speaker,
                        showNurseCallTutorial: isNurseCall,
                        nurseCallTutorialVideoUrl: isNurseCall ? NURSE_CALL_VIDEO_URL : undefined,
                        showTutorialVideo: showTutorial,
                        tutorialVideoType: tutorialType || undefined,
                        tutorialVideoUrl: videoUrl,
                        tutorialVideoAltUrl: tutorial.altVideoUrl || targetMsg.tutorialVideoAltUrl,
                        tutorialVideoTitle: tutorial.title || targetMsg.tutorialVideoTitle,
                        highlightedDosages: Array.from(
                          new Set([...(targetMsg.highlightedDosages || []), ...outDosages])
                        ),
                      };
                      if (this.lastInputMessage?.id === targetMsg.id) {
                        this.lastInputMessage = finalized;
                      }
                      this.callbacks.onTranscript?.(finalized);

                      // Speak fallback translation aloud ONLY if never spoken before
                      const canSpeak = speechCoordinator.canVocalizeAutomatically(
                        finalized.id,
                        transData.translatedText
                      );
                      if (canSpeak) {
                        speechCoordinator.markVocalized(finalized.id, transData.translatedText);
                        const targetLangCode =
                          finalized.speaker === 'nurse'
                            ? (this.activeTargetLanguage?.code || 'en')
                            : 'tr';
                        this.speakFallback(transData.translatedText, targetLangCode);
                      }
                    }
                  }
                } catch (e) {
                  console.debug('[GeminiLiveProvider] Fallback translate note:', e);
                }
              }
            }, 2400);
          }
        }
        break;

      case 'outputTranscription':
        if (data.text) {
          // Output transcription chunks arrive as stream deltas during spoken delivery
          if (this.translationFallbackTimer) {
            clearTimeout(this.translationFallbackTimer);
            this.translationFallbackTimer = null;
          }

          // Accumulate progressive text deltas cleanly without gluing words together
          const incoming = data.text;
          if (
            this.accumulatedOutputText.length > 0 &&
            !/\s$/.test(this.accumulatedOutputText) &&
            !/[.,!?;:()\[\]\-\/]$/.test(this.accumulatedOutputText) &&
            !/^\s/.test(incoming) &&
            !/^[.,!?;:()\[\]\-\/]/.test(incoming) &&
            /[a-zA-Z0-9çğışöüÇĞİŞÖÜа-яА-Я\u0600-\u06FF]/.test(this.accumulatedOutputText.slice(-1)) &&
            /[a-zA-Z0-9çğışöüÇĞİŞÖÜа-яА-Я\u0600-\u06FF]/.test(incoming.charAt(0))
          ) {
            this.accumulatedOutputText += ' ' + incoming;
          } else {
            this.accumulatedOutputText += incoming;
          }
          const cleanText = normalizeTranscriptText(this.accumulatedOutputText);
          const dosages = extractMedicalDosages(cleanText);
          const entities = extractMedicalEntities(cleanText);

          if (this.lastInputMessage) {
            const tutorial = detectMedicalTutorialVideo(
              this.lastInputMessage.originalText,
              cleanText
            );
            const isNurseCall =
              this.lastInputMessage.showNurseCallTutorial || tutorial.type === 'nurse_call';
            const showTutorial =
              this.lastInputMessage.showTutorialVideo || tutorial.shouldShow;
            const updated: TranscriptMessage = {
              ...this.lastInputMessage,
              translatedText: cleanText,
              showNurseCallTutorial: isNurseCall,
              nurseCallTutorialVideoUrl: isNurseCall ? NURSE_CALL_VIDEO_URL : undefined,
              showTutorialVideo: showTutorial,
              tutorialVideoType: tutorial.type || this.lastInputMessage.tutorialVideoType,
              tutorialVideoUrl: tutorial.videoUrl || this.lastInputMessage.tutorialVideoUrl,
              tutorialVideoAltUrl: tutorial.altVideoUrl || this.lastInputMessage.tutorialVideoAltUrl,
              tutorialVideoTitle: tutorial.title || this.lastInputMessage.tutorialVideoTitle,
              highlightedDosages: Array.from(
                new Set([...(this.lastInputMessage.highlightedDosages || []), ...dosages])
              ),
              highlightedEntities: Array.from(
                new Set([...(this.lastInputMessage.highlightedEntities || []), ...entities])
              ),
            };
            this.lastInputMessage = updated;
            this.callbacks.onTranscript?.(updated);
          } else {
            const outDetection = detectSpeakerByLanguage(cleanText, this.activeTargetLanguage?.code);
            const originSpeaker: 'nurse' | 'patient' = outDetection.isTurkish ? 'patient' : 'nurse';
            const tutorial = detectMedicalTutorialVideo(cleanText);
            const isNurseCall = tutorial.type === 'nurse_call';

            this.callbacks.onTranscript?.({
              id: `out-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              speaker: originSpeaker,
              originalText: originSpeaker === 'nurse' ? '(Türkçe Konuşma)' : `(${this.activeTargetLanguage?.name || 'Yabancı'} Konuşma)`,
              translatedText: cleanText,
              timestamp: Date.now(),
              highlightedDosages: dosages,
              highlightedEntities: entities,
              showNurseCallTutorial: isNurseCall,
              nurseCallTutorialVideoUrl: isNurseCall ? NURSE_CALL_VIDEO_URL : undefined,
              showTutorialVideo: tutorial.shouldShow,
              tutorialVideoType: tutorial.type || undefined,
              tutorialVideoUrl: tutorial.videoUrl,
              tutorialVideoAltUrl: tutorial.altVideoUrl,
              tutorialVideoTitle: tutorial.title,
            });
          }
        }
        break;

      case 'turnComplete':
        // Turn completed: reset accumulated delta text for the next turn
        this.accumulatedOutputText = '';
        if (this.translationFallbackTimer) {
          clearTimeout(this.translationFallbackTimer);
          this.translationFallbackTimer = null;
        }
        this.callbacks.onStateChange?.('listening');
        break;

      case 'error':
        console.warn('[Gemini Live Error]:', data.message);
        this.callbacks.onError?.({
          code: 'LIVE_API_ERROR',
          message: data.message || 'Tercüme bağlantısı kontrol ediliyor.',
          fallbackAvailable: data.fallbackRequired,
        });
        if (this.isSessionActive) {
          this.scheduleReconnect();
        }
        break;
    }
  }

  private speakFallback(text: string, langCode: string) {
    // Priority 1: High-definition neural Gemini TTS with active user-selected voice
    (async () => {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voiceName: this.activeVoiceName,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.audio) {
            this.callbacks.onStateChange?.('speaking');
            await playNormalizedAudioWav(data.audio);
            this.callbacks.onStateChange?.('listening');
            return;
          }
        }
      } catch (ttsErr) {
        console.warn('[GeminiLiveProvider] Backend TTS note:', ttsErr);
      }

      // Priority 2: Browser SpeechSynthesis fallback
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = langCode === 'tr' ? 'tr-TR' : langCode;
        utter.volume = 1.0;
        utter.rate = 1.0;
        utter.onstart = () => this.callbacks.onStateChange?.('speaking');
        utter.onend = () => this.callbacks.onStateChange?.('listening');
        window.speechSynthesis.speak(utter);
      } catch (e) {
        console.warn('Speech synthesis note:', e);
      }
    })();
  }

  public sendAudio(base64Pcm16k: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isLiveReady) {
      this.ws.send(
        JSON.stringify({
          type: 'audio',
          audio: base64Pcm16k,
        })
      );
    } else {
      // Buffer recent audio while connecting or reconnecting
      if (this.pendingOutgoingAudio.length > 25) {
        this.pendingOutgoingAudio.shift();
      }
      this.pendingOutgoingAudio.push(base64Pcm16k);
    }
  }

  public sendText(text: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'text',
          text,
        })
      );
    }
  }

  public setTargetLanguage(language: LanguageOption): void {
    this.activeTargetLanguage = language;
    this.lastInputText = '';
    this.accumulatedOutputText = '';
    this.lastInputMessage = null;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'updateLanguage',
          targetLanguage: language.name,
          targetCountry: language.country,
          voiceName: this.activeVoiceName,
        })
      );
    }
  }

  public setVoice(voiceName: GeminiVoiceName): void {
    this.activeVoiceName = voiceName;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'updateVoice',
          voiceName,
        })
      );
    }
  }

  /** Forget the open turn so a new or restored conversation never receives late updates from the old one. */
  public resetTurnContext(): void {
    if (this.translationFallbackTimer) {
      clearTimeout(this.translationFallbackTimer);
      this.translationFallbackTimer = null;
    }
    this.lastInputText = '';
    this.accumulatedOutputText = '';
    this.lastInputMessage = null;
  }

  public interrupt(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    this.accumulatedOutputText = '';
    this.callbacks.onInterrupted?.();
  }

  public async stopSession(): Promise<void> {
    this.isSessionActive = false;
    this.isLiveReady = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.translationFallbackTimer) {
      clearTimeout(this.translationFallbackTimer);
      this.translationFallbackTimer = null;
    }
    this.lastInputText = '';
    this.accumulatedOutputText = '';
    this.lastInputMessage = null;
    this.pendingOutgoingAudio = [];
    this.closeExistingWs();
    this.callbacks.onStateChange?.('idle');
  }
}

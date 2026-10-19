import type { VoiceTranslationProvider, ProviderCallbacks, LiveTurn } from './types';
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

interface LiveServerPayload {
  type?: string;
  audio?: string;
  text?: string;
  speaker?: 'nurse' | 'patient';
  message?: string;
  fallbackRequired?: boolean;
  languageCode?: string;
  finished?: boolean;
  [key: string]: unknown;
}

// Transcript words arriving this soon after the interpreter started answering are a late tail of the
// same utterance; anything later is a new utterance
const LATE_INPUT_GRACE_MS = 700;
// Upper bound for dropping a late live answer the guard already replaced
const SUPPRESS_MAX_MS = 15000;
// If the live model reports "generation complete" but never "turn complete", close the turn anyway
const TURN_CLOSE_FALLBACK_MS = 2500;

// Scripts that separate words with spaces (Latin incl. Turkish, Cyrillic, Arabic); CJK text must never get spaces
const SPACED_WORD_CHAR = /[A-Za-z0-9\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF]/;

/** Joins streamed text pieces without gluing words together. */
function appendStreamText(existing: string, incoming: string): string {
  if (!existing) return incoming;
  const needsSpace =
    !/\s$/.test(existing) &&
    !/^\s/.test(incoming) &&
    SPACED_WORD_CHAR.test(existing.slice(-1)) &&
    SPACED_WORD_CHAR.test(incoming.charAt(0));
  return needsSpace ? `${existing} ${incoming}` : existing + incoming;
}

export class GeminiLiveProvider implements VoiceTranslationProvider {
  public readonly name = 'Gemini Live (gemini-3.8-live)';
  private ws: WebSocket | null = null;
  private callbacks: ProviderCallbacks = {};
  private activeTargetLanguage: LanguageOption | null = null;
  private activeVoiceName: GeminiVoiceName = 'Zephyr';
  private isSessionActive = false;
  private isLiveReady = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private pendingOutgoingAudio: string[] = [];

  // The utterance currently being heard / answered
  private turn: LiveTurn | null = null;
  // The guard already answered the open turn: drop the live model's late answer until its turn completes
  private suppressLiveAnswerUntil = 0;
  private turnCloseTimer: ReturnType<typeof setTimeout> | null = null;

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
      case 'recalibrated':
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
          if (this.isSuppressingLiveAnswer()) break;
          if (this.turn) {
            if (!this.turn.firstAudioAt) this.turn.firstAudioAt = Date.now();
            speechCoordinator.markVocalized(this.turn.id);
          }
          this.callbacks.onAudio?.(data.audio);
          this.callbacks.onStateChange?.('speaking');
        }
        break;

      case 'interrupted':
        this.callbacks.onInterrupted?.();
        this.callbacks.onStateChange?.('listening');
        break;

      case 'interimTranscription':
        if (data.text) {
          this.callbacks.onInterimTranscript?.(data.text);
          this.callbacks.onStateChange?.('listening');
        }
        break;

      case 'inputTranscription':
        if (data.text) this.handleInputText(data.text, data.languageCode);
        break;

      case 'outputTranscription':
        if (data.text) this.handleOutputText(data.text);
        break;

      case 'generationComplete':
        if (this.isSuppressingLiveAnswer()) break;
        if (this.turnCloseTimer) clearTimeout(this.turnCloseTimer);
        this.turnCloseTimer = setTimeout(() => this.closeTurn(), TURN_CLOSE_FALLBACK_MS);
        break;

      case 'turnComplete':
        if (this.isSuppressingLiveAnswer()) {
          // This completes the replaced late answer. A turn opened meanwhile keeps waiting for its own answer
          // (if the live model never gives one, the guard answers it as well)
          this.suppressLiveAnswerUntil = 0;
          if (this.turn && !this.turn.firstAudioAt && !this.turn.translation) {
            this.callbacks.onStateChange?.('listening');
            break;
          }
        }
        this.closeTurn();
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

  /** Speaker comes from the whole utterance, never from a single streamed fragment. */
  private resolveSpeaker(text: string, languageCode?: string): 'nurse' | 'patient' {
    const target = this.activeTargetLanguage?.code?.toLowerCase();
    const lc = languageCode?.toLowerCase();
    if (lc) {
      if (lc.startsWith('tr')) return 'nurse';
      if (target && target !== 'tr' && lc.startsWith(target)) return 'patient';
    }
    return detectSpeakerByLanguage(text, this.activeTargetLanguage?.code).speaker;
  }

  private buildMessage(turn: LiveTurn, languageCode?: string): TranscriptMessage {
    const original = normalizeTranscriptText(turn.sourceText, languageCode);
    const translated = turn.translation ? normalizeTranscriptText(turn.translation) : undefined;
    const tutorial = detectMedicalTutorialVideo(original, translated);
    const isNurseCall = tutorial.type === 'nurse_call';
    return {
      ...turn.message,
      speaker: turn.speaker,
      originalText: original,
      translatedText: translated,
      language: languageCode || turn.message.language || (turn.speaker === 'nurse' ? 'tr' : this.activeTargetLanguage?.code),
      highlightedDosages: Array.from(
        new Set([...extractMedicalDosages(original), ...(translated ? extractMedicalDosages(translated) : [])])
      ),
      highlightedEntities: extractMedicalEntities(`${original} ${translated || ''}`),
      showNurseCallTutorial: isNurseCall,
      nurseCallTutorialVideoUrl: isNurseCall ? NURSE_CALL_VIDEO_URL : undefined,
      showTutorialVideo: tutorial.shouldShow,
      tutorialVideoType: tutorial.type || undefined,
      tutorialVideoUrl: tutorial.videoUrl,
      tutorialVideoAltUrl: tutorial.altVideoUrl,
      tutorialVideoTitle: tutorial.title,
    };
  }

  private publish(turn: LiveTurn, languageCode?: string) {
    turn.message = this.buildMessage(turn, languageCode);
    this.callbacks.onTranscript?.(turn.message);
    this.callbacks.onTurnUpdate?.(turn);
  }

  private openTurn(now: number, speaker: 'nurse' | 'patient', sourceText: string, translation = ''): LiveTurn {
    const id = `in-${now}-${Math.random().toString(36).substring(2, 7)}`;
    this.turn = {
      id,
      speaker,
      sourceText,
      translation,
      startedAt: now,
      lastInputAt: now,
      firstAudioAt: null,
      closedAt: null,
      message: { id, speaker, originalText: sourceText, timestamp: now },
    };
    return this.turn;
  }

  private handleInputText(rawText: string, languageCode?: string) {
    const text = rawText.trim();
    // Filter out tiny phantom acoustic clicks
    if (text.length < 2) return;

    const now = Date.now();
    const current = this.turn;
    const answerStartedLongAgo =
      current?.firstAudioAt != null && now - current.firstAudioAt > LATE_INPUT_GRACE_MS;

    if (!current || current.closedAt || answerStartedLongAgo) {
      // A new utterance. If the previous one never got its "turn complete", close it now.
      if (current && !current.closedAt) this.closeTurn();
      const turn = this.openTurn(now, this.resolveSpeaker(text, languageCode), text);
      this.publish(turn, languageCode);
      return;
    }

    current.sourceText = mergeUtteranceClauses(current.sourceText, text);
    current.lastInputAt = now;
    current.speaker = this.resolveSpeaker(current.sourceText, languageCode);
    this.publish(current, languageCode);
  }

  private isSuppressingLiveAnswer(): boolean {
    return Date.now() < this.suppressLiveAnswerUntil;
  }

  private handleOutputText(incoming: string) {
    if (this.isSuppressingLiveAnswer()) return;
    let turn = this.turn;

    if (!turn || turn.closedAt) {
      // The interpreter spoke without a transcript of what it heard: keep the translation anyway
      const outTurkish = detectSpeakerByLanguage(incoming, this.activeTargetLanguage?.code).isTurkish;
      const speaker: 'nurse' | 'patient' = outTurkish ? 'patient' : 'nurse';
      turn = this.openTurn(
        Date.now(),
        speaker,
        speaker === 'nurse' ? '(Türkçe konuşma)' : `(${this.activeTargetLanguage?.nameTr || 'Yabancı dilde'} konuşma)`
      );
    }

    turn.translation = appendStreamText(turn.translation, incoming);
    this.publish(turn);
  }

  private closeTurn() {
    if (this.turnCloseTimer) {
      clearTimeout(this.turnCloseTimer);
      this.turnCloseTimer = null;
    }
    const turn = this.turn;
    if (!turn || turn.closedAt) return;
    turn.closedAt = Date.now();
    this.callbacks.onTurnClosed?.(turn);
  }

  /**
   * The guard answered the still-open turn itself. Close it (new speech starts a new turn) and drop the
   * live model's late answer to it, so the listener never hears the same sentence twice.
   */
  public suppressTurnAudio(turnId: string): void {
    const turn = this.turn;
    if (!turn || turn.id !== turnId || turn.closedAt) return;
    this.suppressLiveAnswerUntil = Date.now() + SUPPRESS_MAX_MS;
    this.closeTurn();
  }

  public recalibrate(reason: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'recalibrate', reason }));
    }
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
    this.dropTurn();
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
    this.dropTurn();
  }

  /** Forget the open turn without reporting it (language switch, new conversation, stop). */
  private dropTurn() {
    if (this.turnCloseTimer) {
      clearTimeout(this.turnCloseTimer);
      this.turnCloseTimer = null;
    }
    this.turn = null;
    this.suppressLiveAnswerUntil = 0;
  }

  public interrupt(): void {
    this.callbacks.onInterrupted?.();
  }

  public async stopSession(): Promise<void> {
    this.isSessionActive = false;
    this.isLiveReady = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.dropTurn();
    this.pendingOutgoingAudio = [];
    this.closeExistingWs();
    this.callbacks.onStateChange?.('idle');
  }
}

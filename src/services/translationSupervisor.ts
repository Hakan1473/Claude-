import type { LanguageOption, TranscriptMessage, SessionState } from '../types/interpreter';
import { extractMedicalDosages } from './languageCatalog';
import { playNormalizedAudioWav } from './audio/pcmHelper';
import { speechCoordinator } from './audio/speechCoordinator';
import {
  detectMedicalTutorialVideo,
  NURSE_CALL_VIDEO_URL,
  TRIFLOW_VIDEO_URL,
} from '../utils/medicalTutorialDetection';
import type { InterpreterSession } from './interpreterSession';

export interface SupervisorCallbacks {
  onUpdateMessage: (updated: TranscriptMessage) => void;
  onPlayAudio?: (text: string, langCode: string) => void;
}

interface MonitoredTurn {
  id: string;
  originalText: string;
  speaker: 'nurse' | 'patient';
  targetLanguageName: string;
  targetLanguageCode: string;
  registeredAt: number;
  attempts: number;
  isSupervising: boolean;
  isVerified: boolean;
  hasAudioPlayed: boolean;
}

/**
 * Background Translation Supervisor (Otomatik Tercüme ve Sistem Denetleyicisi)
 * 
 * Silently audits the entire translation pipeline across start/stop/restart cycles.
 * 
 * Key Responsibilities:
 * 1. Health Watchdog: Monitors active session status and verifies audio graph continuity
 *    during repeated start/stop actions (5-10+ cycles).
 * 2. Instant Translation Healing: If Gemini Live or websocket drops or delays an utterance
 *    (e.g. after multiple reconnects), the supervisor catches the untranslated sentence within
 *    2.8s, invokes rapid AI translation with orthographic precision, updates the UI and plays audio.
 * 3. Lifecycle Synchronization: Cleans transient echo caches on session restarts so repeated
 *    clinical queries are promptly translated and spoken.
 */
export class TranslationSupervisor {
  private monitoredTurns = new Map<string, MonitoredTurn>();
  private playedAudioIds = new Set<string>();
  private auditInterval: ReturnType<typeof setInterval> | null = null;
  private isDestroyed = false;
  private callbacks: SupervisorCallbacks;
  private currentTargetLanguage: LanguageOption;
  private activeVoiceName: string = 'Zephyr';
  private session: InterpreterSession | null = null;
  private currentSessionState: SessionState = 'idle';

  constructor(
    callbacks: SupervisorCallbacks,
    initialLanguage: LanguageOption,
    initialVoice: string = 'Zephyr'
  ) {
    this.callbacks = callbacks;
    this.currentTargetLanguage = initialLanguage;
    this.activeVoiceName = initialVoice;
    this.startSupervisorLoop();
  }

  public attachSession(session: InterpreterSession | null) {
    this.session = session;
  }

  public notifySessionState(state: SessionState) {
    this.currentSessionState = state;

    if (state === 'listening' || state === 'ready') {
      // Clear transient echo suppression when starting/restarting
      // so repeated questions after a break are immediately accepted and spoken
      speechCoordinator.clearTransientHistory();
    } else if (state === 'idle') {
      // Do not play delayed automated speech while system is paused
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
    }
  }

  public updateTargetLanguage(lang: LanguageOption) {
    this.currentTargetLanguage = lang;
  }

  public updateVoice(voiceName: string) {
    this.activeVoiceName = voiceName;
  }

  /**
   * Ingests messages from the conversation and registers any unverified turns.
   */
  public inspectMessages(messages: TranscriptMessage[]) {
    if (this.isDestroyed || !messages || messages.length === 0) return;

    for (const msg of messages) {
      if (msg.speaker !== 'nurse' && msg.speaker !== 'patient') continue;
      if (!msg.originalText || msg.originalText.trim().length < 2) continue;

      const transText = msg.translatedText?.trim() || '';
      const hasValidTranslation = transText.length > 0;

      // Check if translation is an untranslated echo (e.g. Nurse Turkish -> translated text is also identical Turkish)
      const isEchoUntranslated =
        hasValidTranslation &&
        msg.speaker === 'nurse' &&
        this.currentTargetLanguage.code !== 'tr' &&
        transText.toLowerCase() === msg.originalText.trim().toLowerCase();

      const existing = this.monitoredTurns.get(msg.id);

      if (hasValidTranslation && !isEchoUntranslated) {
        // Record confirmed translation into coordinator
        speechCoordinator.recordTranslation(msg.originalText, transText);
        if (existing) {
          existing.isVerified = true;
          existing.isSupervising = false;
        }
        continue;
      }

      // Needs audit supervision
      if (!existing) {
        this.monitoredTurns.set(msg.id, {
          id: msg.id,
          originalText: msg.originalText.trim(),
          speaker: msg.speaker,
          targetLanguageName: this.currentTargetLanguage.nameTr,
          targetLanguageCode: this.currentTargetLanguage.code,
          registeredAt: Date.now(),
          attempts: 0,
          isSupervising: false,
          isVerified: false,
          hasAudioPlayed: this.playedAudioIds.has(msg.id),
        });
      }
    }
  }

  /**
   * Main background audit interval (checks every 500ms).
   */
  private startSupervisorLoop() {
    if (this.auditInterval) clearInterval(this.auditInterval);

    this.auditInterval = setInterval(() => {
      this.executeAuditCycle();
    }, 500);
  }

  private async executeAuditCycle() {
    if (this.isDestroyed) return;

    // Periodically revive audio graph if session is supposed to be listening
    if (this.currentSessionState === 'listening' && this.session) {
      this.session.checkAndReviveAudioGraph().catch(() => {});
    }

    const now = Date.now();
    // 2800ms gives Gemini Live ample time to naturally interpret, and triggers fallback quickly
    // if live websocket connection dropped or lagged after a restart
    const GRACE_PERIOD_MS = 2800;
    const MAX_ATTEMPTS = 2;

    for (const turn of Array.from(this.monitoredTurns.values())) {
      if (turn.isVerified) continue;
      if (turn.isSupervising) continue;
      if (turn.attempts >= MAX_ATTEMPTS) continue;

      const elapsed = now - turn.registeredAt;
      if (elapsed < GRACE_PERIOD_MS) continue;

      // Check if an authoritative translation is already cached
      const cached = speechCoordinator.getExistingTranslation(turn.originalText);
      if (cached) {
        turn.isVerified = true;
        this.callbacks.onUpdateMessage({
          id: turn.id,
          speaker: turn.speaker,
          originalText: turn.originalText,
          translatedText: cached,
          timestamp: Date.now(),
        });
        continue;
      }

      // Sentence has stalled without translation! Supervisor intervenes immediately.
      turn.isSupervising = true;
      turn.attempts += 1;

      this.healUntranslatedTurn(turn).finally(() => {
        turn.isSupervising = false;
      });
    }
  }

  private async healUntranslatedTurn(turn: MonitoredTurn): Promise<void> {
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: turn.originalText,
          targetLanguage: turn.targetLanguageName,
          speaker: turn.speaker,
        }),
      });

      if (!res.ok) {
        return;
      }

      const transData = await res.json();
      const translatedText = transData.translatedText?.trim();

      if (!translatedText) {
        return;
      }

      speechCoordinator.recordTranslation(turn.originalText, translatedText);

      // Detect medical devices / tutorial videos
      const tutorial = detectMedicalTutorialVideo(turn.originalText, translatedText);
      const isNurseCall =
        transData.showNurseCallTutorial || tutorial.type === 'nurse_call';
      const showTutorial =
        transData.showTutorialVideo || tutorial.shouldShow;
      const tutorialType =
        transData.tutorialVideoType || tutorial.type;
      const videoUrl =
        tutorialType === 'triflow'
          ? TRIFLOW_VIDEO_URL
          : tutorialType === 'nurse_call'
            ? NURSE_CALL_VIDEO_URL
            : transData.tutorialVideoUrl || tutorial.videoUrl;

      const baseDosages = extractMedicalDosages(turn.originalText);
      const translatedDosages = extractMedicalDosages(translatedText);

      const healedMessage: TranscriptMessage = {
        id: turn.id,
        speaker: turn.speaker,
        originalText: turn.originalText,
        translatedText,
        timestamp: Date.now(),
        highlightedDosages: Array.from(new Set([...baseDosages, ...translatedDosages])),
        showNurseCallTutorial: isNurseCall,
        nurseCallTutorialVideoUrl: isNurseCall ? NURSE_CALL_VIDEO_URL : undefined,
        showTutorialVideo: showTutorial,
        tutorialVideoType: tutorialType || undefined,
        tutorialVideoUrl: videoUrl,
        tutorialVideoAltUrl: tutorial.altVideoUrl,
        tutorialVideoTitle: tutorial.title,
      };

      turn.isVerified = true;
      turn.isSupervising = false;

      // Update transcript UI seamlessly
      this.callbacks.onUpdateMessage(healedMessage);

      // Trigger speech audio playback ONLY if session is active and never spoken before
      const isSessionActive = this.currentSessionState !== 'idle' && this.currentSessionState !== 'error';
      const canSpeak =
        isSessionActive &&
        !turn.hasAudioPlayed &&
        !this.playedAudioIds.has(turn.id) &&
        speechCoordinator.canVocalizeAutomatically(turn.id, translatedText);

      if (canSpeak) {
        this.playedAudioIds.add(turn.id);
        turn.hasAudioPlayed = true;
        speechCoordinator.markVocalized(turn.id, translatedText);

        const langToSpeak =
          turn.speaker === 'nurse' ? turn.targetLanguageCode : 'tr';

        if (this.callbacks.onPlayAudio) {
          this.callbacks.onPlayAudio(translatedText, langToSpeak);
        } else {
          this.playAudioDirect(translatedText, langToSpeak);
        }
      }
    } catch {
      // Quiet background retry on next cycle
    }
  }

  /**
   * Fast background speech synthesis playback fallback.
   */
  private async playAudioDirect(text: string, languageCode: string) {
    try {
      const ttsRes = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          languageCode,
          voiceName: this.activeVoiceName,
        }),
      });

      if (ttsRes.ok) {
        const { audio } = await ttsRes.json();
        if (audio) {
          await playNormalizedAudioWav(audio);
        }
      }
    } catch {
      // Speech note
    }
  }

  public recordAudioPlayed(msgId: string) {
    this.playedAudioIds.add(msgId);
    const turn = this.monitoredTurns.get(msgId);
    if (turn) {
      turn.hasAudioPlayed = true;
    }
  }

  public clear() {
    this.monitoredTurns.clear();
    this.playedAudioIds.clear();
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.auditInterval) {
      clearInterval(this.auditInterval);
      this.auditInterval = null;
    }
    this.clear();
  }
}

import type { LanguageOption, TranscriptMessage } from '../types/interpreter';
import type { LiveTurn } from './providers/types';
import { detectSpeakerByLanguage } from '../utils/speakerDetection';

/**
 * Translation Guard (Çeviri Denetçisi)
 *
 * Watches every utterance the live interpreter handles and makes sure the listener heard a complete,
 * correct translation:
 * 1. Missing translation: if the live model stays silent after someone finished speaking, the guard
 *    translates the sentence itself, speaks it, and drops any late live answer so nothing is said twice.
 * 2. Wrong translation: when a turn ends, the source and the spoken translation are checked by a second
 *    model. A critical problem (wrong language, answered instead of translated, missing part, wrong
 *    number or meaning) is corrected on screen and the correction is spoken to the listener.
 * 3. Drift: repeated critical problems, or the model answering instead of translating, restart the live
 *    session with fresh context so one bad session cannot keep producing bad translations.
 */

export interface GuardHooks {
  /** Show an updated message in the conversation. */
  emitMessage: (msg: TranscriptMessage) => void;
  /** Speak text to the listener once nobody is talking. */
  speak: (text: string, languageCode: string) => Promise<void>;
  /** Drop late live audio for a turn the guard already answered. */
  suppressLiveAudio: (turnId: string) => void;
  /** Start a fresh live session. */
  recalibrate: (reason: string) => void;
  getTargetLanguage: () => LanguageOption | null;
}

interface VerifyResponse {
  checked: boolean;
  severity?: 'none' | 'minor' | 'critical';
  issueTypes?: string[];
  issuesTr?: string[];
  correctedTranslation?: string;
  correctionLead?: string;
}

// Time after the last heard word before a silent interpreter counts as "no answer"
const NO_ANSWER_AFTER_MS = 4000;
// Restart the live session when this many of the recent turns had critical problems
const DRIFT_WINDOW = 4;
const DRIFT_CRITICAL_COUNT = 2;
const RECALIBRATE_COOLDOWN_MS = 60_000;
// Problems that mean the live model stopped behaving like an interpreter
const BEHAVIOUR_ISSUES = new Set(['wrong_language', 'not_a_translation']);

export class TranslationGuard {
  private openTurns = new Map<string, LiveTurn>();
  private healedTurnIds = new Set<string>();
  private recentCritical: boolean[] = [];
  private lastRecalibrationAt = 0;
  private generation = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private hooks: GuardHooks) {}

  public start() {
    this.reset();
    this.running = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.checkSilentTurns(), 400);
  }

  public stop() {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.reset();
  }

  /** Forget everything in flight; answers to old requests are ignored. */
  public reset() {
    this.generation++;
    this.openTurns.clear();
    this.healedTurnIds.clear();
    this.recentCritical = [];
  }

  public onTurnUpdate(turn: LiveTurn) {
    if (!this.running) return;
    if (!turn.closedAt && !this.healedTurnIds.has(turn.id)) {
      this.openTurns.set(turn.id, turn);
    }
  }

  public onTurnClosed(turn: LiveTurn) {
    if (!this.running) return;
    this.openTurns.delete(turn.id);
    if (this.healedTurnIds.has(turn.id)) return;
    if (isPlaceholder(turn.sourceText)) return;

    if (!turn.translation.trim()) {
      void this.heal(turn);
      return;
    }
    void this.verify(turn);
  }

  /** Turns where the speaker finished but the live interpreter never answered. */
  private checkSilentTurns() {
    const now = Date.now();
    for (const turn of Array.from(this.openTurns.values())) {
      if (turn.closedAt || turn.firstAudioAt || turn.translation.trim()) {
        this.openTurns.delete(turn.id);
        continue;
      }
      if (now - turn.lastInputAt >= NO_ANSWER_AFTER_MS) {
        this.openTurns.delete(turn.id);
        void this.heal(turn);
      }
    }
  }

  private listenerLanguageCode(turn: LiveTurn): string {
    return turn.speaker === 'nurse' ? this.hooks.getTargetLanguage()?.code || 'en' : 'tr';
  }

  /** Translate the sentence here and speak it (the live interpreter was silent or unusable). */
  private async heal(
    turn: LiveTurn,
    note = 'Canlı tercüman yanıt vermedi; çeviri denetçi tarafından yapıldı.'
  ) {
    const target = this.hooks.getTargetLanguage();
    if (!target || turn.sourceText.trim().length < 2) return;
    const gen = this.generation;
    this.healedTurnIds.add(turn.id);
    this.hooks.suppressLiveAudio(turn.id);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: turn.sourceText, targetLanguage: target.name, speaker: turn.speaker }),
      });
      if (!res.ok || gen !== this.generation) return;
      const data = await res.json();
      const translated: string = data.translatedText?.trim() || '';
      if (!translated) return;

      this.hooks.emitMessage({
        ...turn.message,
        translatedText: translated,
        verification: 'healed',
        verificationNote: note,
      });
      await this.hooks.speak(translated, this.listenerLanguageCode(turn));
    } catch (err) {
      console.warn('[TranslationGuard] Heal failed:', err);
    }
  }

  /** Check a finished translation; correct it and speak the correction if it was wrong. */
  private async verify(turn: LiveTurn) {
    const target = this.hooks.getTargetLanguage();
    if (!target) return;
    const gen = this.generation;

    // Fast local check: a translation in the speaker's own language is always wrong
    const outputIsTurkish = detectSpeakerByLanguage(turn.translation, target.code);
    const wrongDirection =
      target.code !== 'tr' &&
      outputIsTurkish.confidence >= 0.85 &&
      outputIsTurkish.isTurkish === (turn.speaker === 'nurse');

    this.hooks.emitMessage({ ...turn.message, verification: 'checking' });

    let verdict: VerifyResponse | null = null;
    try {
      const res = await fetch('/api/verify-translation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: turn.sourceText,
          translation: turn.translation,
          targetLanguage: target.name,
          speaker: turn.speaker,
        }),
      });
      if (res.ok) verdict = await res.json();
    } catch (err) {
      console.warn('[TranslationGuard] Verify failed:', err);
    }
    if (gen !== this.generation) return;

    if (!verdict?.checked) {
      if (wrongDirection) {
        // The checker is unavailable but the translation is plainly in the wrong language: redo it
        this.noteCritical(['wrong_language']);
        void this.heal(turn, 'Çeviri yanlış dilde yapılmıştı; denetçi yeniden çevirdi.');
        return;
      }
      // Could not check: show no badge rather than claiming the translation was verified
      this.hooks.emitMessage({ ...turn.message, verification: undefined });
      return;
    }

    if (verdict.severity !== 'critical' || !verdict.correctedTranslation) {
      this.noteResult(false);
      this.hooks.emitMessage({ ...turn.message, verification: 'verified' });
      return;
    }

    const corrected = verdict.correctedTranslation;
    const note = verdict.issuesTr?.filter(Boolean).join(' · ') || 'Çeviri düzeltildi.';
    this.hooks.emitMessage({
      ...turn.message,
      translatedText: corrected,
      verification: 'corrected',
      verificationNote: note,
    });
    this.noteCritical(verdict.issueTypes || []);

    const lead = verdict.correctionLead?.trim();
    await this.hooks.speak(lead ? `${lead} ${corrected}` : corrected, this.listenerLanguageCode(turn));
  }

  private noteResult(critical: boolean) {
    this.recentCritical.push(critical);
    if (this.recentCritical.length > DRIFT_WINDOW) this.recentCritical.shift();
  }

  private noteCritical(issueTypes: string[]) {
    this.noteResult(true);
    const behaviourProblem = issueTypes.some((t) => BEHAVIOUR_ISSUES.has(t));
    const repeated = this.recentCritical.filter(Boolean).length >= DRIFT_CRITICAL_COUNT;
    if (!behaviourProblem && !repeated) return;

    const now = Date.now();
    if (now - this.lastRecalibrationAt < RECALIBRATE_COOLDOWN_MS) return;
    this.lastRecalibrationAt = now;
    this.recentCritical = [];
    this.hooks.recalibrate(behaviourProblem ? `behaviour:${issueTypes.join(',')}` : 'repeated critical errors');
  }
}

function isPlaceholder(text: string): boolean {
  return /^\(.*konuşma\)$/i.test(text.trim());
}

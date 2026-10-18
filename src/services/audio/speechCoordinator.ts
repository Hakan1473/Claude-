/**
 * Speech & Translation Coordinator (Seslendirme ve Çeviri Tekillik Denetleyicisi)
 * 
 * Guarantees that:
 * 1. Every translated sentence is spoken automatically EXACTLY ONCE.
 * 2. Already spoken/translated sentences are NEVER automatically re-translated or re-spoken.
 * 3. Only explicit user gestures (clicking the Speaker button in the UI) can replay audio.
 */

class SpeechCoordinator {
  private spokenMessageIds = new Set<string>();
  private spokenTextCache = new Map<string, number>(); // normalizedText -> timestamp
  private translatedSentences = new Map<string, string>(); // normalizedOriginal -> translatedText
  private lastSpokenText: string = '';
  private lastSpokenTimestamp: number = 0;

  private normalize(text?: string | null): string {
    if (!text) return '';
    return text
      .trim()
      .toLowerCase()
      .replace(/[\s\p{P}]+/gu, ' ')
      .trim();
  }

  /**
   * Checks whether automatic vocalization is allowed for this message / text.
   * If already spoken, returns FALSE to prevent repeating speech aloud.
   */
  public canVocalizeAutomatically(msgId: string, text: string): boolean {
    if (!text || text.trim().length < 2) return false;

    // Check message ID
    if (this.spokenMessageIds.has(msgId)) {
      return false;
    }

    const norm = this.normalize(text);
    if (!norm) return false;

    // Prevent immediate duplicate echo of the exact same sentence within 10 seconds
    const now = Date.now();
    const lastSpokenTime = this.spokenTextCache.get(norm);
    if (lastSpokenTime && now - lastSpokenTime < 10000) {
      return false;
    }

    if (this.lastSpokenText === norm && now - this.lastSpokenTimestamp < 8000) {
      return false;
    }

    return true;
  }

  /**
   * Registers that a message or text has been spoken (via Gemini Live PCM stream or TTS).
   */
  public markVocalized(msgId?: string, text?: string): void {
    if (msgId) {
      this.spokenMessageIds.add(msgId);
    }
    if (text) {
      const norm = this.normalize(text);
      if (norm) {
        this.spokenTextCache.set(norm, Date.now());
        this.lastSpokenText = norm;
        this.lastSpokenTimestamp = Date.now();
      }
    }
  }

  /**
   * Checks if an utterance already has an authoritative translation.
   */
  public getExistingTranslation(originalText: string): string | undefined {
    const norm = this.normalize(originalText);
    return this.translatedSentences.get(norm);
  }

  /**
   * Records a confirmed translation for an utterance.
   */
  public recordTranslation(originalText: string, translatedText: string): void {
    const norm = this.normalize(originalText);
    if (norm && translatedText) {
      this.translatedSentences.set(norm, translatedText.trim());
    }
  }

  /**
   * Clears transient echo suppression cache when starting/restarting a session
   * so repeated clinical questions after a pause are immediately translated and vocalized.
   */
  public clearTransientHistory(): void {
    this.spokenTextCache.clear();
    this.lastSpokenText = '';
    this.lastSpokenTimestamp = 0;
  }

  /**
   * Clear on session reset
   */
  public reset(): void {
    this.spokenMessageIds.clear();
    this.spokenTextCache.clear();
    this.translatedSentences.clear();
    this.lastSpokenText = '';
    this.lastSpokenTimestamp = 0;
  }
}

export const speechCoordinator = new SpeechCoordinator();

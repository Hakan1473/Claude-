import type { ConversationHistoryItem, TranscriptMessage, LanguageOption, ConversationSummary } from '../types/interpreter';

const STORAGE_KEY_HISTORY = 'interpreter_conversation_history';
const MAX_HISTORY_ITEMS = 50;

/**
 * Retrieves all stored conversation history items, sorted newest to oldest.
 */
export function getConversationHistory(): ConversationHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (e) {
    console.warn('Failed to read conversation history from localStorage:', e);
    return [];
  }
}

/**
 * Saves or updates a conversation history item.
 */
export function saveConversationToHistory(item: ConversationHistoryItem): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getConversationHistory();
    const existingIdx = existing.findIndex((c) => c.id === item.id);
    let updated: ConversationHistoryItem[];

    if (existingIdx >= 0) {
      updated = [...existing];
      updated[existingIdx] = item;
    } else {
      updated = [item, ...existing];
    }

    // Keep within reasonable storage bounds
    if (updated.length > MAX_HISTORY_ITEMS) {
      updated = updated.slice(0, MAX_HISTORY_ITEMS);
    }

    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save conversation to history:', e);
  }
}

/**
 * Archives an active conversation into history if it contains meaningful dialogue.
 */
export function archiveCurrentConversation(
  messages: TranscriptMessage[],
  targetLanguage: LanguageOption,
  summary?: ConversationSummary | null,
  existingId?: string
): ConversationHistoryItem | null {
  const dialogueMessages = messages.filter((m) => m.speaker === 'nurse' || m.speaker === 'patient');
  if (dialogueMessages.length === 0) {
    return null;
  }

  // Create preview snippet from first 2 messages
  const preview = dialogueMessages
    .slice(0, 2)
    .map((m) => `${m.speaker === 'nurse' ? 'Hemşire' : 'Hasta'}: ${m.originalText}`)
    .join(' | ');

  const startTime = messages[0]?.timestamp || Date.now();
  const endTime = messages[messages.length - 1]?.timestamp || Date.now();
  const durationSeconds = Math.max(1, Math.round((endTime - startTime) / 1000));

  const historyItem: ConversationHistoryItem = {
    id: existingId || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: startTime,
    targetLanguage,
    messages: [...messages],
    summary: summary || null,
    previewText: preview.length > 120 ? `${preview.substring(0, 117)}...` : preview,
    durationSeconds,
  };

  saveConversationToHistory(historyItem);
  return historyItem;
}

/**
 * Deletes a single conversation history item by ID.
 */
export function deleteConversationFromHistory(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getConversationHistory();
    const filtered = existing.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to delete conversation from history:', e);
  }
}

/**
 * Clears all conversation history.
 */
export function clearAllConversationHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_HISTORY);
  } catch (e) {
    console.warn('Failed to clear conversation history:', e);
  }
}

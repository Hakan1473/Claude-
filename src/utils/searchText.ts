/**
 * Accent- and Turkish-casing-insensitive search key.
 * 'İngilizce'.toLowerCase() yields 'i̇ngilizce' (with a combining dot), so plain lowercasing
 * made queries like "ingilizce" or "rusca" miss. This folds case and diacritics.
 */
export function toSearchKey(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

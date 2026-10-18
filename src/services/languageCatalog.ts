import type { LanguageOption } from '../types/interpreter';

export const POPULAR_LANGUAGES: LanguageOption[] = [
  // Most frequent hospital international patient languages (English is 1st default)
  { code: 'en', name: 'English', nameTr: 'İngilizce', country: 'İngiltere / ABD / Uluslararası', flag: '🇬🇧' },
  { code: 'ar', name: 'Arabic', nameTr: 'Arapça', country: 'Suriye / Irak / Suudi Arabistan / BAE', flag: '🇸🇦' },
  { code: 'ru', name: 'Russian', nameTr: 'Rusça', country: 'Rusya / Belarus / Kazakistan', flag: '🇷🇺' },
  { code: 'de', name: 'German', nameTr: 'Almanca', country: 'Almanya / Avusturya / İsviçre', flag: '🇩🇪' },
  { code: 'fr', name: 'French', nameTr: 'Fransızca', country: 'Fransa / Belçika / Kuzey Afrika', flag: '🇫🇷' },
  { code: 'ro', name: 'Romanian', nameTr: 'Romence', country: 'Romanya / Moldova', flag: '🇷🇴' },
  { code: 'zh', name: 'Mandarin Chinese', nameTr: 'Çince (Mandarin)', country: 'Çin / Tayvan', flag: '🇨🇳' },
  { code: 'it', name: 'Italian', nameTr: 'İtalyanca', country: 'İtalya / İsviçre', flag: '🇮🇹' },
  { code: 'es', name: 'Spanish', nameTr: 'İspanyolca', country: 'İspanya / Latin Amerika', flag: '🇪🇸' },
  { code: 'ja', name: 'Japanese', nameTr: 'Japonca', country: 'Japonya', flag: '🇯🇵' },
  { code: 'fa', name: 'Persian', nameTr: 'Farsça', country: 'İran / Tacikistan', flag: '🇮🇷' },
  { code: 'ka', name: 'Georgian', nameTr: 'Gürcüce', country: 'Gürcistan', flag: '🇬🇪' },
  { code: 'az', name: 'Azerbaijani', nameTr: 'Azerice', country: 'Azerbaycan', flag: '🇦🇿' },
  { code: 'uz', name: 'Uzbek', nameTr: 'Özbekçe', country: 'Özbekistan', flag: '🇺🇿' },
  { code: 'tk', name: 'Turkmen', nameTr: 'Türkmence', country: 'Türkmenistan', flag: '🇹🇲' },
  { code: 'kk', name: 'Kazakh', nameTr: 'Kazakça', country: 'Kazakistan', flag: '🇰🇿' },
  { code: 'ky', name: 'Kyrgyz', nameTr: 'Kırgızca', country: 'Kırgızistan', flag: '🇰🇬' },
  { code: 'uk', name: 'Ukrainian', nameTr: 'Ukraynaca', country: 'Ukrayna', flag: '🇺🇦' },
  { code: 'sr', name: 'Serbian / Montenegrin', nameTr: 'Sırpça / Karadağca', country: 'Sırbistan / Karadağ', flag: '🇷🇸' },
  { code: 'bs', name: 'Bosnian', nameTr: 'Boşnakça', country: 'Bosna Hersek', flag: '🇧🇦' },
  { code: 'hr', name: 'Croatian', nameTr: 'Hırvatça', country: 'Hırvatistan', flag: '🇭🇷' },
  { code: 'bg', name: 'Bulgarian', nameTr: 'Bulgarca', country: 'Bulgaristan', flag: '🇧🇬' },
  { code: 'el', name: 'Greek', nameTr: 'Yunanca', country: 'Yunanistan / Kıbrıs', flag: '🇬🇷' },
  { code: 'pl', name: 'Polish', nameTr: 'Lehçe', country: 'Polonya', flag: '🇵🇱' },
  { code: 'nl', name: 'Dutch', nameTr: 'Felemenkçe', country: 'Hollanda / Belçika', flag: '🇳🇱' },
  { code: 'pt', name: 'Portuguese', nameTr: 'Portekizce', country: 'Portekiz / Brezilya', flag: '🇵🇹' },
  { code: 'ko', name: 'Korean', nameTr: 'Korece', country: 'Güney Kore', flag: '🇰🇷' },
  { code: 'hi', name: 'Hindi', nameTr: 'Hintçe', country: 'Hindistan', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', nameTr: 'Urduca', country: 'Pakistan / Hindistan', flag: '🇵🇰' },
  { code: 'bn', name: 'Bengali', nameTr: 'Bengalce', country: 'Bangladeş / Hindistan', flag: '🇧🇩' },
  { code: 'ku', name: 'Kurdish', nameTr: 'Kürtçe (Kurmancî / Soranî)', country: 'Bölgesel / Irak', flag: '☀️' },
  { code: 'sq', name: 'Albanian', nameTr: 'Arnavutça', country: 'Arnavutluk / Kosova', flag: '🇦🇱' },
  { code: 'so', name: 'Somali', nameTr: 'Somalice', country: 'Somali', flag: '🇸🇴' },
  { code: 'ps', name: 'Pashto / Dari', nameTr: 'Peştuca / Darice', country: 'Afganistan', flag: '🇦🇫' },
  { code: 'he', name: 'Hebrew', nameTr: 'İbranice', country: 'İsrail', flag: '🇮🇱' },
  { code: 'sv', name: 'Swedish', nameTr: 'İsveççe', country: 'İsveç', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', nameTr: 'Norveççe', country: 'Norveç', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', nameTr: 'Danimarkaca', country: 'Danimarka', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', nameTr: 'Fince', country: 'Finlandiya', flag: '🇫🇮' },
  { code: 'hu', name: 'Hungarian', nameTr: 'Macarca', country: 'Macaristan', flag: '🇭🇺' },
  { code: 'cs', name: 'Czech', nameTr: 'Çekçe', country: 'Çekya', flag: '🇨🇿' },
  { code: 'sk', name: 'Slovak', nameTr: 'Slovakça', country: 'Slovakya', flag: '🇸🇰' },
  { code: 'sl', name: 'Slovenian', nameTr: 'Slovence', country: 'Slovenya', flag: '🇸🇮' },
  { code: 'mk', name: 'Macedonian', nameTr: 'Makedonca', country: 'Kuzey Makedonya', flag: '🇲🇰' },
  { code: 'id', name: 'Indonesian', nameTr: 'Endonezce', country: 'Endonezya', flag: '🇮🇩' },
  { code: 'ms', name: 'Malay', nameTr: 'Malayca', country: 'Malezya', flag: '🇲🇾' },
  { code: 'th', name: 'Thai', nameTr: 'Tayca', country: 'Tayland', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', nameTr: 'Vietnamca', country: 'Vietnam', flag: '🇻🇳' },
  { code: 'tl', name: 'Filipino / Tagalog', nameTr: 'Filipince (Tagalog)', country: 'Filipinler', flag: '🇵🇭' },
  { code: 'sw', name: 'Swahili', nameTr: 'Svahili', country: 'Tanzanya / Kenya', flag: '🇹🇿' },
  { code: 'hy', name: 'Armenian', nameTr: 'Ermenice', country: 'Ermenistan', flag: '🇦🇲' },
  { code: 'lt', name: 'Lithuanian', nameTr: 'Litvanca', country: 'Litvanya', flag: '🇱🇹' },
  { code: 'lv', name: 'Latvian', nameTr: 'Letonca', country: 'Letonya', flag: '🇱🇻' },
  { code: 'et', name: 'Estonian', nameTr: 'Estonca', country: 'Estonya', flag: '🇪🇪' },
  { code: 'am', name: 'Amharic', nameTr: 'Amharca', country: 'Etiyopya', flag: '🇪🇹' },
  { code: 'mn', name: 'Mongolian', nameTr: 'Moğolca', country: 'Moğolistan', flag: '🇲🇳' },
  { code: 'ne', name: 'Nepali', nameTr: 'Nepalce', country: 'Nepal', flag: '🇳🇵' },
  { code: 'pa', name: 'Punjabi', nameTr: 'Pencapça', country: 'Hindistan / Pakistan', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nameTr: 'Tamilce', country: 'Hindistan / Sri Lanka', flag: '🇱🇰' },
  // Turkish is included at the end of the catalog so it is searchable if ever needed, but never default
  { code: 'tr', name: 'Turkish', nameTr: 'Türkçe', country: 'Türkiye', flag: '🇹🇷' },
];

export const DEFAULT_LANGUAGE: LanguageOption = POPULAR_LANGUAGES[0]; // English (İngilizce)

const STORAGE_KEY_LAST_LANG = 'interpreter_last_target_language';
const STORAGE_KEY_USAGE_COUNTS = 'interpreter_language_usage_counts';

/**
 * Returns the user's last used language, or English if opening for the first time.
 */
export function getInitialTargetLanguage(): LanguageOption {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  try {
    const savedCode = localStorage.getItem(STORAGE_KEY_LAST_LANG);
    if (savedCode && savedCode !== 'tr') {
      const found = POPULAR_LANGUAGES.find((l) => l.code === savedCode);
      if (found) return found;
    }
  } catch {
    // fallback
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Persists the user's chosen language and updates historical usage frequency counts.
 */
export function recordLanguageUsage(code: string): void {
  if (typeof window === 'undefined' || !code || code === 'tr') return;
  try {
    localStorage.setItem(STORAGE_KEY_LAST_LANG, code);
    const raw = localStorage.getItem(STORAGE_KEY_USAGE_COUNTS);
    const counts: Record<string, number> = raw ? JSON.parse(raw) : {};
    counts[code] = (counts[code] || 0) + 1;
    localStorage.setItem(STORAGE_KEY_USAGE_COUNTS, JSON.stringify(counts));
  } catch {
    // ignore
  }
}

/**
 * Returns the user's most frequently and recently used foreign languages for the top quick rail.
 * Excludes Turkish ('tr') because hospital staff already speak Turkish natively.
 */
export function getFrequentlyUsedLanguages(currentCode?: string, limit = 10): LanguageOption[] {
  const candidateLanguages = POPULAR_LANGUAGES.filter((l) => l.code !== 'tr');
  if (typeof window === 'undefined') {
    return candidateLanguages.slice(0, limit);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_USAGE_COUNTS);
    const counts: Record<string, number> = raw ? JSON.parse(raw) : {};
    const effectiveActiveCode = currentCode || localStorage.getItem(STORAGE_KEY_LAST_LANG) || 'en';

    // 1) Active language
    const activeLang = candidateLanguages.find((l) => l.code === effectiveActiveCode);
    const otherCandidates = candidateLanguages.filter((l) => l.code !== effectiveActiveCode);

    // 2) Sort remaining candidates by usage frequency descending, with English prioritized
    otherCandidates.sort((a, b) => {
      const countA = counts[a.code] || 0;
      const countB = counts[b.code] || 0;
      if (countA !== countB) {
        return countB - countA;
      }
      if (a.code === 'en') return -1;
      if (b.code === 'en') return 1;
      return 0;
    });

    const result: LanguageOption[] = [];
    if (activeLang) {
      result.push(activeLang);
    }
    for (const lang of otherCandidates) {
      if (result.length >= limit) break;
      result.push(lang);
    }

    // Always ensure English is included
    if (!result.some((l) => l.code === 'en')) {
      const enLang = candidateLanguages.find((l) => l.code === 'en') || DEFAULT_LANGUAGE;
      if (result.length >= limit) {
        result.pop();
      }
      result.push(enLang);
    }

    return result;
  } catch {
    return candidateLanguages.slice(0, limit);
  }
}

// Fast local phrase mapper for common speech patterns: "Çinli hasta", "İtalyan hasta", "Romanyalı", etc.
export function fastDetectLanguage(phrase: string): LanguageOption | null {
  const normalized = phrase.toLowerCase().trim();

  // Rules mapping keywords to language code
  const rules: { keywords: string[]; code: string }[] = [
    { keywords: ['çin', 'çinli', 'mandarin', 'chinese'], code: 'zh' },
    { keywords: ['italyan', 'italyanca', 'italya', 'italian'], code: 'it' },
    { keywords: ['romanya', 'romanyalı', 'romence', 'romanian'], code: 'ro' },
    { keywords: ['moldova', 'moldovalı'], code: 'ro' },
    { keywords: ['alman', 'almanca', 'almanya', 'german'], code: 'de' },
    { keywords: ['ingiliz', 'ingilizce', 'ingiltere', 'english', 'amerikan'], code: 'en' },
    { keywords: ['rus', 'rusça', 'rusya', 'russian'], code: 'ru' },
    { keywords: ['ukrayna', 'ukraynalı', 'ukraynaca', 'ukrainian'], code: 'uk' },
    { keywords: ['arap', 'arapça', 'suriye', 'suriyeli', 'ırak', 'ıraklı', 'arabic', 'bae', 'suudi'], code: 'ar' },
    { keywords: ['fars', 'farsça', 'iran', 'iranlı', 'persian'], code: 'fa' },
    { keywords: ['gürcü', 'gürcüce', 'gürcistan', 'georgian'], code: 'ka' },
    { keywords: ['azerbaycan', 'azeri', 'azerice'], code: 'az' },
    { keywords: ['özbek', 'özbekçe', 'özbekistan', 'uzbek'], code: 'uz' },
    { keywords: ['türkmen', 'türkmence', 'türkmenistan', 'turkmen'], code: 'tk' },
    { keywords: ['kazak', 'kazakça', 'kazakistan', 'kazakh'], code: 'kk' },
    { keywords: ['kırgız', 'kırgızca', 'kırgızistan'], code: 'ky' },
    { keywords: ['karadağ', 'karadağlı', 'montenegro', 'montenegrin'], code: 'sr' },
    { keywords: ['sırp', 'sırpça', 'sırbistan', 'serbian'], code: 'sr' },
    { keywords: ['boşnak', 'boşnakça', 'bosna', 'bosnian'], code: 'bs' },
    { keywords: ['hırvat', 'hırvatça', 'hırvatistan', 'croatian'], code: 'hr' },
    { keywords: ['bulgar', 'bulgarca', 'bulgaristan', 'bulgarian'], code: 'bg' },
    { keywords: ['yunan', 'yunanca', 'yunanistan', 'greek'], code: 'el' },
    { keywords: ['leh', 'lehçe', 'polonya', 'polonyalı', 'polish'], code: 'pl' },
    { keywords: ['felemenk', 'felemenkçe', 'hollanda', 'hollandalı', 'dutch'], code: 'nl' },
    { keywords: ['ispanyol', 'ispanyolca', 'ispanya', 'spanish'], code: 'es' },
    { keywords: ['fransız', 'fransızca', 'fransa', 'french'], code: 'fr' },
    { keywords: ['portekiz', 'portekizce', 'brezilya', 'portuguese'], code: 'pt' },
    { keywords: ['japon', 'japonca', 'japonya', 'japanese'], code: 'ja' },
    { keywords: ['kore', 'koreli', 'korece', 'korean'], code: 'ko' },
    { keywords: ['hint', 'hintçe', 'hindistan', 'hindi'], code: 'hi' },
    { keywords: ['urdu', 'urduca', 'pakistan', 'pakistanlı'], code: 'ur' },
    { keywords: ['bengal', 'bengalce', 'bangladeş'], code: 'bn' },
    { keywords: ['kürt', 'kürtçe', 'kurmanci', 'sorani'], code: 'ku' },
    { keywords: ['arnavut', 'arnavutça', 'arnavutluk', 'albanian', 'kosova'], code: 'sq' },
    { keywords: ['somali', 'somalili', 'somalice'], code: 'so' },
    { keywords: ['afgan', 'afganistan', 'peştu', 'dari'], code: 'ps' },
    { keywords: ['ibrani', 'israil', 'hebrew'], code: 'he' },
    { keywords: ['isveç', 'isveççe', 'swedish'], code: 'sv' },
    { keywords: ['norveç', 'norveççe', 'norwegian'], code: 'no' },
    { keywords: ['danimarka', 'danimarkaca', 'danish'], code: 'da' },
    { keywords: ['fin', 'fince', 'finlandiya', 'finnish'], code: 'fi' },
    { keywords: ['macar', 'macarca', 'macaristan', 'hungarian'], code: 'hu' },
    { keywords: ['çek', 'çekçe', 'çekya', 'czech'], code: 'cs' },
    { keywords: ['slovak', 'slovakça', 'slovakya'], code: 'sk' },
    { keywords: ['sloven', 'slovence', 'slovenya'], code: 'sl' },
    { keywords: ['makedon', 'makedonca'], code: 'mk' },
    { keywords: ['endonezya', 'endonezce', 'indonesian'], code: 'id' },
    { keywords: ['malezya', 'malayca', 'malay'], code: 'ms' },
    { keywords: ['tayland', 'tayca', 'thai'], code: 'th' },
    { keywords: ['vietnam', 'vietnamca'], code: 'vi' },
    { keywords: ['filipin', 'filipince', 'tagalog'], code: 'tl' },
    { keywords: ['svahili', 'swahili', 'kenya', 'tanzanya'], code: 'sw' },
    { keywords: ['ermeni', 'ermenice', 'ermenistan'], code: 'hy' },
    { keywords: ['litvan', 'litvanca', 'litvanya'], code: 'lt' },
    { keywords: ['leton', 'letonca', 'letonya'], code: 'lv' },
    { keywords: ['eston', 'estonca', 'estonya'], code: 'et' },
    { keywords: ['amhar', 'amharca', 'etiyopya'], code: 'am' },
    { keywords: ['moğol', 'moğolca', 'moğolistan'], code: 'mn' },
    { keywords: ['nepal', 'nepalce'], code: 'ne' },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((kw) => normalized.includes(kw))) {
      const match = POPULAR_LANGUAGES.find((lang) => lang.code === rule.code);
      if (match) return match;
    }
  }

  return null;
}

// Regex detector for critical medical data (dosages, vitals, numbers)
// Examples: 5 mg, 500 mg, 38.5 derece, 120/80, 2x1, 10 ml, SpO2 98%
export function extractMedicalDosages(text: string): string[] {
  const matches: string[] = [];
  const regex = /(\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|l|cc|ampul|tablet|kapsül|damla|derece|°c|bpm|nabız|tansiyon|mmhg|%|spo2|adet|saatte|gün|hafta)\b|\b\d{2,3}\s*\/\s*\d{2,3}\b|\b\d+\s*x\s*\d+\b)/gi;

  const found = text.match(regex);
  if (found) {
    for (const item of found) {
      matches.push(item.trim());
    }
  }

  return matches;
}

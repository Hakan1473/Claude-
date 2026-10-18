/**
 * Universal Speaker & Language Detection for Hospital Medical Interpreter
 * 
 * CORE CLINICAL ARCHITECTURE RULES:
 * 1. The Turkish speaker is ALWAYS the healthcare professional / nurse (speaker: 'nurse').
 * 2. The selected target language / foreign language speaker is ALWAYS the patient (speaker: 'patient').
 * 3. The system NEVER flips or guesses randomly (e.g. no lastSpeaker toggle).
 * 4. Speaker assignment is strictly grounded in language identity and verified by Gemini AI.
 */

export interface SpeakerDetectionResult {
  speaker: 'nurse' | 'patient';
  isTurkish: boolean;
  confidence: number;
  detectedLanguage: string;
  reason: string;
}

// 1. Non-Turkish scripts that guarantee the speaker is the international patient
const CYRILLIC_REGEX = /[\u0400-\u04FF]/;
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const EAST_ASIAN_REGEX = /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u31F0-\u31FF]/;
const GREEK_REGEX = /[\u0370-\u03FF]/;
const HEBREW_REGEX = /[\u0590-\u05FF]/;

// Specific characters unique to foreign Latin alphabets (never in Turkish)
const FOREIGN_LATIN_CHARS_REGEX = /[äÄßáàâæéèêëíìîïóòôœúùûÿñ¿¡ăâîșțąćęłńśźżčďěňřšťůž]/i;

// Unique Turkish characters not found in standard English/Western European alphabets
// Note: ç, ğ, ı, ş are extremely strong Turkish indicators. (ç exists in French/Portuguese, but ğ, ı, ş do not).
const TURKISH_EXCLUSIVE_CHARS_REGEX = /[ğğışŞİĞ]/;
const TURKISH_CHARS_REGEX = /[çğıöşüÇĞİÖŞÜ]/i;

// High-frequency Turkish vocabulary (over 180 everyday words, clinic words, particles)
const TURKISH_WORDS: string[] = [
  // Greetings & Courtesies
  'merhaba', 'selam', 'günaydın', 'gunaydin', 'tünaydın', 'iyi', 'günler', 'gunler',
  'akşamlar', 'aksamlar', 'geceler', 'hoş', 'hos', 'geldiniz', 'geçmiş', 'gecmis',
  'olsun', 'lütfen', 'lutfen', 'teşekkür', 'tesekkur', 'teşekkürler', 'tesekkurler',
  'sağol', 'sagol', 'sağolun', 'sagolun', 'rica', 'ederim', 'kolay', 'gelsin',
  'kusura', 'bakmayın', 'bakmayin', 'özür', 'ozur', 'dilerim', 'afedersiniz',

  // Yes / No / Confirmation
  'evet', 'hayır', 'hayir', 'yok', 'var', 'tamam', 'peki', 'tabii', 'tabi',
  'olur', 'olmaz', 'oldu', 'anladım', 'anladim', 'aynen', 'kesinlikle',

  // Pronouns & Demonstratives
  'ben', 'sen', 'o', 'biz', 'siz', 'onlar',
  'benim', 'senin', 'onun', 'bizim', 'sizin', 'onların', 'onlarin',
  'bana', 'sana', 'ona', 'bize', 'size', 'onlara',
  'beni', 'seni', 'onu', 'bizi', 'sizi', 'onları', 'onlari',
  'bende', 'sende', 'onda', 'bizde', 'sizde',
  'benden', 'senden', 'ondan', 'bizden', 'sizden',
  'bu', 'şu', 'su', 'bunlar', 'şunlar', 'sunlar',
  'burada', 'şurada', 'surada', 'orada', 'burası', 'burasi', 'orası', 'orasi',
  'buraya', 'oraya', 'buradan', 'oradan',

  // Questions
  'ne', 'nasıl', 'nasil', 'neden', 'niçin', 'nicin', 'niye',
  'nerede', 'neresi', 'nereden', 'nereye', 'ne zaman', 'nezaman',
  'kim', 'kime', 'kimi', 'kimde', 'kimden', 'hangisi', 'hangi',
  'kaç', 'kac', 'ne kadar', 'nekadar',

  // Conjunctions & Particles
  've', 'ile', 'veya', 'ya da', 'ama', 'fakat', 'lakin', 'ancak',
  'çünkü', 'cunku', 'için', 'icin', 'gibi', 'kadar', 'göre', 'gore',
  'de', 'da', 'te', 'ta', 'ki',
  'mi', 'mı', 'mu', 'mü', 'misin', 'mısın', 'musun', 'müsün',
  'misiniz', 'mısınız', 'musunuz', 'müsünüz', 'muhakkak',

  // Medical & Clinical Body Parts
  'ağrı', 'agri', 'ağrınız', 'agriniz', 'ağrıyor', 'agriyor', 'ağrım', 'agrim',
  'acı', 'aci', 'acıyor', 'aciyor', 'acıyor mu', 'acitiyor', 'sızı', 'sizi',
  'ateş', 'ates', 'ateşiniz', 'atesiniz', 'derece', 'tansiyon', 'tansiyonunuz',
  'nabız', 'nabiz', 'şeker', 'seker', 'nefes', 'soluk', 'solunum',
  'öksürük', 'oksuruk', 'balgam', 'mide', 'bulantı', 'bulanti', 'kusma', 'kusuyor',
  'baş', 'bas', 'başınız', 'basiniz', 'başım', 'basim', 'dönüyor', 'donuyor',
  'kol', 'kolunuz', 'kolum', 'bacak', 'bacağınız', 'bacaginiz', 'bacağım', 'bacagim',
  'ayak', 'ayağınız', 'ayaginiz', 'el', 'eliniz', 'parmak', 'parmağınız',
  'göz', 'goz', 'gözünüz', 'kulak', 'kulağınız', 'burun', 'burnunuz',
  'boğaz', 'bogaz', 'boğazınız', 'göğüs', 'gogus', 'göğsünüz', 'gogsunuz',
  'sırt', 'sirt', 'sırtınız', 'sirtiniz', 'karın', 'karin', 'karnınız', 'karniniz', 'karnım', 'karnim',

  // Medical Interventions & Hospital Environment
  'ilaç', 'ilac', 'ilaçlar', 'ilaclar', 'hap', 'iğne', 'igne', 'serum',
  'antibiyotik', 'damar', 'damaryolu', 'kan', 'tahlil', 'tahlili',
  'röntgen', 'rontgen', 'film', 'filmi', 'ultrason', 'tomografi', 'mr',
  'doktor', 'doktorunuz', 'hemşire', 'hemsire', 'hasta', 'hastane',
  'acil', 'poliklinik', 'servis', 'oda', 'yatak', 'şikayet', 'sikayet',
  'şikayetiniz', 'sikayetiniz', 'tetkik', 'rapor', 'tedavi', 'pansuman',
  'ameliyat', 'alerji', 'alerjiniz', 'su', 'soğuk', 'soguk', 'sıcak', 'sicak',
  'klima', 'üşüyor', 'usuyor', 'üşüdüm', 'usudum', 'terliyor',

  // Common Verbs & Actions
  'gel', 'gelin', 'git', 'gidin', 'bak', 'bakın', 'bakin', 'bakalım', 'bakalim',
  'al', 'alın', 'alin', 'ver', 'verin', 'otur', 'oturun', 'uzan', 'uzanın', 'uzanin',
  'kalk', 'kalkın', 'kalkin', 'bekle', 'bekleyin', 'aç', 'ac', 'açın', 'acin',
  'kapat', 'kapatın', 'kapatin', 'söyle', 'soyle', 'söyleyin', 'soyleyin',
  'anlat', 'anlatın', 'anlatin', 'dinle', 'dinleyin', 'hisset', 'hissediyor',
  'hissediyorsunuz', 'yap', 'yapın', 'yapin', 'yapalım', 'yapalim',
  'ölç', 'olc', 'ölçelim', 'olcelim', 'ölçeceğiz', 'olcecegiz', 'ölçüyorum', 'olcuyorum',
  'iç', 'ic', 'için', 'icin', 'kullan', 'kullanın', 'kullanin', 'yut', 'yutun',
  'sıyır', 'siyir', 'sıyırın', 'siyirin', 'sıyırır', 'siyirir', 'kaldır', 'kaldir',

  // Adverbs & Common Modifiers
  'şimdi', 'simdi', 'biraz', 'birazdan', 'çok', 'cok', 'az', 'fazla',
  'yavaş', 'yavas', 'hızlı', 'hizli', 'derin', 'sık', 'sik', 'hemen',
  'daha', 'önce', 'once', 'sonra', 'bugün', 'bugun', 'dün', 'dun', 'yarın', 'yarin',
];

// High-frequency foreign words (English, German, French, Spanish, Russian translit, etc.)
const FOREIGN_WORDS: string[] = [
  // English
  'the', 'is', 'are', 'am', 'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did',
  'can', 'could', 'will', 'would', 'should', 'must', 'may', 'might',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their',
  'this', 'that', 'these', 'those', 'what', 'where', 'when', 'why', 'how', 'who', 'which',
  'pain', 'hurts', 'hurt', 'headache', 'fever', 'stomach', 'chest', 'arm', 'leg', 'back',
  'cough', 'cold', 'hot', 'water', 'medicine', 'pills', 'help', 'please', 'thank', 'thanks',
  'yes', 'no', 'yeah', 'nope', 'okay', 'doctor', 'nurse', 'hospital', 'room', 'bed',
  'sick', 'feel', 'feeling', 'bad', 'breath', 'breathing', 'cannot', 'need', 'want',
  'dizzy', 'nausea', 'vomit', 'bleeding', 'blood', 'pressure', 'allergy', 'allergic',
  'toilet', 'bathroom', 'blanket', 'cold', 'thirsty', 'hungry', 'sleep', 'tired',

  // German
  'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'ja', 'nein', 'bitte', 'danke',
  'schmerz', 'schmerzen', 'kopf', 'bauch', 'brust', 'fieber', 'arzt', 'krankenschwester',
  'wasser', 'hilfe', 'nicht', 'gut', 'sehr', 'und', 'haben', 'habe', 'hat', 'wehtun',
  'tut', 'weh', 'übel', 'uebel', 'schwindelig', 'krankenhaus',

  // French
  'je', 'tu', 'il', 'elle', 'nous', 'vous', 'oui', 'non', 'merci', 'douleur', 'mal',
  'docteur', 'infirmiere', 'eau', 'aide', 'fievre', 'ventre', 'tete', 'est', 'sont',
  'avec', 'pour', 'dans', 'peur', 'vertige', 'hopital',

  // Spanish
  'yo', 'tu', 'el', 'ella', 'nosotros', 'usted', 'ustedes', 'si', 'no', 'por favor',
  'gracias', 'dolor', 'duele', 'cabeza', 'estomago', 'pecho', 'medico', 'enfermera',
  'agua', 'ayuda', 'fieber', 'donde', 'que', 'como', 'tengo', 'esta', 'estoy', 'siento',

  // Russian transliterated
  'bolit', 'golova', 'zhivot', 'grud', 'temperatura', 'davlenie', 'vrach', 'doktor',
  'spasibo', 'pozhaluysta', 'voda', 'pomogite', 'ploho', 'horosho', 'da', 'net',

  // Japanese transliterated
  'itai', 'atama', 'onaka', 'nodo', 'mune', 'netsu', 'hakike', 'kusuri', 'mizu',
  'byoin', 'kangoshi', 'sensei', 'arigatou', 'sumimasen', 'kudasai', 'hai', 'iie',
  'daijoubu', 'tasukete', 'desu', 'masu',
];

const TURKISH_SET = new Set(TURKISH_WORDS.map((w) => w.toLowerCase()));
const FOREIGN_SET = new Set(FOREIGN_WORDS.map((w) => w.toLowerCase()));

// Turkish regular agglutinative suffixes pattern (e.g. -iyorum, -acaksınız, -dınız, -lerinde)
const TURKISH_SUFFIX_REGEX = /(?:iyor(?:um|sun|uz|lar|sunuz)?|ıyor(?:um|sun|uz|lar|sunuz)?|uyor(?:um|sun|uz|lar|sunuz)?|üyor(?:um|sun|uz|lar|sunuz)?|acak(?:sınız|sın|yız|lar)?|ecek(?:siniz|sin|yiz|ler)?|dık(?:tan|ça)?|dik(?:ten|çe)?|mekt(?:e|en)|makt(?:a|an)|sınız|siniz|sunuz|sünüz|mısınız|misiniz|musunuz|müsünüz|ınız|iniz|unuz|ünüz)$/i;

/**
 * Accurately analyzes text to determine if it is spoken in Turkish (Nurse)
 * or in a Foreign / Target Language (Patient).
 * 
 * Rules:
 * - Turkish speaker = ALWAYS 'nurse'
 * - Foreign / Target Language speaker = ALWAYS 'patient'
 * - ZERO random guessing or toggling
 */
export function detectSpeakerByLanguage(
  text: string,
  targetLanguageCode?: string
): SpeakerDetectionResult {
  if (!text || typeof text !== 'string') {
    return {
      speaker: 'nurse',
      isTurkish: true,
      confidence: 0.5,
      detectedLanguage: 'tr',
      reason: 'Empty text default',
    };
  }

  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // 1. Definite Foreign Scripts check (Cyrillic, Arabic, East Asian, Greek, Hebrew)
  if (CYRILLIC_REGEX.test(trimmed)) {
    return {
      speaker: 'patient',
      isTurkish: false,
      confidence: 1.0,
      detectedLanguage: targetLanguageCode || 'ru',
      reason: 'Cyrillic script detected (Patient)',
    };
  }
  if (ARABIC_REGEX.test(trimmed)) {
    return {
      speaker: 'patient',
      isTurkish: false,
      confidence: 1.0,
      detectedLanguage: targetLanguageCode || 'ar',
      reason: 'Arabic script detected (Patient)',
    };
  }
  if (EAST_ASIAN_REGEX.test(trimmed)) {
    return {
      speaker: 'patient',
      isTurkish: false,
      confidence: 1.0,
      detectedLanguage: targetLanguageCode || 'ja',
      reason: 'East Asian script detected (Patient)',
    };
  }
  if (GREEK_REGEX.test(trimmed)) {
    return {
      speaker: 'patient',
      isTurkish: false,
      confidence: 1.0,
      detectedLanguage: targetLanguageCode || 'el',
      reason: 'Greek script detected (Patient)',
    };
  }
  if (HEBREW_REGEX.test(trimmed)) {
    return {
      speaker: 'patient',
      isTurkish: false,
      confidence: 1.0,
      detectedLanguage: targetLanguageCode || 'he',
      reason: 'Hebrew script detected (Patient)',
    };
  }

  // 2. Tokenize words (removing punctuation)
  const tokens = lower
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);

  let turkishScore = 0;
  let foreignScore = 0;

  // Check unique Turkish characters
  if (TURKISH_EXCLUSIVE_CHARS_REGEX.test(trimmed)) {
    turkishScore += 4;
  }
  if (TURKISH_CHARS_REGEX.test(trimmed)) {
    turkishScore += 2;
  }

  // Check non-Turkish foreign accents
  if (FOREIGN_LATIN_CHARS_REGEX.test(trimmed)) {
    foreignScore += 3;
  }

  // Word & stem matching
  for (const token of tokens) {
    if (TURKISH_SET.has(token)) {
      turkishScore += 3;
    } else if (TURKISH_SUFFIX_REGEX.test(token)) {
      turkishScore += 2;
    }

    if (FOREIGN_SET.has(token)) {
      foreignScore += 3;
    }
  }

  // Two-word phrase matching
  if (tokens.length >= 2) {
    for (let i = 0; i < tokens.length - 1; i++) {
      const phrase = `${tokens[i]} ${tokens[i + 1]}`;
      if (
        phrase === 'ne zaman' ||
        phrase === 'ne kadar' ||
        phrase === 'iyi günler' ||
        phrase === 'geçmiş olsun' ||
        phrase === 'var mı' ||
        phrase === 'yok mu' ||
        phrase === 'kolunuzu sıyırın' ||
        phrase === 'adınız ne' ||
        phrase === 'derin nefes'
      ) {
        turkishScore += 4;
      }
      if (
        phrase === 'thank you' ||
        phrase === 'i have' ||
        phrase === 'my chest' ||
        phrase === 'where is' ||
        phrase === 'i feel' ||
        phrase === 'por favor' ||
        phrase === 'ich habe'
      ) {
        foreignScore += 4;
      }
    }
  }

  // Clinical Decision
  if (foreignScore > turkishScore && foreignScore >= 2) {
    return {
      speaker: 'patient',
      isTurkish: false,
      confidence: Math.min(0.99, 0.6 + foreignScore * 0.1),
      detectedLanguage: targetLanguageCode || 'en',
      reason: `Foreign language score higher (${foreignScore} vs ${turkishScore}) (Patient)`,
    };
  }

  if (turkishScore > foreignScore && turkishScore >= 2) {
    return {
      speaker: 'nurse',
      isTurkish: true,
      confidence: Math.min(0.99, 0.6 + turkishScore * 0.1),
      detectedLanguage: 'tr',
      reason: `Turkish language score higher (${turkishScore} vs ${foreignScore}) (Nurse)`,
    };
  }

  // Tie-breaker or low score:
  // In a Turkish hospital setting, if speech has Turkish characters or Turkish tokens, it's nurse.
  if (turkishScore > 0) {
    return {
      speaker: 'nurse',
      isTurkish: true,
      confidence: 0.75,
      detectedLanguage: 'tr',
      reason: 'Turkish indicators present (Nurse)',
    };
  }

  if (foreignScore > 0) {
    return {
      speaker: 'patient',
      isTurkish: false,
      confidence: 0.75,
      detectedLanguage: targetLanguageCode || 'en',
      reason: 'Foreign indicators present (Patient)',
    };
  }

  // If totally neutral/unknown without any matches:
  // Default to nurse (hospital staff), but never toggle arbitrarily!
  return {
    speaker: 'nurse',
    isTurkish: true,
    confidence: 0.5,
    detectedLanguage: 'tr',
    reason: 'Default hospital healthcare staff context',
  };
}

/**
 * Intelligent Speech Accumulator & Clause Merger
 * Seamlessly merges multi-part speech recognitions and Gemini Live chunks
 * without truncating long utterances or duplicating clauses.
 */
export function mergeUtteranceClauses(existing: string, incoming: string): string {
  const normExist = (existing || '').trim();
  const normIn = (incoming || '').trim();
  if (!normExist) return normIn;
  if (!normIn) return normExist;

  const lowExist = normExist.toLowerCase();
  const lowIn = normIn.toLowerCase();

  // 1. If incoming contains the entirety of existing or starts with it,
  // incoming is the complete accumulated version.
  if (lowIn.includes(lowExist) || lowIn.startsWith(lowExist)) {
    return normIn;
  }

  // 2. If existing already contains incoming, incoming is an earlier fragment/duplicate
  if (lowExist.includes(lowIn)) {
    return normExist;
  }

  // 3. Check for overlapping word boundary (suffix of existing matching prefix of incoming)
  const existWords = normExist.split(/\s+/);
  const inWords = normIn.split(/\s+/);

  let overlapWordsCount = 0;
  const maxOverlap = Math.min(existWords.length, inWords.length, 6);
  for (let n = maxOverlap; n >= 1; n--) {
    const existSuffix = existWords.slice(-n).map((w) => w.toLowerCase()).join(' ');
    const inPrefix = inWords.slice(0, n).map((w) => w.toLowerCase()).join(' ');
    if (existSuffix === inPrefix) {
      overlapWordsCount = n;
      break;
    }
  }

  if (overlapWordsCount > 0) {
    const remainingInWords = inWords.slice(overlapWordsCount);
    return `${normExist} ${remainingInWords.join(' ')}`.trim();
  }

  // 4. Sequential continuation clauses: merge cleanly
  return `${normExist} ${normIn}`.trim();
}


import type {
  ClinicalEntityType,
  HighlightedEntity,
  LiveAnamnesisState,
  TranscriptMessage,
} from '../types/interpreter';

/**
 * List of compound phrases frequently glued together in Turkish speech recognition / fast translations.
 */
const TURKISH_MERGED_COMPOUNDS: [RegExp, string][] = [
  [/(^|\s)kanbasıncı(\s|[.,!?]|$)/gi, '$1kan basıncı$2'],
  [/(^|\s)kanbasıncınız(\s|[.,!?]|$)/gi, '$1kan basıncınız$2'],
  [/(^|\s)nefesdarlığı(\s|[.,!?]|$)/gi, '$1nefes darlığı$2'],
  [/(^|\s)nefesdarlığınız(\s|[.,!?]|$)/gi, '$1nefes darlığınız$2'],
  [/(^|\s)şekerhastalığı(\s|[.,!?]|$)/gi, '$1şeker hastalığı$2'],
  [/(^|\s)yüksektansiyon(\s|[.,!?]|$)/gi, '$1yüksek tansiyon$2'],
  [/(^|\s)düşüktansiyon(\s|[.,!?]|$)/gi, '$1düşük tansiyon$2'],
  [/(^|\s)kalpkrizi(\s|[.,!?]|$)/gi, '$1kalp krizi$2'],
  [/(^|\s)safrakesesi(\s|[.,!?]|$)/gi, '$1safra kesesi$2'],
  [/(^|\s)açıkkalp(\s|[.,!?]|$)/gi, '$1açık kalp$2'],
  [/(^|\s)göğüsağrısı(\s|[.,!?]|$)/gi, '$1göğüs ağrısı$2'],
  [/(^|\s)göğüsağrınız(\s|[.,!?]|$)/gi, '$1göğüs ağrınız$2'],
  [/(^|\s)başdönmesi(\s|[.,!?]|$)/gi, '$1baş dönmesi$2'],
  [/(^|\s)başdönmeniz(\s|[.,!?]|$)/gi, '$1baş dönmeniz$2'],
  [/(^|\s)başağrısı(\s|[.,!?]|$)/gi, '$1baş ağrısı$2'],
  [/(^|\s)başağrınız(\s|[.,!?]|$)/gi, '$1baş ağrınız$2'],
  [/(^|\s)midebulantısı(\s|[.,!?]|$)/gi, '$1mide bulantısı$2'],
  [/(^|\s)midebulantınız(\s|[.,!?]|$)/gi, '$1mide bulantınız$2'],
  [/(^|\s)boğazağrısı(\s|[.,!?]|$)/gi, '$1boğaz ağrısı$2'],
  [/(^|\s)belağrısı(\s|[.,!?]|$)/gi, '$1bel ağrısı$2'],
  [/(^|\s)sırtağrısı(\s|[.,!?]|$)/gi, '$1sırt ağrısı$2'],
  [/(^|\s)bacağımağrıyor(\s|[.,!?]|$)/gi, '$1bacağım ağrıyor$2'],
  [/(^|\s)kolumağrıyor(\s|[.,!?]|$)/gi, '$1kolum ağrıyor$2'],
  [/(^|\s)başımagrıyor(\s|[.,!?]|$)/gi, '$1başım ağrıyor$2'],
  [/(^|\s)başımdaağrı(\s|[.,!?]|$)/gi, '$1başımda ağrı$2'],
  [/(^|\s)hastayakınları(\s|[.,!?]|$)/gi, '$1hasta yakınları$2'],
  [/(^|\s)hastayakını(\s|[.,!?]|$)/gi, '$1hasta yakını$2'],
  [/(^|\s)acilservis(\s|[.,!?]|$)/gi, '$1acil servis$2'],
  [/(^|\s)yoğunbakım(\s|[.,!?]|$)/gi, '$1yoğun bakım$2'],
  [/(^|\s)geçmişolsun(\s|[.,!?]|$)/gi, '$1geçmiş olsun$2'],
  [/(^|\s)geçmişolsundilerim(\s|[.,!?]|$)/gi, '$1geçmiş olsun dilerim$2'],
  [/(^|\s)teşekkürederim(\s|[.,!?]|$)/gi, '$1teşekkür ederim$2'],
  [/(^|\s)teşekkürederiz(\s|[.,!?]|$)/gi, '$1teşekkür ederiz$2'],
  [/(^|\s)yardımcıolabilir(\s|[.,!?]|$)/gi, '$1yardımcı olabilir$2'],
  [/(^|\s)yardımcıolayım(\s|[.,!?]|$)/gi, '$1yardımcı olayım$2'],
  [/(^|\s)yardımcıoluruz(\s|[.,!?]|$)/gi, '$1yardımcı oluruz$2'],
  [/(^|\s)yardımcıolun(\s|[.,!?]|$)/gi, '$1yardımcı olun$2'],
  [/(^|\s)rahatsızlığınızvar(\s|[.,!?]|$)/gi, '$1rahatsızlığınız var$2'],
  [/(^|\s)alerjinizvar(\s|[.,!?]|$)/gi, '$1alerjiniz var$2'],
  [/(^|\s)ilaçkullanıyor(\s|[.,!?]|$)/gi, '$1ilaç kullanıyor$2'],
  [/(^|\s)sigarakullanıyor(\s|[.,!?]|$)/gi, '$1sigara kullanıyor$2'],
  [/(^|\s)alkolkullanıyor(\s|[.,!?]|$)/gi, '$1alkol kullanıyor$2'],
  [/(^|\s)ameliyatoldu(\s|[.,!?]|$)/gi, '$1ameliyat oldu$2'],
  [/(^|\s)taburcuoldu(\s|[.,!?]|$)/gi, '$1taburcu oldu$2'],
  [/(^|\s)yatışyapıldı(\s|[.,!?]|$)/gi, '$1yatış yapıldı$2'],
  [/(^|\s)şikayetinizvar(\s|[.,!?]|$)/gi, '$1şikayetiniz var$2'],
  [/(^|\s)ağrınızvar(\s|[.,!?]|$)/gi, '$1ağrınız var$2'],
  [/(^|\s)muayeneoldu(\s|[.,!?]|$)/gi, '$1muayene oldu$2'],
  [/(^|\s)reçeteyazıldı(\s|[.,!?]|$)/gi, '$1reçete yazıldı$2'],
  [/(^|\s)damaryolu(\s|[.,!?]|$)/gi, '$1damar yolu$2'],
  [/(^|\s)kanaldı(\s|[.,!?]|$)/gi, '$1kan aldı$2'],
  [/(^|\s)serumtakıldı(\s|[.,!?]|$)/gi, '$1serum takıldı$2'],
  [/(^|\s)dikişalındı(\s|[.,!?]|$)/gi, '$1dikiş alındı$2'],
  [/(^|\s)pansumanyapıldı(\s|[.,!?]|$)/gi, '$1pansuman yapıldı$2'],
  [/(^|\s)birdaha(\s|[.,!?]|$)/gi, '$1bir daha$2'],
  [/(^|\s)birkere(\s|[.,!?]|$)/gi, '$1bir kere$2'],
  [/(^|\s)birşey(\s|[.,!?]|$)/gi, '$1bir şey$2'],
  [/(^|\s)herşey(\s|[.,!?]|$)/gi, '$1her şey$2'],
  [/(^|\s)hiçbirşey(\s|[.,!?]|$)/gi, '$1hiçbir şey$2'],
  [/(^|\s)pekçok(\s|[.,!?]|$)/gi, '$1pek çok$2'],
  [/(^|\s)sabahakşam(\s|[.,!?]|$)/gi, '$1sabah akşam$2'],
  [/(^|\s)açkarnına(\s|[.,!?]|$)/gi, '$1aç karnına$2'],
  [/(^|\s)tokkarnına(\s|[.,!?]|$)/gi, '$1tok karnına$2'],
  [/(^|\s)hemenşimdi(\s|[.,!?]|$)/gi, '$1hemen şimdi$2'],
  [/(^|\s)derinnefes(\s|[.,!?]|$)/gi, '$1derin nefes$2'],
  [/(^|\s)nefesalın(\s|[.,!?]|$)/gi, '$1nefes alın$2'],
  [/(^|\s)nefesverin(\s|[.,!?]|$)/gi, '$1nefes verin$2'],
  [/(^|\s)nefestutun(\s|[.,!?]|$)/gi, '$1nefes tutun$2'],
  [/(^|\s)nefessizkaldım(\s|[.,!?]|$)/gi, '$1nefessiz kaldım$2'],
  [/(^|\s)tansiyonilacı(\s|[.,!?]|$)/gi, '$1tansiyon ilacı$2'],
  [/(^|\s)şekerilacı(\s|[.,!?]|$)/gi, '$1şeker ilacı$2'],
  [/(^|\s)kalpilacı(\s|[.,!?]|$)/gi, '$1kalp ilacı$2'],
  [/(^|\s)ağrıkesici(\s|[.,!?]|$)/gi, '$1ağrı kesici$2'],
  [/(^|\s)midekoruyucu(\s|[.,!?]|$)/gi, '$1mide koruyucu$2'],
  [/(^|\s)kansulandırıcı(\s|[.,!?]|$)/gi, '$1kan sulandırıcı$2'],
  [/(^|\s)oksijensatürasyonu(\s|[.,!?]|$)/gi, '$1oksijen satürasyonu$2'],
  [/(^|\s)solunumsayısı(\s|[.,!?]|$)/gi, '$1solunum sayısı$2'],
  [/(^|\s)kanşekeri(\s|[.,!?]|$)/gi, '$1kan şekeri$2'],
  [/(^|\s)kalpatışı(\s|[.,!?]|$)/gi, '$1kalp atışı$2'],
  [/(^|\s)vücutısısı(\s|[.,!?]|$)/gi, '$1vücut ısısı$2'],
  [/(^|\s)çağrızili(\s|[.,!?]|$)/gi, '$1çağrı zili$2'],
  [/(^|\s)çağrıbutonu(\s|[.,!?]|$)/gi, '$1çağrı butonu$2'],
  [/(^|\s)solunumcihazı(\s|[.,!?]|$)/gi, '$1solunum cihazı$2'],
  [/(^|\s)sağlıkpersoneli(\s|[.,!?]|$)/gi, '$1sağlık personeli$2'],
  [/(^|\s)hastaneodası(\s|[.,!?]|$)/gi, '$1hastane odası$2'],
  [/(^|\s)hastayatağı(\s|[.,!?]|$)/gi, '$1hasta yatağı$2'],
  [/(^|\s)iyigünler(\s|[.,!?]|$)/gi, '$1iyi günler$2'],
  [/(^|\s)iyigeceler(\s|[.,!?]|$)/gi, '$1iyi geceler$2'],
  [/(^|\s)iyiakşamlar(\s|[.,!?]|$)/gi, '$1iyi akşamlar$2'],
  [/(^|\s)iyiaksamlar(\s|[.,!?]|$)/gi, '$1iyi akşamlar$2'],
  [/(^|\s)kolaygelsin(\s|[.,!?]|$)/gi, '$1kolay gelsin$2'],
  [/(^|\s)hoşgeldiniz(\s|[.,!?]|$)/gi, '$1hoş geldiniz$2'],
  [/(^|\s)hoşbulduk(\s|[.,!?]|$)/gi, '$1hoş bulduk$2'],
  [/(^|\s)özürdilerim(\s|[.,!?]|$)/gi, '$1özür dilerim$2'],
  [/(^|\s)kusurabakmayın(\s|[.,!?]|$)/gi, '$1kusura bakmayın$2'],
];

/**
 * Cleanly normalizes transcript speech text with full Turkish character support (ç, ğ, ı, ö, ş, ü).
 * Separates merged words, enforces typographic punctuation spacing, numbers/units separation,
 * detaches Turkish question particles, and ensures correct sentence capitalization.
 */
export function normalizeTranscriptText(text: string, langCode?: string): string {
  if (!text) return '';
  let cleaned = text.trim();

  // 1. Punctuation spacing: ensure space after punctuation marks (. , ; : ! ?)
  cleaned = cleaned.replace(/([.,;:!?])([^\s0-9.,;:!?])/g, '$1 $2');

  // 2. Bracket and parenthesis spacing
  cleaned = cleaned
    .replace(/([)\]}])([a-zA-ZçğışöüÇĞİŞÖÜ])/gu, '$1 $2')
    .replace(/([a-zA-ZçğışöüÇĞİŞÖÜ])([(])/gu, '$1 $2');

  // 3. Separate accidental PascalCase/camelCase concatenation (e.g. "AğrınızVarMı" -> "Ağrınız Var Mı")
  cleaned = cleaned.replace(/([a-zçğışöü])([A-ZÇĞİŞÖÜ])/gu, '$1 $2');

  // 4. Clinical numbers and units spacing (e.g. "500mg" -> "500 mg", "500mgparol" -> "500 mg Parol")
  cleaned = cleaned
    .replace(/(\d+)\s*(mg|mcg|kg|gr|gram|ml|lt|mmhg|cm|spo2|ünite|kutu|adet|tablet|puf)\s*([a-zA-ZçğışöüÇĞİŞÖÜ]+)/gi, '$1 $2 $3')
    .replace(/(\d+)\s*(mg|mcg|kg|gr|gram|ml|lt|mmhg|cm|spo2|ünite|kutu|adet|tablet|puf)\b/gi, '$1 $2')
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:°?C|derece)\b/gi, '$1 °C');

  // If text is Turkish (or detected as Turkish)
  const isTurkish = !langCode || langCode.toLowerCase().startsWith('tr');

  if (isTurkish) {
    // 5. Remove only clear stutter noises and filler groans
    cleaned = cleaned.replace(/(^|\s)(şey\s+şey|ııı+|eee+|uhm+|umm+)(\s|$)/gi, ' ');
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

    // 6. Detach Turkish question particles (mı / mi / mu / mü / musunuz / misiniz / mısınız / müsünüz / mıydı / miydi)
    cleaned = cleaned
      .replace(/\b([a-zA-ZçğışöüÇĞİŞÖÜ]{2,})(mısınız|misiniz|musunuz|müsünüz)\b/gi, '$1 $2')
      .replace(/\b([a-zA-ZçğışöüÇĞİŞÖÜ]{2,})(mıydı|miydi|muydu|müydü)\b/gi, '$1 $2')
      .replace(/\b(var|yok|olur|geldi|gitti|bitti|çıktı|aldı|içti|geçti|oldu|başladı|kaldı|verdi|duydu|gördü|bildi)(mı|mi|mu|mü)\b/gi, '$1 $2')
      .replace(/\b([a-zA-ZçğışöüÇĞİŞÖÜ]{3,}(?:yor|du|dü|dı|di|tu|tü|tı|ti|ur|ür|ar|er|mış|miş|muş|müş|acak|ecek|ır|ir))(mı|mi|mu|mü)\b/gi, '$1 $2');

    // 7. Fix common Turkish compound words glued together without spaces
    for (const [pattern, replacement] of TURKISH_MERGED_COMPOUNDS) {
      cleaned = cleaned.replace(pattern, replacement);
    }

    // 8. Safe Turkish speech typo corrections (using unicode-safe regex)
    cleaned = cleaned
      .replace(/(^|\s)tansyon(um|u)?(\s|[.,!?]|$)/gi, '$1tansiyon$2$3')
      .replace(/(^|\s)sek(er|rim|erim)(\s|[.,!?]|$)/gi, '$1şek$2$3')
      .replace(/(^|\s)agrı(m|mız|yor|sı)?(\s|[.,!?]|$)/gi, '$1ağrı$2$3')
      .replace(/(^|\s)bulgantı(\s|[.,!?]|$)/gi, '$1bulantı$2')
      .replace(/(^|\s)sersemlk(\s|[.,!?]|$)/gi, '$1sersemlik$2')
      .replace(/(^|\s)carpıntı(m)?(\s|[.,!?]|$)/gi, '$1çarpıntı$2$3')
      .replace(/(^|\s)nefes\s*darlıgı(\s|[.,!?]|$)/gi, '$1nefes darlığı$2')
      .replace(/(^|\s)ates(im)?(\s|[.,!?]|$)/gi, '$1ateş$2$3')
      .replace(/(^|\s)usume(\s|[.,!?]|$)/gi, '$1üşüme$2')
      .replace(/(^|\s)usuyorum(\s|[.,!?]|$)/gi, '$1üşüyorum$2')
      .replace(/(^|\s)apandist(\s|[.,!?]|$)/gi, '$1apandisit$2')
      .replace(/(^|\s)baypas(\s|[.,!?]|$)/gi, '$1bypass$2')
      .replace(/(^|\s)sezeryan(\s|[.,!?]|$)/gi, '$1sezaryen$2')
      .replace(/(^|\s)kolestrol(\s|[.,!?]|$)/gi, '$1kolesterol$2')
      .replace(/(^|\s)ilac(ım|lar|larımı)?(\s|[.,!?]|$)/gi, '$1ilaç$2$3')
      .replace(/(^|\s)alerji(m)?(\s|[.,!?]|$)/gi, '$1alerji$2$3')
      .replace(/(^|\s)hemsire(\s|[.,!?]|$)/gi, '$1hemşire$2')
      .replace(/(^|\s)gecmis(\s|[.,!?]|$)/gi, '$1geçmiş$2')
      .replace(/(^|\s)gecirdim(\s|[.,!?]|$)/gi, '$1geçirdim$2')
      .replace(/(^|\s)kullaniyorum(\s|[.,!?]|$)/gi, '$1kullanıyorum$2');

    // 9. Clean multi-spaces
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

    // 10. Sentence Capitalization with Turkish Locale
    cleaned = cleaned.replace(/(^\s*|[.!?]\s+)([a-zçğışöü])/gu, (_, prefix, char) => {
      return prefix + char.toLocaleUpperCase('tr-TR');
    });

    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toLocaleUpperCase('tr-TR') + cleaned.slice(1);
    }
  } else {
    // Non-Turkish languages: clean standard filler sounds
    cleaned = cleaned.replace(/(^|\s)(uhm+|umm+|er+|ah+)(\s|$)/gi, ' ');
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

    // Standard Capitalization
    cleaned = cleaned.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, prefix, char) => {
      return prefix + char.toUpperCase();
    });

    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
  }

  // 11. Ensure ending punctuation (. or ?)
  const isQuestion = /(mı|mi|mu|mü|misiniz|musunuz|mısınız|müsünüz|kaç|nerede|ne zaman|nasıl|neden|where|when|what|how|why|is there|do you)\s*[.?]?$/i.test(
    cleaned
  );
  if (!/[.!?]$/.test(cleaned)) {
    cleaned += isQuestion ? '?' : '.';
  }

  return cleaned;
}

/**
 * Strict verified clinical patterns.
 * Never match bare words like "ameliyat", "alerji", "ilaç", "hastalık".
 */
interface ClinicalRegexPattern {
  type: ClinicalEntityType;
  labelTr: string;
  regex: RegExp;
  cleanName: (raw: string) => string;
}

const STRICT_CLINICAL_PATTERNS: ClinicalRegexPattern[] = [
  // 1. Specific Medications (Brand & Generic - only when actual drug name is stated)
  {
    type: 'medication',
    labelTr: 'İlaç',
    regex: /(parol|minoset|parasetamol|paracetamol|tylenol|arveles|diklofenak|diclofenac|voltaren|majezik|novalgin|metamizol|advil|motrin|ibuprofen|augmentin|amoksisilin|amoxicillin|klamoks|klaritromisin|sefazol|seftriakson|cipro|siprofloksasin|ciprofloxacin|clexane|enoksaparin|heparin|coraspin|ecopirin|aspirin|plavix|beloc|metoprolol|norvasc|amlodipin|amlodipine|delix|ramipril|micardis|telmisartan|glifor|matofin|metformin|diamicron|januvia|insülin|insulin|lantus|humalog|novorapid|lansor|pantpas|nexium|pantoprazol|omeprazol|esomeprazol|ventolin|salbutamol|foster|symbicort|pulmicort|dideral|xanax|diazepam|ativan|lasix|furosemid|buscopan|muscoril|lipitor|atorvastatin|crestor|rosuvastatin|cordarone)(\s+\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|ünite))?/gi,
    cleanName: (raw) => {
      const trimmed = raw.trim();
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    },
  },

  // 2. Specific Verified Allergies (Never the bare word 'alerji')
  {
    type: 'allergy',
    labelTr: 'Alerji',
    regex: /(penisilin|amoksisilin|sefalosporin|aspirin|nsaii|lateks|latex|kontrast\s*madde|iyot|yer\s*fıstığı|fıstık|fındık|arı\s*sokması|yumurta)\s*(?:alerjisi)?/gi,
    cleanName: (raw) => {
      const clean = raw.trim();
      if (/alerji/i.test(clean)) {
        return clean.charAt(0).toUpperCase() + clean.slice(1);
      }
      return `${clean.charAt(0).toUpperCase() + clean.slice(1)} Alerjisi`;
    },
  },

  // 3. Specific Chronic Diseases (Never the bare word 'hastalık')
  {
    type: 'chronic_disease',
    labelTr: 'Kronik Hastalık',
    regex: /(şeker\s*hastalığı|tip\s*1\s*diyabet|tip\s*2\s*diyabet|diyabet|hipertansiyon|yüksek\s*tansiyon|kronik\s*tansiyon|koah|astım|kronik\s*bronşit|kalp\s*yetmezliği|koroner\s*arter|ritim\s*bozukluğu|aritmi|guatr|haşimato|hipotiroidi|hipertiroidi|böbrek\s*yetmezliği|diyaliz|karaciğer\s*yetmezliği|siroz|hepatit\s*[bc]?|epilepsi|migren|romatoid\s*artrit|ankilozan\s*spondilit|reflü|gastrit)/gi,
    cleanName: (raw) => {
      const clean = raw.trim();
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    },
  },

  // 4. Specific Past Surgeries (Never the bare word 'ameliyat' or 'operasyon')
  {
    type: 'surgery',
    labelTr: 'Geçirilmiş Operasyon',
    regex: /(apandisit\s*ameliyatı|safra\s*kesesi\s*ameliyatı|kolesistektomi|bypass\s*ameliyatı|baypas|stent\s*takıldı|kalça\s*protezi|diz\s*protezi|sezaryen|bademcik\s*ameliyatı|tonsillektomi|fıtık\s*ameliyatı|katarakt\s*ameliyatı|tiroid\s*ameliyatı|açık\s*kalp\s*ameliyatı)/gi,
    cleanName: (raw) => {
      const clean = raw.trim();
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    },
  },

  // 5. Habits (Smoking, Alcohol)
  {
    type: 'habit',
    labelTr: 'Alışkanlık',
    regex: /(günde\s*\d+\s*paket\s*sigara|sigara\s*içiyor(?:um)?|sigara\s*kullanıyor(?:um)?|düzenli\s*alkol|sosyal\s*içici)/gi,
    cleanName: (raw) => {
      const clean = raw.trim();
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    },
  },

  // 6. Family History (Family members + disease)
  {
    type: 'family_history',
    labelTr: 'Aile Öyküsü',
    regex: /(ailede\s*(?:şeker|diyabet|tansiyon|kalp\s*krizi|kanser)|(?:anne|baba|kardeş)(?:mde|mizde)?\s*(?:şeker|diyabet|tansiyon|kalp\s*krizi|kanser))/gi,
    cleanName: (raw) => {
      const clean = raw.trim();
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    },
  },
];

/**
 * Extracts and highlights medical entities.
 * Safe from false-positive question prompts.
 */
export function extractMedicalEntities(text: string): HighlightedEntity[] {
  if (!text) return [];
  const entities: HighlightedEntity[] = [];
  const seen = new Set<string>();

  // If text is purely a question from staff or negative answer, do not extract
  const isQuestion = /\?$/.test(text.trim()) || /\b(var mı|yok mu|geçirdiniz mi|kullanıyor musunuz)\b/i.test(text);
  const isNegation = /\b(yok|olmadım|geçirmedim|kullanmıyorum|içmiyorum|bıraktım)\b/i.test(text);

  if (isQuestion || isNegation) {
    return [];
  }

  for (const pattern of STRICT_CLINICAL_PATTERNS) {
    const matches = text.match(pattern.regex);
    if (matches) {
      for (const rawMatch of matches) {
        const clean = pattern.cleanName(rawMatch);
        const key = `${pattern.type}:${clean.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          entities.push({
            text: clean,
            type: pattern.type,
            labelTr: pattern.labelTr,
          });
        }
      }
    }
  }

  return entities;
}

export function extractMedicalDosages(text: string): string[] {
  const matches = text.match(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|ünite)\b/gi);
  return matches ? Array.from(new Set(matches.map((m) => m.trim()))) : [];
}

/**
 * Deterministic Real-time Clinical Anamnesis Builder:
 * - Rejects questions (e.g. "Ameliyat geçirdiniz mi?", "Alerjiniz var mı?")
 * - Rejects negative statements (e.g. "Alerjim yok", "Ameliyat olmadım")
 * - Deduplicates completely (only records each unique fact once)
 * - Excludes vitals/metrics as requested
 */
export function buildRealtimeAnamnesis(messages: TranscriptMessage[]): LiveAnamnesisState {
  const state: LiveAnamnesisState = {
    chiefComplaints: [],
    patientNeedsAndRequests: [],
    medications: [],
    allergies: [],
    chronicDiseases: [],
    pastSurgeries: [],
    habits: [],
    familyHistory: [],
    clinicalInstructions: [],
    lastUpdated: Date.now(),
  };

  const addUnique = (arr: string[], val: string) => {
    const clean = val.trim();
    if (!clean || clean.length < 2) return;
    const lower = clean.toLowerCase();
    if (!arr.some((item) => item.toLowerCase() === lower)) {
      arr.push(clean);
    }
  };

  for (const msg of messages) {
    if (msg.speaker === 'system') continue;
    const isPatient = msg.speaker === 'patient';
    const isNurse = msg.speaker === 'nurse';

    const text = `${msg.originalText} ${msg.translatedText || ''}`.trim();

    // Check if the utterance is a question or a negation
    const isQuestion = /\?$/.test(msg.originalText.trim()) || /\b(var mı|misiniz|musunuz|geçirdiniz mi|kullanıyor musunuz|oldu mu)\b/i.test(msg.originalText);
    const isNegation = /\b(yok|olmadım|geçirmedim|kullanmıyorum|içmiyorum|yoktur|alerjim yok)\b/i.test(msg.originalText);

    // 1. Clinical Entities Extraction (Only if not a question and not a denial)
    if (!isQuestion && !isNegation) {
      for (const pattern of STRICT_CLINICAL_PATTERNS) {
        const matches = text.match(pattern.regex);
        if (matches) {
          for (const raw of matches) {
            const clean = pattern.cleanName(raw);
            switch (pattern.type) {
              case 'medication':
                addUnique(state.medications, clean);
                break;
              case 'allergy':
                addUnique(state.allergies, clean);
                break;
              case 'chronic_disease':
                addUnique(state.chronicDiseases, clean);
                break;
              case 'surgery':
                addUnique(state.pastSurgeries, clean);
                break;
              case 'habit':
                addUnique(state.habits, clean);
                break;
              case 'family_history':
                addUnique(state.familyHistory, clean);
                break;
            }
          }
        }
      }
    }

    // 2. Patient Specific Signals (Complaints & Requests)
    if (isPatient && !isQuestion) {
      const complaintMatch = text.match(
        /\b(göğüs\s*ağrısı|baş\s*ağrısı|karın\s*ağrısı|şiddetli\s*ağrı|nefes\s*darlığı|baş\s*dönmesi|sersemlik|bulantı|kusma|çarpıntı|üşüme|titreme|uyuşma|kramp|halsizlik|ateşim\s*var|öksürük)\b/gi
      );
      if (complaintMatch) {
        for (const c of complaintMatch) {
          const cap = c.trim().charAt(0).toUpperCase() + c.trim().slice(1);
          addUnique(state.chiefComplaints, cap);
        }
      }

      // Needs and requests detection
      const requestMatch = text.match(
        /\b(su\s*istiyorum|su\s*verir\s*misiniz|yastık\s*istiyorum|battaniye\s*istiyorum|doktor\s*görmek\s*istiyorum|tuvalete\s*gitmem\s*lazım|yardım\s*edin|ağrı\s*kesici\s*istiyorum)\b/gi
      );
      if (requestMatch) {
        for (const r of requestMatch) {
          const cap = r.trim().charAt(0).toUpperCase() + r.trim().slice(1);
          addUnique(state.patientNeedsAndRequests, cap);
        }
      }
    }

    // 3. Nurse Specific Signals (Directives)
    if (isNurse && !isQuestion) {
      const instructionMatch = text.match(
        /\b(kolunuzu\s*düz\s*tutun|derin\s*nefes\s*alın|nefesinizi\s*tutun|serum\s*takacağız|damar\s*yolu\s*açacağız|kan\s*alacağız|pansuman\s*yapacağız|tansiyonunuzu\s*ölçeceğim|çağrı\s*butonuna\s*basın|zil\s*çalın|triflow|yataktan\s*kalkmayın|dinlenin|aç\s*kalmanız\s*gerekiyor|ilaçlarınızı\s*için)\b/gi
      );
      if (instructionMatch) {
        for (const ins of instructionMatch) {
          const cap = ins.trim().charAt(0).toUpperCase() + ins.trim().slice(1);
          addUnique(state.clinicalInstructions, cap);
        }
      }
    }
  }

  return state;
}

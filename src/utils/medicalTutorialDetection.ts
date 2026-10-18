/**
 * Medical Tutorial Video Detection Engine
 * Supports:
 * 1. Nurse Call Button (Hemşire Çağrı Butonu)
 * 2. Triflow Respiratory Exerciser (Triflow Solunum Egzersiz Cihazı)
 *
 * CRITICAL RULE:
 * Videos are ONLY shown when healthcare staff is actively EDUCATING, INSTRUCTING,
 * or GUIDING the patient on how, why, or when to use the device/button.
 * Casual questions, inquiry checks, or malfunction inquiries MUST NOT trigger the video:
 * - "Beni hemşire çağrı butonunu kullanarak siz mi çağırdınız?" -> NO VIDEO (Inquiry)
 * - "Hemşire çağrı butonunu siz mi aktif ettiniz?" -> NO VIDEO (Inquiry)
 * - "Hemşire çağrı butonu bozuldu mu?" -> NO VIDEO (Malfunction check)
 * - "Triflow cihazını kullanıyor musunuz?" -> NO VIDEO (Question)
 * - "Triflow cihazını en son ne zaman kullandınız?" -> NO VIDEO (Inquiry)
 * - "Triflow nerede?" -> NO VIDEO (Location inquiry)
 *
 * INSTRUCTIONAL / EDUCATIONAL EXAMPLES (MUST TRIGGER VIDEO):
 * - "Merhabalar, hemşire çağrı butonunu kullanarak beni istediğiniz zaman çağırabilirsiniz." -> SHOW VIDEO
 * - "Herhangi bir şikayetiniz olursa lütfen hemşire çağrı butonuna basın." -> SHOW VIDEO
 * - "Ağrınız veya baş dönmeniz olduğunda bu butona basarak bize haber verin." -> SHOW VIDEO
 * - "Triflow cihazını bu şekilde ağzınıza alıp derin nefes çekerek kullanacaksınız." -> SHOW VIDEO
 * - "Solunum egzersiz cihazını saatte bir kez 10 defa yapmanız gerekiyor." -> SHOW VIDEO
 * - "Triflow ile derin nefes alıp üç topu da havada tutmaya çalışın." -> SHOW VIDEO
 */

export const NURSE_CALL_VIDEO_URL = '/nurse-call-button-guide.mp4';
export const NURSE_CALL_ALT_VIDEO_URL = '/VID-20261009-WA0030.mp4';

export const TRIFLOW_VIDEO_URL = '/triflow-device-guide.mp4';
export const TRIFLOW_ALT_VIDEO_URL = '/petal_20261010_152016.mp4';

export type MedicalTutorialType = 'nurse_call' | 'triflow';

export interface MedicalTutorialResult {
  shouldShow: boolean;
  type: MedicalTutorialType | null;
  videoUrl?: string;
  altVideoUrl?: string;
  title?: string;
}

/**
 * Normalizes text for accurate, diacritic-insensitive Turkish and Latin matching.
 */
function normalizeText(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

/**
 * Checks if the utterance contains non-educational inquiry patterns for Nurse Call Button.
 */
function isNurseCallNonEducationalInquiry(normalized: string): boolean {
  const inquiryPatterns = [
    // Did you call me / Did you press?
    /siz\s*mi\s*cagirdiniz/i,
    /beni\s*siz\s*mi\s*cagirdiniz/i,
    /siz\s*mi\s*bastiniz/i,
    /siz\s*mi\s*aktif\s*ettiniz/i,
    /butona\s*siz\s*mi\s*bastiniz/i,
    /yanlislikla\s*mi\s*bastiniz/i,
    /kazara\s*mi\s*bastiniz/i,
    /kim\s*basti/i,
    /cagirdiniz\s*mi/i,
    /bastiniz\s*mi/i,
    /neden\s*bastiniz/i,
    /neden\s*cagirdiniz/i,
    /basmadiniz\s*degil\s*mi/i,
    // Usage frequency / whether patient is using it or location inquiry
    /kullaniyor\s*musunuz/i,
    /kullandiniz\s*mi/i,
    /en\s*son\s*ne\s*zaman/i,
    /ne\s*zaman\s*kullandiniz/i,
    /kullanmadiniz\s*mi/i,
    /nerede/i,
    /yaninizda\s*mi/i,
    /var\s*mi/i,
    /yerinde\s*mi/i,
    // Malfunction / Broken check
    /bozuldu\s*mu/i,
    /calismiyor\s*mu/i,
    /arizali\s*mi/i,
    /bozuk\s*mu/i,
    /kopuk\s*mu/i,
    // Multilingual inquiry checks
    /did\s*you\s*call\s*me/i,
    /did\s*you\s*press/i,
    /did\s*you\s*push\s*the\s*button/i,
    /accidentally\s*pressed/i,
    /by\s*mistake/i,
    /is\s*the\s*button\s*broken/i,
    /is\s*it\s*working/i,
    /not\s*working/i,
    /who\s*pressed/i,
    /do\s*you\s*use/i,
    /where\s*is\s*(the|your)\s*button/i,
  ];

  return inquiryPatterns.some((pattern) => pattern.test(normalized));
}

/**
 * Checks if the utterance contains genuine educational training / usage guidance
 * for the Nurse Call Button.
 */
export function isNurseCallEducationalTraining(text?: string | null): boolean {
  if (!text || typeof text !== 'string') return false;
  const clean = text.trim();
  if (clean.length < 5) return false;

  const normalized = normalizeText(clean);

  // 1. Topic presence check (Does it talk about the call button or calling nurse?)
  const hasNurseCallKeyword =
    /hemsire\s*cagir/i.test(normalized) ||
    /cagri\s*buton/i.test(normalized) ||
    /cagri\s*zil/i.test(normalized) ||
    /cagirma\s*buton/i.test(normalized) ||
    /hasta\s*cagri/i.test(normalized) ||
    /acil\s*cagri/i.test(normalized) ||
    /yatak\s*basi\s*cagri/i.test(normalized) ||
    /kirmizi\s*buton/i.test(normalized) ||
    /cagri\s*kordon/i.test(normalized) ||
    /cagri\s*ip/i.test(normalized) ||
    /hemsireyi\s*cagir/i.test(normalized) ||
    /beni\s*cagir/i.test(normalized) ||
    /bizi\s*cagir/i.test(normalized) ||
    (/buton/i.test(normalized) && /(cagir|haber\s*ver|yardim|ihtiyac|sikayet|agri|bas\s*donme|yataktan)/i.test(normalized)) ||
    /nurse\s*call/i.test(clean) ||
    /call\s*bell/i.test(clean) ||
    /call\s*button/i.test(clean) ||
    /bouton\s*d['\s]?appel/i.test(clean) ||
    /sonnette\s*d['\s]?appel/i.test(clean) ||
    /schwestern\s*ruf/i.test(clean) ||
    /ruf\s*taste/i.test(clean) ||
    /bot[oó]n\s*de\s*llamada/i.test(clean) ||
    /кнопк[ауеы]\s*вызов/i.test(clean) ||
    /زر\s*استدعاء/i.test(clean) ||
    /ナースコール/i.test(clean) ||
    /呼叫铃/i.test(clean);

  if (!hasNurseCallKeyword) return false;

  // 2. Reject non-educational inquiries (questions about who called, accidental presses, or hardware defects)
  if (isNurseCallNonEducationalInquiry(normalized)) {
    return false;
  }

  // 3. Confirm active training / guidance intent
  const educationalGuidancePatterns = [
    // Invitation to call whenever needed / at any time
    /isteginiz\s*zaman\s*cagirabilirsiniz/i,
    /istediginiz\s*zaman\s*cagirabilirsiniz/i,
    /istediginiz\s*zaman\s*beni\s*cagir/i,
    /beni\s*istediginiz\s*zaman/i,
    /bizi\s*istediginiz\s*zaman/i,
    /istediginiz\s*zaman\s*bas/i,
    /her\s*zaman\s*cagirabilirsiniz/i,
    /her\s*zaman\s*basabilirsiniz/i,
    /ihtiyac(iniz)?\s*ol(ursa|dugunda|dugu\s*zaman)/i,
    /sikayet(iniz)?\s*ol(ursa|dugunda|dugu\s*zaman)/i,
    /agr(iniz)?\s*ol(ursa|dugunda|dugu\s*zaman)/i,
    /bir\s*sey\s*olursa/i,
    /bas\s*donmesi\s*olursa/i,
    /kalkma(dan)?\s*once\s*bas/i,
    /ayaga\s*kalkmadan\s*once/i,
    /yataktan\s*kalkmadan\s*once/i,
    /yardim\s*icin\s*bas/i,
    // Instructing how to operate the button
    /bu\s*sekilde\s*kullan/i,
    /su\s*sekilde\s*kullan/i,
    /nasil\s*kullanil/i,
    /nasil\s*kullanacag/i,
    /kullanmaniz\s*gerekiyor/i,
    /kullanacaksiniz/i,
    /kullanmalisiniz/i,
    /gostereyim/i,
    /ogreteyim/i,
    /anlatayim/i,
    /egitim/i,
    /tanitayim/i,
    /kullanimini/i,
    /nasil\s*calistigini/i,
    /butonu\s*kullanarak/i,
    /butona\s*basarak/i,
    /butona\s*bas(in|iniz|abilirsiniz)?/i,
    /zile\s*bas(in|iniz|abilirsiniz)?/i,
    /dugmeye\s*bas(in|iniz|abilirsiniz)?/i,
    /butonu\s*kullan(in|iniz|abilirsiniz)?/i,
    /bu\s*sizin\s*cagri\s*butonunuz/i,
    /buradaki\s*buton/i,
    /basucunuzdaki\s*buton/i,
    /yataginizin\s*yanindaki\s*buton/i,
    /kirmizi\s*butona\s*bas/i,
    /hemsire\s*cagirmak\s*icin/i,
    /bize\s*haber\s*vermek\s*icin/i,
    /haber\s*verin/i,
    /bizi\s*cagirin/i,
    // Multilingual instructions
    /press\s*(this|the)?\s*button/i,
    /whenever\s*you\s*need/i,
    /if\s*you\s*need\s*(any\s*)?help/i,
    /if\s*you\s*have\s*(any\s*)?pain/i,
    /to\s*call\s*(the\s*)?nurse/i,
    /feel\s*free\s*to\s*(press|call)/i,
    /before\s*getting\s*out\s*of\s*bed/i,
    /appuyez\s*sur\s*le\s*bouton/i,
    /si\s*vous\s*avez\s*mal/i,
    /drücken\s*sie\s*die\s*taste/i,
    /pulse\s*el\s*botón/i,
    /нажмите\s*на\s*кнопку/i,
  ];

  return educationalGuidancePatterns.some((pattern) => pattern.test(normalized));
}

/**
 * Checks if the utterance contains non-educational inquiry patterns for Triflow Device.
 */
function isTriflowNonEducationalInquiry(normalized: string): boolean {
  const inquiryPatterns = [
    // Questions about usage frequency / whether they are currently using it
    /kullaniyor\s*musunuz/i,
    /kullandiniz\s*mi/i,
    /en\s*son\s*ne\s*zaman\s*kullandiniz/i,
    /en\s*son\s*ne\s*zaman\s*cektiniz/i,
    /ne\s*zaman\s*yaptiniz/i,
    /ne\s*zaman\s*kullandiniz/i,
    /yaptiniz\s*mi/i,
    /cektiniz\s*mi/i,
    /kullanmadiniz\s*mi/i,
    /kac\s*kere\s*yaptiniz/i,
    /kac\s*defa\s*cektiniz/i,
    // Location / state inquiries
    /nerede/i,
    /cihaz\s*nerede/i,
    /triflow\s*nerede/i,
    /cihaziniz\s*nerede/i,
    /yaninizda\s*mi/i,
    /getirdiniz\s*mi/i,
    /var\s*mi/i,
    /yerinde\s*mi/i,
    /duruyor\s*mu/i,
    /aldiniz\s*mi/i,
    /verdiler\s*mi/i,
    /kutusu/i,
    /fiyati/i,
    // Damage / hygiene inquiries
    /temizlendi\s*mi/i,
    /yikandi\s*mi/i,
    /bozuldu\s*mu/i,
    /kirildi\s*mi/i,
    /arizali\s*mi/i,
    // Difficulty questions
    /zorlandiniz\s*mi/i,
    /yapabildiniz\s*mi/i,
    // Multilingual inquiries
    /do\s*you\s*use\s*(the\s*)?triflow/i,
    /are\s*you\s*using/i,
    /when\s*did\s*you\s*last\s*use/i,
    /have\s*you\s*used/i,
    /where\s*is\s*your\s*triflow/i,
    /where\s*is\s*the\s*device/i,
    /is\s*it\s*clean/i,
    /is\s*it\s*broken/i,
  ];

  return inquiryPatterns.some((pattern) => pattern.test(normalized));
}

/**
 * Checks if the utterance contains genuine educational training / usage guidance
 * for the Triflow Respiratory Exerciser (Solunum Egzersiz Cihazı).
 */
export function isTriflowEducationalTraining(text?: string | null): boolean {
  if (!text || typeof text !== 'string') return false;
  const clean = text.trim();
  if (clean.length < 5) return false;

  const normalized = normalizeText(clean);

  // 1. Topic presence check (Triflow / respiratory exercise device)
  const hasTriflowKeyword =
    /triflow/i.test(normalized) ||
    /tri-flow/i.test(normalized) ||
    /triflo/i.test(normalized) ||
    /traflov/i.test(normalized) ||
    /solunum\s*egzersiz/i.test(normalized) ||
    /nefes\s*egzersiz/i.test(normalized) ||
    /akciger\s*egzersiz/i.test(normalized) ||
    /insentif\s*spirometre/i.test(normalized) ||
    /spirometre/i.test(normalized) ||
    /toplu\s*solunum/i.test(normalized) ||
    /toplu\s*nefes/i.test(normalized) ||
    /incentive\s*spirometer/i.test(clean) ||
    /breathing\s*exerciser/i.test(clean) ||
    /respiratory\s*exerciser/i.test(clean) ||
    /atemtrainer/i.test(clean) ||
    /spiromètre/i.test(clean) ||
    /ejercitador\s*respiratorio/i.test(clean) ||
    // Combined breath + device pattern: "solunum cihazı" when in exercise context
    (/solunum\s*cihaz/i.test(normalized) &&
      (/egzersiz|top|cek|derin\s*nefes|ufle|agiz/i.test(normalized)));

  if (!hasTriflowKeyword) return false;

  // 2. Reject non-educational inquiries (questions about whether they used it, when, or where it is)
  if (isTriflowNonEducationalInquiry(normalized)) {
    return false;
  }

  // 3. Confirm active training / technique instruction intent
  const educationalGuidancePatterns = [
    // Demonstration & instruction phrases
    /bu\s*sekilde\s*kullan/i,
    /su\s*sekilde\s*kullan/i,
    /nasil\s*kullanil/i,
    /nasil\s*kullanacag/i,
    /kullanmaniz\s*gerekiyor/i,
    /kullanacaksiniz/i,
    /kullanmalisiniz/i,
    /gostereyim/i,
    /ogreteyim/i,
    /anlatayim/i,
    /egitim/i,
    /tanitayim/i,
    /kullanimini/i,
    /nasil\s*calistigini/i,
    // Mouthpiece and inhalation technique
    /agziniza\s*al(in|iniz|arak|ip)/i,
    /agizlig(i|ini)\s*kavrayin/i,
    /agziniza\s*yerlestirin/i,
    /derin\s*nefes\s*(al|cek)/i,
    /kuvvetlice\s*(nefes\s*)?(al|cek|icinize)/i,
    /icinize\s*cek(in|iniz|erek|eceksiniz)/i,
    /nefesinizi\s*icinize\s*cek/i,
    /nefes\s*cek(in|iniz|eceksiniz|meniz)/i,
    /kuvvetli\s*bir\s*sekilde\s*cek/i,
    // Ball lifting indicators
    /toplar(i|ini)?\s*kald(ir|irin|irmaya)/i,
    /uc\s*topu\s*da/i,
    /3\s*topu\s*da/i,
    /toplar(i)?\s*havada\s*tut/i,
    /toplar(i)?\s*yukari/i,
    /top\s*kalksin/i,
    // Frequency & therapeutic repetition instructions
    /saatte\s*bir\s*(kez|defa)?/i,
    /her\s*saat\s*basi/i,
    /gunde\s*\d+\s*(kez|defa)/i,
    /10\s*defa/i,
    /10\s*kez/i,
    /duzenli\s*(olarak\s*)?(cek|kullan|yap)/i,
    /tekrar\s*edin/i,
    /dinlenerek\s*yapin/i,
    // Clinical purpose: opening lungs after surgery
    /akcigerlerinizi\s*acmak\s*icin/i,
    /akcigerlerinizin\s*acilmasi\s*icin/i,
    /solunumu\s*acmak\s*icin/i,
    /nefesinizi\s*acmak\s*icin/i,
    /ameliyat\s*sonrasi\s*solunum/i,
    // Multilingual guidance
    /how\s*to\s*use\s*(the\s*)?(triflow|device|spirometer)/i,
    /inhale\s*deeply/i,
    /breathe\s*in\s*deeply/i,
    /put\s*(the\s*)?mouthpiece\s*in\s*your\s*mouth/i,
    /raise\s*the\s*(three\s*)?balls/i,
    /hold\s*the\s*balls\s*up/i,
    /use\s*it\s*every\s*hour/i,
    /repeat\s*10\s*times/i,
    /to\s*expand\s*your\s*lungs/i,
    /open\s*up\s*your\s*lungs/i,
    /inspirez\s*profondément/i,
    /faire\s*monter\s*les\s*balles/i,
    /tief\s*einatmen/i,
    /die\s*bälle\s*hochhalten/i,
    /inhale\s*profundamente/i,
    /elevar\s*las\s*bolas/i,
  ];

  return educationalGuidancePatterns.some((pattern) => pattern.test(normalized));
}

/**
 * Universal detector for medical tutorial videos.
 * Checks original utterance and optional translated text.
 */
export function detectMedicalTutorialVideo(
  text?: string | null,
  translatedText?: string | null
): MedicalTutorialResult {
  // 1. Check Triflow device training first
  if (isTriflowEducationalTraining(text) || isTriflowEducationalTraining(translatedText)) {
    return {
      shouldShow: true,
      type: 'triflow',
      videoUrl: TRIFLOW_VIDEO_URL,
      altVideoUrl: TRIFLOW_ALT_VIDEO_URL,
      title: 'Triflow Solunum Egzersiz Cihazı Eğitimi',
    };
  }

  // 2. Check Nurse Call Button training
  if (isNurseCallEducationalTraining(text) || isNurseCallEducationalTraining(translatedText)) {
    return {
      shouldShow: true,
      type: 'nurse_call',
      videoUrl: NURSE_CALL_VIDEO_URL,
      altVideoUrl: NURSE_CALL_ALT_VIDEO_URL,
      title: 'Hemşire Çağrı Butonu Kullanım Eğitimi',
    };
  }

  return {
    shouldShow: false,
    type: null,
  };
}

/**
 * Backward compatibility alias: checks if Nurse Call Button is mentioned with EDUCATIONAL intent.
 */
export function isNurseCallButtonMentioned(text?: string | null): boolean {
  return isNurseCallEducationalTraining(text);
}

import type { GeminiVoiceOption } from '../types/interpreter';

export const GEMINI_VOICE_OPTIONS: GeminiVoiceOption[] = [
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'female',
    tone: 'Bright, empathetic, natural',
    toneTr: 'Açık, şefkatli ve akıcı',
    descriptionTr: 'Doğal, canlı ve yüksek empatiye sahip kadın sesi. Hastane ortamında sakinleştirici ve sıcaktır.',
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'male',
    tone: 'Upbeat, friendly, warm',
    toneTr: 'Pozitif, samimi ve enerjik',
    descriptionTr: 'Dinamik, sıcak ve güven veren genç erkek sesi. Konuşmalarda anlaşılırlığı yüksektir.',
  },
  {
    id: 'Aoede',
    name: 'Aoede',
    gender: 'female',
    tone: 'Breezy, gentle, melodious',
    toneTr: 'Yumuşak, akıcı ve melodik',
    descriptionTr: 'Zarif, dinlendirici ve pürüzsüz kadın sesi. Duyguları en insansı şekilde aktarır.',
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'male',
    tone: 'Informative, deep, authoritative',
    toneTr: 'Derin, net ve profesyonel',
    descriptionTr: 'Olgun, tok ve güven veren erkek sesi. Klinik bilgileri son derece net duyurur.',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'male',
    tone: 'Engaging, expressive, crisp',
    toneTr: 'İfadeli, tok ve belirgin',
    descriptionTr: 'Güçlü artikülasyonlu, net ve canlı erkek sesi. Ses bozulmalarına karşı dirençlidir.',
  },
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'female',
    tone: 'Calm, soothing, composed',
    toneTr: 'Sakin, dingin ve dengeli',
    descriptionTr: 'Huzurlu, profesyonel ve tane tane konuşan dengeli kadın sesi.',
  },
];

export const DEFAULT_GEMINI_VOICE = 'Zephyr';

export type Speaker = 'nurse' | 'patient' | 'system';

export interface LanguageOption {
  code: string; // BCP-47 e.g. "ro", "zh", "it", "de", "en", "ru", "ar"
  name: string; // "Romanian", "Mandarin Chinese"
  nameTr: string; // "Romence", "Mandarin Çincesi"
  country: string; // "Romanya", "Çin"
  flag: string; // "🇷🇴", "🇨🇳"
}

export type ClinicalEntityType =
  | 'medication'       // İlaçlar (miligramı olmasa bile: Parol, Augmentin, Beloc, vb.)
  | 'allergy'          // Alerjiler (Penisilin, lateks, kontrast madde, gıda, vb.)
  | 'chronic_disease'  // Kronik hastalıklar (Diyabet, hipertansiyon, astım, vb.)
  | 'surgery'          // Geçirilmiş operasyonlar / ameliyatlar
  | 'vital_or_metric'  // Vitaller & fiziksel ölçümler (Boy, kilo, tansiyon, ateş, vb.)
  | 'habit'            // Yaşam tarzı (Sigara, alkol)
  | 'family_history'   // Aile öyküsü (Ailede kronik hastalık)
  | 'dosage';          // Dozaj bilgisi (500 mg, 2x1, vb.)

export interface HighlightedEntity {
  text: string;
  type: ClinicalEntityType;
  labelTr: string;
}

export interface LiveAnamnesisState {
  chiefComplaints: string[];         // Hastanın şikayetleri ve belirtileri
  patientNeedsAndRequests: string[]; // Hastanın özel istek ve ihtiyaçları (su, yastık, doktor vb.)
  medications: string[];             // İlaçlar (Parol, Augmentin, Beloc, vb.)
  allergies: string[];               // Doğrulanmış alerjiler (Penisilin, lateks, gıda vb.)
  chronicDiseases: string[];         // Kronik hastalıklar (Diyabet, hipertansiyon vb.)
  pastSurgeries: string[];           // Geçirilmiş gerçek operasyonlar (Apandisit, bypass vb.)
  habits: string[];                  // Sigara, alkol, yaşam tarzı
  familyHistory: string[];           // Aile öyküsü (Ailede kalp, diyabet vb.)
  clinicalInstructions: string[];    // Hemşirelik direktifleri & yapılacak işlemler
  vitalsAndMetrics?: string[];       // Opsiyonel
  lastUpdated: number;
}

export interface TranscriptMessage {
  id: string;
  speaker: Speaker;
  originalText: string;
  translatedText?: string;
  rawOriginalText?: string;
  timestamp: number;
  isInterim?: boolean;
  language?: string;
  highlightedDosages?: string[];
  highlightedEntities?: HighlightedEntity[];
  systemType?: 'language_change';
  showNurseCallTutorial?: boolean;
  nurseCallTutorialVideoUrl?: string;
  showTutorialVideo?: boolean;
  tutorialVideoType?: 'nurse_call' | 'triflow';
  tutorialVideoUrl?: string;
  tutorialVideoAltUrl?: string;
  tutorialVideoTitle?: string;
}

export type SessionState =
  | 'idle'
  | 'connecting'
  | 'waiting_for_language'
  | 'ready'
  | 'listening'
  | 'interpreting'
  | 'speaking'
  | 'interrupted'
  | 'error';

export interface ProviderError {
  code: string;
  message: string;
  fallbackAvailable?: boolean;
}

export type GeminiVoiceName = 'Zephyr' | 'Puck' | 'Aoede' | 'Charon' | 'Fenrir' | 'Kore';

export interface GeminiVoiceOption {
  id: GeminiVoiceName;
  name: string;
  gender: 'female' | 'male';
  tone: string;
  toneTr: string;
  descriptionTr: string;
}

export interface SessionConfig {
  targetLanguage?: LanguageOption;
  initialPromptCountry?: string;
  initialMuted?: boolean;
  voiceName?: GeminiVoiceName;
}

export interface ConversationSummary {
  briefSummaryTr: string;
  patientChiefComplaints: string[];
  patientNeedsAndRequests: string[];
  clinicalInstructions: string[];
  vitalSignsAndDosages: string[];
  actionItems: string[];
  targetLanguage: string;
  timestamp: number;
}

export interface ConversationHistoryItem {
  id: string;
  createdAt: number;
  targetLanguage: LanguageOption;
  messages: TranscriptMessage[];
  summary?: ConversationSummary | null;
  previewText: string;
  durationSeconds?: number;
}


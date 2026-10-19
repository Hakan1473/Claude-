import type { LanguageOption, SessionConfig, SessionState, TranscriptMessage, ProviderError } from '../../types/interpreter';

/** One spoken utterance and the live interpreter's answer to it. */
export interface LiveTurn {
  id: string;
  speaker: 'nurse' | 'patient';
  sourceText: string;
  translation: string;
  startedAt: number;
  lastInputAt: number;
  firstAudioAt: number | null;
  closedAt: number | null;
  /** The message shown in the conversation for this turn. */
  message: TranscriptMessage;
}

export interface ProviderCallbacks {
  onAudio?: (audioChunkBase64: string) => void;
  onTranscript?: (message: TranscriptMessage) => void;
  onInterimTranscript?: (text: string) => void;
  onStateChange?: (state: SessionState) => void;
  onLanguageDetected?: (language: LanguageOption) => void;
  onError?: (error: ProviderError) => void;
  onInterrupted?: () => void;
  onSpeakRequired?: (text: string, languageCode: string) => void;
  /** The turn changed (new words heard or translated). */
  onTurnUpdate?: (turn: LiveTurn) => void;
  /** The live model finished answering this turn. */
  onTurnClosed?: (turn: LiveTurn) => void;
}

export interface VoiceTranslationProvider {
  readonly name: string;
  readonly isConnected: boolean;
  
  startSession(config: SessionConfig, callbacks: ProviderCallbacks): Promise<void>;
  stopSession(): Promise<void>;
  sendAudio(base64Pcm16k: string): void;
  sendText(text: string): void;
  setTargetLanguage(language: LanguageOption): void;
  setVoice?(voiceName: string): void;
  interrupt(): void;
  resetTurnContext?(): void;
  /** Ignore any late live audio for this turn (it was already answered another way). */
  suppressTurnAudio?(turnId: string): void;
  /** Start a fresh live session with the same settings. */
  recalibrate?(reason: string): void;
}

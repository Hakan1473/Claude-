import type { LanguageOption, SessionConfig, SessionState, TranscriptMessage, ProviderError } from '../../types/interpreter';

export interface ProviderCallbacks {
  onAudio?: (audioChunkBase64: string) => void;
  onTranscript?: (message: TranscriptMessage) => void;
  onInterimTranscript?: (text: string) => void;
  onStateChange?: (state: SessionState) => void;
  onLanguageDetected?: (language: LanguageOption) => void;
  onError?: (error: ProviderError) => void;
  onInterrupted?: () => void;
  onSpeakRequired?: (text: string, languageCode: string) => void;
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
}

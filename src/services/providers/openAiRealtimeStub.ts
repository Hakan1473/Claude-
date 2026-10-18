import type { VoiceTranslationProvider, ProviderCallbacks } from './types';
import type { SessionConfig, LanguageOption } from '../../types/interpreter';

/**
 * Architectural stub for future OpenAI Realtime API integration
 * Allows swapping or adding OpenAI Realtime without altering UI layers.
 */
export class OpenAIRealtimeProvider implements VoiceTranslationProvider {
  public readonly name = 'OpenAI Realtime (Future Extension)';
  private callbacks: ProviderCallbacks = {};

  public get isConnected(): boolean {
    return false;
  }

  public async startSession(_config: SessionConfig, callbacks: ProviderCallbacks): Promise<void> {
    this.callbacks = callbacks;
    this.callbacks.onError?.({
      code: 'NOT_CONFIGURED',
      message: 'OpenAI Realtime modülü henüz yapılandırılmadı. Gemini Live aktif.',
    });
  }

  public async stopSession(): Promise<void> {
    this.callbacks.onStateChange?.('idle');
  }

  public sendAudio(_base64Pcm16k: string): void {}
  public sendText(_text: string): void {}
  public setTargetLanguage(_language: LanguageOption): void {}
  public interrupt(): void {}
}

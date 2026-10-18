import { useEffect, useRef, useState, type FC, useMemo } from 'react';
import type { TranscriptMessage } from '../types/interpreter';
import {
  Volume2,
  Loader2,
  Globe,
  Languages,
  Copy,
  Check,
  MessagesSquare,
  AudioLines,
  CornerDownRight,
} from 'lucide-react';
import { detectMedicalTutorialVideo } from '../utils/medicalTutorialDetection';
import { NurseCallVideoCard } from './NurseCallVideoCard';
import { playNormalizedAudioWav, stopNormalizedAudio } from '../services/audio/pcmHelper';
import { normalizeTranscriptText } from '../utils/medicalEntityExtractor';

interface TranscriptViewProps {
  messages: TranscriptMessage[];
  interimText?: string;
  targetLanguageName?: string;
  targetLanguageCode?: string;
  onUpdateMessage?: (msg: TranscriptMessage) => void;
  onGenerateSummary?: () => void;
  dialogueMessagesCount?: number;
  selectedVoice?: string;
}

export const TranscriptView: FC<TranscriptViewProps> = ({
  messages,
  interimText,
  targetLanguageName = 'Hasta Dili',
  targetLanguageCode = 'en',
  onUpdateMessage,
  selectedVoice = 'Zephyr',
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [translatingMsgId, setTranslatingMsgId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  // Incremented on every play/stop so a slow TTS response can't resurrect a cancelled playback
  const playbackTokenRef = useRef(0);

  // Normalize messages text cleanly
  const preparedMessages = useMemo(() => {
    return messages.map((m) => {
      if (m.speaker === 'system') return m;
      const cleanOrig = normalizeTranscriptText(m.originalText, m.language);
      const cleanTrans = m.translatedText
        ? normalizeTranscriptText(m.translatedText, m.speaker === 'nurse' ? targetLanguageCode : 'tr')
        : undefined;

      return {
        ...m,
        originalText: cleanOrig,
        translatedText: cleanTrans,
      };
    });
  }, [messages, targetLanguageCode]);

  useEffect(() => {
    if (messages.length >= 0 && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: interimText ? 'auto' : 'smooth' });
    }
  }, [messages, interimText]);

  // Clean up any ongoing audio playback on unmount
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      stopNormalizedAudio();
    };
  }, []);

  // Copy text helper
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  // On-demand manual translation for this specific balloon
  const handleTranslate = async (msg: TranscriptMessage) => {
    if (translatingMsgId === msg.id) return;
    setTranslatingMsgId(msg.id);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: msg.originalText,
          targetLanguage: targetLanguageName,
          speaker: msg.speaker,
        }),
      });

      if (res.ok) {
        const transData = await res.json();
        const translatedText = transData.translatedText
          ? normalizeTranscriptText(transData.translatedText)
          : undefined;
        const resolvedSpeaker =
          transData.speaker === 'nurse' || transData.speaker === 'patient'
            ? transData.speaker
            : msg.speaker;

        if (translatedText && onUpdateMessage) {
          onUpdateMessage({
            ...msg,
            speaker: resolvedSpeaker,
            translatedText,
          });
        }
      }
    } catch (err) {
      console.error('Manual translate error:', err);
    } finally {
      setTranslatingMsgId(null);
    }
  };

  // Replay speech audio aloud on demand
  const stopAllPlayback = () => {
    playbackTokenRef.current += 1;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    stopNormalizedAudio();
  };

  const handleReplay = async (msg: TranscriptMessage, forceOriginal = false) => {
    if (playingMsgId === msg.id) {
      stopAllPlayback();
      setPlayingMsgId(null);
      return;
    }

    stopAllPlayback();
    const token = playbackTokenRef.current;

    let textToSpeak = '';
    let langToSpeak = '';

    if (forceOriginal) {
      textToSpeak = msg.originalText;
      langToSpeak = msg.speaker === 'nurse' ? 'tr-TR' : targetLanguageCode;
    } else if (msg.translatedText) {
      textToSpeak = msg.translatedText;
      langToSpeak = msg.speaker === 'nurse' ? targetLanguageCode : 'tr-TR';
    } else {
      textToSpeak = msg.originalText;
      langToSpeak = msg.speaker === 'nurse' ? 'tr-TR' : targetLanguageCode;
    }

    if (!textToSpeak.trim()) return;

    setPlayingMsgId(msg.id);

    // Try high-definition Gemini Live TTS API first
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          languageCode: langToSpeak,
          voiceName: selectedVoice || 'Zephyr',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // The TTS endpoint responds with { audio: <base64 WAV> }
        if (token !== playbackTokenRef.current) return;
        if (data.audio) {
          // Let stopNormalizedAudio()'s short interruption window pass before playing
          await new Promise((r) => setTimeout(r, 120));
          if (token !== playbackTokenRef.current) return;
          await playNormalizedAudioWav(data.audio);
          if (token === playbackTokenRef.current) setPlayingMsgId(null);
          return;
        }
      }
    } catch {
      // Fallback below
    }

    if (token !== playbackTokenRef.current) return;

    // Web Speech API Browser Fallback
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = langToSpeak;
      utterance.volume = 1.0;
      utterance.rate = 1.0;
      utterance.onend = () => {
        setPlayingMsgId(null);
      };
      utterance.onerror = () => {
        setPlayingMsgId(null);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setPlayingMsgId(null);
    }
  };

  if (messages.length === 0 && !interimText) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 text-center select-none anim-fade">
        <div className="w-14 h-14 rounded-full bg-accent-soft text-accent flex items-center justify-center mb-4">
          <MessagesSquare className="w-6 h-6" strokeWidth={2} />
        </div>
        <p className="text-[17px] font-semibold tracking-[-0.022em] text-label mb-1">Canlı Konuşma</p>
        <p className="text-[14px] text-label-2 max-w-[280px] leading-relaxed">
          Konuşulan tüm cümleler, çevirileriyle birlikte burada yazılı olarak listelenir.
        </p>
      </div>
    );
  }

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3 sm:px-5 md:px-6 py-3 md:py-5 space-y-3 md:space-y-4 overscroll-contain">
        {preparedMessages.map((msg) => {
          // System message divider
          if (msg.speaker === 'system') {
            return (
              <div key={msg.id} className="flex items-center justify-center gap-1.5 py-1.5 select-none anim-fade">
                <Globe className="w-3.5 h-3.5 text-label-3 shrink-0" strokeWidth={2} />
                <span className="text-[12px] font-medium text-label-2">{msg.originalText}</span>
                <span className="text-[12px] text-label-3 tabular">· {formatTime(msg.timestamp)}</span>
              </div>
            );
          }

          const isNurse = msg.speaker === 'nurse';
          const isPlaying = playingMsgId === msg.id;
          const isTranslating = translatingMsgId === msg.id;
          const isCopied = copiedId === `trans-${msg.id}`;

          return (
            <article
              key={msg.id}
              className={`anim-rise sm:max-w-[90%] md:max-w-[88%] rounded-[20px] p-4 md:p-5 ${
                isNurse ? 'sm:ml-auto bg-surface-2' : 'sm:mr-auto bg-accent-soft'
              }`}
            >
              {/* Speaker, time & actions */}
              <header className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-1.5 min-w-0 text-[12px] md:text-[13px]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${isNurse ? 'bg-sys-gray' : 'bg-accent'}`}
                  />
                  <span className={`font-semibold truncate ${isNurse ? 'text-label-2' : 'text-accent-ink'}`}>
                    {isNurse ? 'Hemşire' : 'Hasta'}
                    <span className="hidden sm:inline font-medium"> · {isNurse ? 'Türkçe' : targetLanguageName}</span>
                  </span>
                  <span className="text-label-3 tabular shrink-0">{formatTime(msg.timestamp)}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleReplay(msg)}
                    title={isPlaying ? 'Durdur' : 'Sesli Dinle'}
                    aria-label="Sesli Dinle"
                    aria-pressed={isPlaying}
                    className={`pressable w-8 h-8 rounded-full flex items-center justify-center cursor-pointer ${
                      isPlaying ? 'btn-primary' : 'bg-surface text-label hover:text-accent shadow-card'
                    }`}
                  >
                    {isPlaying ? (
                      <AudioLines className="w-4 h-4 animate-pulse" strokeWidth={2.25} />
                    ) : (
                      <Volume2 className="w-4 h-4" strokeWidth={2} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTranslate(msg)}
                    disabled={isTranslating}
                    title={isNurse ? `${targetLanguageName} diline çevir` : "Türkçe'ye çevir"}
                    aria-label="Çevir"
                    className="pressable h-8 pl-2.5 pr-3 rounded-full inline-flex items-center gap-1.5 text-[13px] font-medium cursor-pointer bg-surface text-accent-ink shadow-card hover:brightness-[0.98] disabled:opacity-70"
                  >
                    {isTranslating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.25} />
                    ) : (
                      <Languages className="w-3.5 h-3.5" strokeWidth={2.25} />
                    )}
                    <span>{isTranslating ? 'Çevriliyor' : 'Çevir'}</span>
                  </button>
                </div>
              </header>

              {/* Original spoken text */}
              <p className="text-[17px] sm:text-[18px] md:text-[20px] leading-[1.4] tracking-[-0.018em] text-label font-normal">
                {msg.originalText}
              </p>

              {/* Translation */}
              {msg.translatedText ? (
                <div className="mt-3 pt-3 hairline-t">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[12px] font-medium text-label-2 inline-flex items-center gap-1">
                      <CornerDownRight className="w-3.5 h-3.5" strokeWidth={2} />
                      Çeviri · {isNurse ? targetLanguageName : 'Türkçe'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(msg.translatedText || '', `trans-${msg.id}`)}
                      title="Çeviriyi Kopyala"
                      aria-label="Çeviriyi Kopyala"
                      className={`pressable h-7 px-2 rounded-full inline-flex items-center gap-1 text-[12px] font-medium cursor-pointer hover:bg-fill ${
                        isCopied ? 'text-sys-green' : 'text-label-2'
                      }`}
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                      ) : (
                        <Copy className="w-3.5 h-3.5" strokeWidth={2} />
                      )}
                      <span>{isCopied ? 'Kopyalandı' : 'Kopyala'}</span>
                    </button>
                  </div>
                  <p
                    className={`text-[16px] sm:text-[17px] md:text-[18px] leading-[1.45] tracking-[-0.012em] ${
                      isNurse ? 'text-accent-ink' : 'text-label'
                    } font-medium`}
                  >
                    {msg.translatedText}
                  </p>
                </div>
              ) : (
                <p className="mt-3 pt-3 hairline-t text-[13px] text-label-3">
                  {isNurse
                    ? `${targetLanguageName} yazılı çevirisi için Çevir'e dokunun`
                    : "Türkçe yazılı çevirisi için Çevir'e dokunun"}
                </p>
              )}

              {/* Embedded educational reference video (nurse call button or Triflow device) */}
              {(() => {
                const tutorial = detectMedicalTutorialVideo(msg.originalText, msg.translatedText);
                const shouldShow =
                  msg.showTutorialVideo ||
                  Boolean(msg.showNurseCallTutorial) ||
                  tutorial.shouldShow;

                if (!shouldShow) return null;

                const videoUrl =
                  msg.tutorialVideoUrl ||
                  tutorial.videoUrl ||
                  msg.nurseCallTutorialVideoUrl ||
                  '/nurse-call-button-guide.mp4';

                const altVideoUrl =
                  msg.tutorialVideoAltUrl ||
                  tutorial.altVideoUrl;

                return (
                  <NurseCallVideoCard
                    videoUrl={videoUrl}
                    altVideoUrl={altVideoUrl}
                    title={tutorial.title || msg.tutorialVideoTitle}
                  />
                );
              })()}
            </article>
          );
        })}

        {/* Interim / streaming speech */}
        {interimText && (
          <div className="sm:max-w-[90%] md:max-w-[88%] rounded-[20px] p-4 border border-dashed border-separator anim-fade">
            <div className="flex items-center gap-2 mb-1.5 text-[12px] font-semibold text-sys-orange">
              <span className="flex items-center gap-[3px]" aria-hidden="true">
                <span className="w-1 h-1 rounded-full bg-current anim-dot" />
                <span className="w-1 h-1 rounded-full bg-current anim-dot" style={{ animationDelay: '0.15s' }} />
                <span className="w-1 h-1 rounded-full bg-current anim-dot" style={{ animationDelay: '0.3s' }} />
              </span>
              <span>Dinleniyor</span>
            </div>
            <p className="text-[17px] leading-[1.4] tracking-[-0.018em] shimmer-text">{interimText}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

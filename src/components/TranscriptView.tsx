import { useEffect, useRef, useState, type FC, useMemo } from 'react';
import type { TranscriptMessage } from '../types/interpreter';
import {
  ArrowRight,
  Volume2,
  Loader2,
  Globe,
  Sparkles,
  Languages,
  Copy,
  Check,
} from 'lucide-react';
import { detectMedicalTutorialVideo } from '../utils/medicalTutorialDetection';
import { NurseCallVideoCard } from './NurseCallVideoCard';
import { playNormalizedAudioWav } from '../services/audio/pcmHelper';
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
  const handleReplay = async (msg: TranscriptMessage, forceOriginal = false) => {
    if (playingMsgId === msg.id) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setPlayingMsgId(null);
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

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
        if (data.audioContent) {
          await playNormalizedAudioWav(data.audioContent);
          setPlayingMsgId(null);
          return;
        }
      }
    } catch {
      // Fallback below
    }

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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500 select-none animate-in fade-in duration-300">
        <div className="w-14 h-14 rounded-2xl liquid-glass-panel flex items-center justify-center mb-3 shadow-sm border border-white/60 dark:border-white/10">
          <Sparkles className="w-6 h-6 text-teal-600 dark:text-teal-400" />
        </div>
        <p className="text-xs uppercase tracking-wider font-bold text-slate-800 dark:text-slate-200 mb-1">
          Canlı Konuşma
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
          Konuşulan tüm cümleler hatasız şekilde yazılı olarak bu alanda listelenir.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3.5 sm:px-5 md:px-6 py-3 md:py-4 space-y-3 sm:space-y-4 md:space-y-4.5 font-sans overscroll-contain">
        {preparedMessages.map((msg) => {
          // System message divider
          if (msg.speaker === 'system') {
            return (
              <div
                key={msg.id}
                className="flex items-center justify-center my-3 select-none animate-in fade-in zoom-in-95 duration-200"
              >
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full liquid-glass-pill shadow-xs">
                  <Globe className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                    {msg.originalText}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          }

          const isNurse = msg.speaker === 'nurse';
          const isPlaying = playingMsgId === msg.id;
          const isTranslating = translatingMsgId === msg.id;

          return (
            <div
              key={msg.id}
              className={`p-3.5 sm:p-4.5 md:p-5 rounded-2xl md:rounded-3xl transition-all duration-200 relative ${
                isNurse
                  ? 'liquid-glass-bubble-nurse text-slate-900 dark:text-slate-100'
                  : 'liquid-glass-bubble-patient text-slate-900 dark:text-slate-100'
              }`}
            >
              {/* Header: Clean unboxed metadata & Action Buttons */}
              <div className="flex items-center justify-between gap-2 mb-2 md:mb-2.5">
                <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                  <span
                    className={`tracking-tight text-[11px] md:text-xs uppercase ${
                      isNurse
                        ? 'text-slate-600 dark:text-slate-300 font-semibold'
                        : 'text-teal-900 dark:text-teal-200 font-extrabold flex items-center gap-1'
                    }`}
                  >
                    {!isNurse && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-teal-400 shrink-0" />}
                    {isNurse ? 'Hemşire (Türkçe)' : `Hasta (${targetLanguageName})`}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600 font-normal">·</span>
                  <span className="text-[10px] md:text-[11px] text-slate-400 dark:text-slate-400 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Action Buttons Capsule */}
                <div className="flex items-center gap-1.5 md:gap-2">
                  {/* Audio Speaker Button */}
                  <button
                    type="button"
                    onClick={() => handleReplay(msg)}
                    title="Sesli Dinle"
                    aria-label="Sesli Dinle"
                    className={`p-1.5 md:p-2 rounded-full transition-all duration-200 select-none cursor-pointer active:scale-95 shadow-xs flex items-center justify-center ${
                      isPlaying
                        ? 'liquid-glass-emerald text-white animate-pulse ring-2 ring-emerald-400/50'
                        : 'liquid-glass-btn text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>

                  {/* Single Translate Button */}
                  <button
                    type="button"
                    onClick={() => handleTranslate(msg)}
                    disabled={isTranslating}
                    title={isNurse ? `${targetLanguageName} diline çevir` : "Türkçe'ye çevir"}
                    aria-label="Çevir"
                    className={`flex items-center gap-1 md:gap-1.5 px-2.5 md:px-3.5 py-1 md:py-1.5 rounded-full transition-all duration-200 text-xs md:text-sm font-semibold select-none cursor-pointer active:scale-95 shadow-xs ${
                      isTranslating
                        ? 'liquid-glass-pill text-teal-700 dark:text-teal-300 animate-pulse'
                        : 'liquid-glass-btn text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-300'
                    }`}
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin text-teal-600 dark:text-teal-400" />
                        <span>Çevriliyor...</span>
                      </>
                    ) : (
                      <>
                        <Languages className="w-3.5 h-3.5 md:w-4 md:h-4 text-teal-600 dark:text-teal-400" />
                        <span>Çevir</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Original Spoken Text (Pure, natural and highly legible) */}
              <p className="text-base sm:text-lg md:text-xl text-slate-900 dark:text-slate-100 font-medium leading-snug md:leading-relaxed">
                {msg.originalText}
              </p>

              {/* Translation Text */}
              {msg.translatedText ? (
                <div className="mt-3 md:mt-3.5 pt-3 md:pt-3.5 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div
                      className={`flex items-center gap-1.5 text-[10px] md:text-xs uppercase font-bold tracking-wider ${
                        isNurse
                          ? 'text-slate-600 dark:text-slate-400'
                          : 'text-teal-800 dark:text-teal-300 font-extrabold'
                      }`}
                    >
                      <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span>{isNurse ? `ÇEVİRİ (${targetLanguageName})` : 'ÇEVİRİ (Türkçe)'}</span>
                    </div>

                    {/* Copy action */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.translatedText || '', `trans-${msg.id}`)}
                        title="Çeviriyi Kopyala"
                        aria-label="Çeviriyi Kopyala"
                        className="flex items-center gap-1 px-2 md:px-2.5 py-0.5 md:py-1 rounded-lg text-[10px] md:text-xs font-medium liquid-glass-btn text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        {copiedId === `trans-${msg.id}` ? (
                          <>
                            <Check className="w-3 h-3 md:w-3.5 md:h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-600 dark:text-emerald-400">Kopyalandı</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            <span>Kopyala</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div
                    className={`p-3 sm:p-3.5 md:p-4 rounded-xl md:rounded-2xl liquid-glass-panel ${
                      isNurse ? 'border border-slate-200/60 dark:border-slate-700/60' : 'border border-teal-500/30'
                    }`}
                  >
                    <p className="text-sm sm:text-base md:text-lg text-slate-900 dark:text-teal-100 font-normal leading-relaxed">
                      {msg.translatedText}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-3 pt-2.5 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                  <span className="text-[11px] md:text-xs italic">
                    {isNurse
                      ? `${targetLanguageName} yazılı çevirisi için Çevir butonuna dokunun`
                      : "Türkçe yazılı çevirisi için Çevir butonuna dokunun"}
                  </span>
                </div>
              )}

              {/* Embedded Educational Reference Video (Nurse Call Button or Triflow Device) */}
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
            </div>
          );
        })}

        {/* Interim / Streaming in-progress speech with shimmer */}
        {interimText && (
          <div className="p-3.5 rounded-2xl liquid-glass-card border border-amber-500/30 text-amber-900 dark:text-amber-200 animate-pulse">
            <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold tracking-wider text-amber-800 dark:text-amber-400 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-ping" />
              <span>Dinleniyor...</span>
            </div>
            <p className="text-sm sm:text-base italic pl-1 text-amber-950 dark:text-amber-100">
              "{interimText}"
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

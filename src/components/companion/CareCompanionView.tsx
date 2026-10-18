import { useState, useEffect, useRef, type FC } from 'react';
import {
  Mic,
  Square,
  Volume2,
  Bell,
  Sparkles,
  Heart,
  Bed,
  Globe,
  Loader2,
  FileText,
} from 'lucide-react';
import type { CompanionMessage, NurseAlert, CompanionReport } from '../../types/companion';
import {
  sendCompanionMessage,
  fetchInitialGreeting,
  generateSessionReport,
  fetchNurseAlerts,
  updateAlertStatus,
  playBase64Audio,
} from '../../services/companionService';
import { NurseAlertsModal } from './NurseAlertsModal';
import { CompanionReportModal } from './CompanionReportModal';

type CompanionStatus = 'idle' | 'greeting' | 'listening' | 'thinking' | 'speaking' | 'finishing';

interface CompanionSpeechEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
}

interface CompanionSpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: CompanionSpeechEvent) => void) | null;
  onerror: ((err: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const waveformBars = [
  { id: 'wb-1', multiplier: 0.25 },
  { id: 'wb-2', multiplier: 0.45 },
  { id: 'wb-3', multiplier: 0.7 },
  { id: 'wb-4', multiplier: 0.95 },
  { id: 'wb-5', multiplier: 1.0 },
  { id: 'wb-6', multiplier: 0.95 },
  { id: 'wb-7', multiplier: 0.7 },
  { id: 'wb-8', multiplier: 0.45 },
  { id: 'wb-9', multiplier: 0.25 },
];

export const CareCompanionView: FC = () => {
  const [status, setStatus] = useState<CompanionStatus>('idle');
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [currentSpeechText, setCurrentSpeechText] = useState<string>('');
  const [detectedLangInfo, setDetectedLangInfo] = useState<{ name: string; flag: string }>({
    name: 'Otomatik Algılama',
    flag: '🌐',
  });

  const [patientRoom] = useState('Oda 204');
  const [patientName] = useState('Misafir Hasta');

  // Report & Nurse alerts state
  const [generatedReport, setGeneratedReport] = useState<CompanionReport | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [alerts, setAlerts] = useState<NurseAlert[]>([]);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);

  // Audio simulation level for visualizer
  const [audioLevel, setAudioLevel] = useState(0);

  const recognitionRef = useRef<CompanionSpeechRecognitionInstance | null>(null);
  const isSessionActiveRef = useRef(false);
  const messagesRef = useRef<CompanionMessage[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleUserSpeechFinishedRef = useRef<((text: string) => Promise<void>) | null>(null);

  // Sync ref
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Load nurse alerts
  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const data = await fetchNurseAlerts();
        setAlerts(data);
      } catch (_e) {}
    };
    loadAlerts();
    const interval = setInterval(loadAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  // Web Speech Recognition setup
  useEffect(() => {
    const speechWindow = window as unknown as {
      SpeechRecognition?: new () => CompanionSpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => CompanionSpeechRecognitionInstance;
    };
    const SpeechRecognitionClass =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) return;

    try {
      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'tr-TR'; // Can also capture multiple languages via browser

      rec.onresult = (event: CompanionSpeechEvent) => {
        if (!isSessionActiveRef.current) return;

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const spoken = (final || interim).trim();
        if (spoken) {
          setCurrentSpeechText(spoken);
          setAudioLevel(0.65);

          // Voice activity turn detection: wait 1.4s of silence after speech before triggering AI reply
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (spoken.length >= 2 && isSessionActiveRef.current) {
              handleUserSpeechFinishedRef.current?.(spoken);
            }
          }, 1400);
        }
      };

      rec.onerror = (err: { error?: string }) => {
        console.warn('Speech recognition status:', err?.error);
      };

      rec.onend = () => {
        // Auto restart microphone if session is active and not currently speaking
        if (isSessionActiveRef.current && status === 'listening') {
          try {
            rec.start();
          } catch (_e) {}
        }
      };

      recognitionRef.current = rec;
    } catch (e) {
      console.warn('SpeechRecognition init error:', e);
    }

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        recognitionRef.current?.stop();
      } catch (_e) {}
    };
  }, [status]);

  // Audio level decay animation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (status === 'speaking') {
      interval = setInterval(() => {
        setAudioLevel(0.3 + Math.random() * 0.6);
      }, 100);
    } else if (status === 'listening') {
      interval = setInterval(() => {
        setAudioLevel((prev) => Math.max(0.04, prev * 0.85));
      }, 100);
    } else {
      setAudioLevel(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  // Start voice conversation
  const handleStartSession = async () => {
    isSessionActiveRef.current = true;
    setStatus('greeting');
    setCurrentSpeechText('');

    try {
      // 1. Fetch opening greeting audio
      const greeting = await fetchInitialGreeting();
      const initialMsg: CompanionMessage = {
        id: `cmp-greet-${Date.now()}`,
        sender: 'companion',
        text: greeting.text,
        timestamp: Date.now(),
        detectedLanguage: 'Türkçe',
        detectedLanguageCode: 'tr',
        detectedLanguageFlag: '🇹🇷',
      };
      setMessages([initialMsg]);

      // 2. Speak greeting aloud
      if (greeting.audioBase64) {
        setStatus('speaking');
        await playBase64Audio(greeting.audioBase64);
      }

      // 3. Immediately transition to listening to user
      if (isSessionActiveRef.current) {
        startListeningToUser();
      }
    } catch (e) {
      console.error('Greeting error:', e);
      if (isSessionActiveRef.current) {
        startListeningToUser();
      }
    }
  };

  const startListeningToUser = () => {
    setStatus('listening');
    setCurrentSpeechText('');
    try {
      recognitionRef.current?.start();
    } catch (_e) {}
  };

  // Called when user finishes their spoken sentence
  const handleUserSpeechFinished = async (spokenText: string) => {
    if (!isSessionActiveRef.current || status === 'thinking' || status === 'speaking') return;

    try {
      recognitionRef.current?.stop();
    } catch (_e) {}

    const patientMsg: CompanionMessage = {
      id: `usr-${Date.now()}`,
      sender: 'patient',
      text: spokenText,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messagesRef.current, patientMsg];
    setMessages(updatedMessages);
    setCurrentSpeechText(spokenText);
    setStatus('thinking');

    try {
      const response = await sendCompanionMessage({
        message: spokenText,
        history: updatedMessages,
        roomNumber: patientRoom,
        patientName,
      });

      const companionMsg: CompanionMessage = {
        id: `cmp-${Date.now()}`,
        sender: 'companion',
        text: response.replyText,
        audioBase64: response.audioBase64 || undefined,
        detectedLanguage: response.detectedLanguage,
        detectedLanguageCode: response.detectedLanguageCode,
        detectedLanguageFlag: response.detectedLanguageFlag,
        timestamp: Date.now(),
        analysis: response.analysis,
      };

      setMessages((prev) => [...prev, companionMsg]);
      setDetectedLangInfo({
        name: response.detectedLanguage,
        flag: response.detectedLanguageFlag,
      });

      // Speak AI response aloud
      if (isSessionActiveRef.current && response.audioBase64) {
        setStatus('speaking');
        await playBase64Audio(response.audioBase64);
      }

      // Next turn: resume listening if session is still active
      if (isSessionActiveRef.current) {
        startListeningToUser();
      }
    } catch (err: unknown) {
      console.error('Conversation turn error:', err);
      setStatus('listening');
    }
  };

  handleUserSpeechFinishedRef.current = handleUserSpeechFinished;

  // End voice conversation -> generate clinical report and dispatch to nurse
  const handleStopSession = async () => {
    isSessionActiveRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    try {
      recognitionRef.current?.stop();
    } catch (_e) {}

    setStatus('finishing');

    try {
      const currentHistory = messagesRef.current;
      const report = await generateSessionReport({
        history: currentHistory,
        roomNumber: patientRoom,
        patientName,
      });

      setGeneratedReport(report);
      setIsReportModalOpen(true);

      // Refresh alerts list
      const freshAlerts = await fetchNurseAlerts();
      setAlerts(freshAlerts);
    } catch (e) {
      console.error('Report generation error:', e);
    } finally {
      setStatus('idle');
      setCurrentSpeechText('');
    }
  };

  const pendingAlertsCount = alerts.filter((a) => a.status === 'pending').length;
  const isActive = status !== 'idle';

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden max-w-2xl w-full mx-auto px-2 sm:px-4 py-2">
      {/* Top Patient Room & Nurse Panel Bar */}
      <div className="shrink-0 bg-white/90 dark:bg-[#0E1524]/90 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-2xs">
            <Heart className="w-4 h-4 fill-teal-500 text-teal-500" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                <Bed className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                {patientRoom}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {patientName}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Globe className="w-3 h-3 text-teal-600 dark:text-teal-400" />
              <span>{detectedLangInfo.flag} {detectedLangInfo.name}</span>
            </p>
          </div>
        </div>

        {/* Right: Nurse Alerts Trigger & Past Reports */}
        <div className="flex items-center gap-1.5">
          {generatedReport && (
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800/80 text-teal-800 dark:text-teal-300 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="hidden sm:inline">Son Rapor</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAlertsModalOpen(true)}
            className="relative flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            title="Hemşire Bildirim Paneli"
            aria-label="Hemşire Bildirim Paneli"
          >
            <Bell className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span className="hidden sm:inline">Hemşire İstasyonu</span>
            {pendingAlertsCount > 0 && (
              <span className="ml-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                {pendingAlertsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Centerpiece: Interactive Voice Push Button & Equalizer */}
      <section className="shrink-0 py-3 flex flex-col items-center justify-center select-none">
        <div className="relative flex items-center justify-center">
          {/* Ambient Glowing Aura */}
          {isActive && (
            <div
              style={{
                transform: `scale(${1 + audioLevel * 0.3})`,
                opacity: 0.35 + audioLevel * 0.45,
              }}
              className={`absolute -inset-6 rounded-full blur-2xl transition-transform duration-100 ease-out pointer-events-none ${
                status === 'speaking'
                  ? 'bg-cyan-500/40 dark:bg-cyan-500/35'
                  : status === 'thinking'
                  ? 'bg-amber-400/40 dark:bg-amber-500/35'
                  : 'bg-emerald-500/40 dark:bg-emerald-400/35'
              }`}
            />
          )}

          {/* Central Button */}
          <button
            type="button"
            onClick={isActive ? handleStopSession : handleStartSession}
            disabled={status === 'finishing'}
            className={`relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 ease-out transform active:scale-95 focus:outline-none cursor-pointer ${
              isActive
                ? 'bg-gradient-to-b from-rose-500 via-rose-600 to-rose-700 text-white shadow-[0_12px_28px_-6px_rgba(244,63,94,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[0_0_35px_rgba(244,63,94,0.45)] ring-1 ring-rose-400/50'
                : 'bg-gradient-to-b from-emerald-500 via-teal-500 to-teal-600 text-white shadow-[0_14px_30px_-6px_rgba(16,185,129,0.42),inset_0_1px_1px_rgba(255,255,255,0.45)] dark:shadow-[0_0_35px_rgba(16,185,129,0.4)] ring-1 ring-emerald-400/50 hover:brightness-105'
            }`}
          >
            {status === 'finishing' ? (
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            ) : status === 'speaking' ? (
              <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
                <Volume2 className="w-8 h-8 animate-bounce text-white drop-shadow-sm mb-1" />
                <span className="text-[10px] font-bold tracking-wider uppercase text-white">
                  Konuşuyor
                </span>
              </div>
            ) : status === 'thinking' ? (
              <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
                <Loader2 className="w-8 h-8 animate-spin text-white drop-shadow-sm mb-1" />
                <span className="text-[10px] font-bold tracking-wider uppercase text-white">
                  Düşünüyor
                </span>
              </div>
            ) : isActive ? (
              <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
                <Square className="w-7 h-7 text-white fill-white drop-shadow-sm mb-1" />
                <span className="text-[10px] font-bold tracking-wider uppercase text-white">
                  Sohbeti Bitir
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
                <Mic className="w-8 h-8 sm:w-9 sm:h-9 text-white drop-shadow-sm mb-1" />
                <span className="text-[10px] font-bold tracking-wider uppercase text-white">
                  Sohbeti Başlat
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Voice Waveform Equalizer (Zero layout shift, fixed height) */}
        <div className="w-full h-8 flex items-center justify-center my-1.5 shrink-0 overflow-hidden">
          {isActive ? (
            <div className="h-7 flex items-center gap-1 px-3.5 rounded-full bg-white/80 dark:bg-[#121A2A]/80 backdrop-blur-sm border border-slate-200/70 dark:border-slate-800 shadow-2xs animate-in fade-in duration-150">
              {waveformBars.map((bar) => {
                const baseHeight = 3;
                const dynamicHeight = Math.min(18, Math.round(baseHeight + bar.multiplier * (audioLevel * 16 + 1)));
                return (
                  <span
                    key={bar.id}
                    style={{
                      height: `${dynamicHeight}px`,
                      transform: status === 'speaking' ? 'scaleY(1.2)' : undefined,
                    }}
                    className={`w-1 rounded-full transition-all duration-75 ease-out ${
                      status === 'speaking'
                        ? 'bg-cyan-500 dark:bg-cyan-400'
                        : status === 'thinking'
                        ? 'bg-amber-500 dark:bg-amber-400'
                        : 'bg-emerald-500 dark:bg-emerald-400'
                    }`}
                  />
                );
              })}
            </div>
          ) : (
            <div className="h-7 flex items-center gap-1 px-3 rounded-full opacity-40">
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>
          )}
        </div>

        {/* Status Indicator Title & Subtitle */}
        <div className="text-center px-4 max-w-sm shrink-0">
          <div className="inline-flex items-center justify-center gap-1.5 mb-0.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status === 'speaking'
                  ? 'bg-cyan-500 animate-ping'
                  : status === 'thinking'
                  ? 'bg-amber-400 animate-pulse'
                  : status === 'listening'
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-teal-500'
              }`}
            />
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {status === 'speaking'
                ? 'Yapay Zeka Konuşuyor'
                : status === 'thinking'
                ? 'Cevap Hazırlanıyor...'
                : status === 'listening'
                ? 'Sizi Dinliyor (Konuşabilirsiniz)'
                : status === 'greeting'
                ? 'Asistan Başlatılıyor...'
                : status === 'finishing'
                ? 'Görüşme Özeti Hazırlanıyor...'
                : 'Sesli Sohbeti Başlatın'}
            </p>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {isActive
              ? 'Sohbet bittiğinde butona tekrar basarak hemşireye özet rapor iletebilirsiniz'
              : 'Yapay zeka sesli olarak "Merhabalar, size nasıl yardımcı olabilirim?" diye başlayacaktır'}
          </p>
        </div>
      </section>

      {/* Live Voice Dialogue Screen (Subtitles & Context) */}
      <section className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#0E1524] border border-black/[0.04] dark:border-white/[0.06] rounded-3xl shadow-sm p-4 overflow-hidden">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500">
          <span className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
            <Sparkles className="w-3.5 h-3.5" />
            Canlı Sesli Diyalog Altyazısı
          </span>
          <span>{messages.length} Sesli Tur</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {messages.length === 0 && !isActive ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-4">
              <Heart className="w-10 h-10 text-teal-500/40 mb-2 stroke-[1.5]" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Sesli Sohbet Henüz Başlatılmadı
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                Yukarıdaki "Sohbeti Başlat" butonuna dokunarak yapay zeka ile doğrudan sesli konuşabilirsiniz.
              </p>
            </div>
          ) : (
            <>
              {/* Last messages log */}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    m.sender === 'patient'
                      ? 'bg-teal-50 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 text-teal-950 dark:text-teal-100'
                      : 'bg-slate-50 dark:bg-[#131C2D] border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>{m.sender === 'patient' ? 'Hasta / Hasta Yakını' : 'Yapay Zeka Asistanı'}</span>
                    {m.detectedLanguageFlag && <span>{m.detectedLanguageFlag}</span>}
                  </div>
                  <p>{m.text}</p>
                </div>
              ))}

              {/* Current Live Speaking Subtitle */}
              {status === 'listening' && currentSpeechText && (
                <div className="p-3 rounded-2xl text-xs sm:text-sm bg-teal-500/10 border border-teal-500/30 text-teal-800 dark:text-teal-200 animate-pulse">
                  <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block mb-1">
                    Siz Konuşuyorsunuz...
                  </span>
                  <p>"{currentSpeechText}"</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Clinical Report Modal upon Session Finish */}
      <CompanionReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        report={generatedReport}
        onStartNewSession={handleStartSession}
      />

      {/* Nurse Alerts Station Modal */}
      <NurseAlertsModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        alerts={alerts}
        onUpdateStatus={async (id, status) => {
          await updateAlertStatus(id, status);
          setAlerts((prev) =>
            prev.map((a) => (a.id === id ? { ...a, status } : a))
          );
        }}
        onClearAll={async () => {
          await fetch('/api/companion/alerts', { method: 'DELETE' });
          setAlerts([]);
        }}
      />
    </div>
  );
};

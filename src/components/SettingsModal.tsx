import { useState, useRef, useEffect, type FC } from 'react';
import {
  X,
  Sun,
  Moon,
  HelpCircle,
  Clock,
  Shield,
  Settings,
  ChevronRight,
  Trash2,
  Volume2,
  VolumeX,
  Check,
  Sparkles,
  Tablet,
  Radio,
  Video,
  Play,
  Pause,
  FileText,
  Monitor,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import type { GeminiVoiceName } from '../types/interpreter';
import { GEMINI_VOICE_OPTIONS } from '../utils/voiceOptions';
import { playNormalizedAudioWav } from '../services/audio/pcmHelper';
import {
  NURSE_CALL_VIDEO_URL,
  NURSE_CALL_ALT_VIDEO_URL,
  TRIFLOW_VIDEO_URL,
  TRIFLOW_ALT_VIDEO_URL,
} from '../utils/medicalTutorialDetection';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenGuide: () => void;
  onOpenHistory?: () => void;
  historyCount?: number;
  onClearHistory?: () => void;
  selectedVoice?: GeminiVoiceName;
  onSelectVoice?: (voice: GeminiVoiceName) => void;
}

type SettingsTab = 'voice' | 'appearance' | 'history' | 'guide';

export const SettingsModal: FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  onOpenGuide,
  onOpenHistory,
  historyCount = 0,
  onClearHistory,
  selectedVoice = 'Zephyr',
  onSelectVoice,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('voice');
  const [testingVoiceId, setTestingVoiceId] = useState<GeminiVoiceName | null>(null);
  const [activeVideoPreview, setActiveVideoPreview] = useState<'nurse_call' | 'triflow' | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Stop preview audio when modal is closed
  useEffect(() => {
    if (!isOpen) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      setTestingVoiceId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenGuideClick = () => {
    onClose();
    onOpenGuide();
  };

  const handleOpenHistoryClick = () => {
    onClose();
    onOpenHistory?.();
  };

  /**
   * High-reliability voice sample playback.
   * Toggles audio play/stop with instant response from local high-fidelity wav files.
   */
  const handleTestVoice = (voiceId: GeminiVoiceName, e: React.MouseEvent) => {
    e.stopPropagation();

    // Toggle stop if already playing the current voice
    if (testingVoiceId === voiceId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
        audioPlayerRef.current = null;
      }
      setTestingVoiceId(null);
      return;
    }

    // Stop any previously playing audio
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
    }

    setTestingVoiceId(voiceId);

    // 1. Primary: Direct static pre-rendered high-definition wav
    const audioUrl = `/audio/voices/${voiceId.toLowerCase()}.wav`;
    const audio = new Audio(audioUrl);
    audioPlayerRef.current = audio;

    audio.onended = () => {
      setTestingVoiceId(null);
      audioPlayerRef.current = null;
    };

    audio.onerror = async () => {
      console.warn(`[Audio Preview] Static file ${audioUrl} not found, falling back to /api/tts`);
      // 2. Secondary fallback: Server-side TTS synthesis
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'Merhaba, ben yapay zeka sağlık tercümanınızım. Hastane ortamında size en doğal ve anlaşılır şekilde yardımcı olacağım.',
            voiceName: voiceId,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.audio) {
            await playNormalizedAudioWav(data.audio);
          }
        }
      } catch (err) {
        console.warn('Voice preview error:', err);
      } finally {
        setTestingVoiceId(null);
        audioPlayerRef.current = null;
      }
    };

    audio.play().catch((playErr) => {
      console.warn('Direct audio play error:', playErr);
      setTestingVoiceId(null);
      audioPlayerRef.current = null;
    });
  };

  const currentVoiceObj = GEMINI_VOICE_OPTIONS.find((v) => v.id === selectedVoice);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl md:max-w-2xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header with Title and Close Button */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Ayarlar & Tercihler
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                Seslendirme, arayüz teması ve sistem yönetimi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Kapat"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modular Navigation Tabs (Touch-Optimized & 100% Responsive for Mobile & Desktop) */}
        <div className="px-2 sm:px-5 pt-2 sm:pt-3.5 pb-2 bg-slate-50/90 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <nav
            role="tablist"
            aria-label="Ayar kategorileri"
            className="grid grid-cols-4 gap-1 sm:gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800/90 rounded-2xl"
          >
            {/* Tab 1: Ses Seçimi */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'voice'}
              onClick={() => setActiveTab('voice')}
              className={`py-2 px-1 sm:px-3 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer text-center ${
                activeTab === 'voice'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm font-extrabold ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/40'
              }`}
            >
              <Volume2 className="w-4 h-4 shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold leading-tight truncate w-full text-center">
                Ses Seçimi
              </span>
            </button>

            {/* Tab 2: Görünüm & Tema */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'appearance'}
              onClick={() => setActiveTab('appearance')}
              className={`py-2 px-1 sm:px-3 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer text-center ${
                activeTab === 'appearance'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm font-extrabold ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/40'
              }`}
            >
              <Sun className="w-4 h-4 shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold leading-tight truncate w-full text-center">
                Görünüm
              </span>
            </button>

            {/* Tab 3: Geçmiş */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 sm:px-3 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer text-center relative ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm font-extrabold ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/40'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Clock className="w-4 h-4 shrink-0" />
                {historyCount > 0 && (
                  <span className="sm:hidden absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] rounded-full text-[8.5px] font-extrabold bg-teal-600 text-white flex items-center justify-center shadow-xs">
                    {historyCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] sm:text-xs font-bold leading-tight truncate w-full text-center">
                Geçmiş
              </span>
              {historyCount > 0 && (
                <span className="hidden sm:inline-flex px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                  {historyCount}
                </span>
              )}
            </button>

            {/* Tab 4: Rehber & Kılavuz */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'guide'}
              onClick={() => setActiveTab('guide')}
              className={`py-2 px-1 sm:px-3 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer text-center ${
                activeTab === 'guide'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm font-extrabold ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/40'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold leading-tight truncate w-full text-center">
                Kılavuz
              </span>
            </button>
          </nav>
        </div>

        {/* Tab Content Body (Scrollable) */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1">

          {/* ==================================================== */}
          {/* TAB 1: SES SEÇİMİ (YAPAY ZEKA SES SEÇENEKLERİ)         */}
          {/* ==================================================== */}
          {activeTab === 'voice' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Header Box with Active Status */}
              <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Aktif Ses:{' '}
                      <span className="text-teal-700 dark:text-teal-300">
                        {currentVoiceObj?.name} ({currentVoiceObj?.gender === 'female' ? 'Kadın' : 'Erkek'})
                      </span>
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Tercüman çevirileri bu ses ile seslendirir. Yanındaki butona basarak sesi önceden dinleyebilirsiniz.
                  </p>
                </div>

                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 text-[10px] font-bold text-teal-700 dark:text-teal-300 shrink-0">
                  <Sparkles className="w-3 h-3 text-teal-500" />
                  <span>Doğal İnsan Sesi</span>
                </div>
              </div>

              {/* 6 Gemini Voices Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {GEMINI_VOICE_OPTIONS.map((voice) => {
                  const isSelected = selectedVoice === voice.id;
                  const isTesting = testingVoiceId === voice.id;

                  return (
                    <div
                      key={voice.id}
                      onClick={() => onSelectVoice?.(voice.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          onSelectVoice?.(voice.id);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                        isSelected
                          ? 'bg-teal-50/90 dark:bg-teal-950/50 border-teal-500 dark:border-teal-400 ring-2 ring-teal-500/20 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100/90 dark:hover:bg-slate-800/90'
                      }`}
                    >
                      {/* Top Row: Avatar, Name, Gender Pill, Preview Button, Radio Indicator */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-transform group-hover:scale-105 ${
                              isSelected
                                ? 'bg-teal-600 text-white shadow-xs'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {voice.name[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                {voice.name}
                              </h4>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                                  voice.gender === 'female'
                                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60'
                                    : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60'
                                }`}
                              >
                                {voice.gender === 'female' ? 'Kadın' : 'Erkek'}
                              </span>
                            </div>
                            <p className="text-[10px] font-semibold text-teal-700 dark:text-teal-300 mt-0.5">
                              {voice.toneTr}
                            </p>
                          </div>
                        </div>

                        {/* Actions (Dinle & Select Radio) */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Audio Preview Button */}
                          <button
                            type="button"
                            onClick={(e) => handleTestVoice(voice.id, e)}
                            title={isTesting ? 'Sesi Durdur' : 'Örnek Sesi Dinle'}
                            className={`py-1 px-2 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isTesting
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs animate-pulse ring-2 ring-rose-400/40'
                                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:text-teal-700 hover:border-teal-400 dark:hover:text-teal-300'
                            }`}
                          >
                            {isTesting ? (
                              <>
                                <VolumeX className="w-3 h-3 text-white" />
                                <span>Durdur</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                                <span>Dinle</span>
                              </>
                            )}
                          </button>

                          {/* Selected Checkmark / Radio Indicator */}
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-teal-600 text-white'
                                : 'border border-slate-300 dark:border-slate-600 text-transparent'
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        </div>
                      </div>

                      {/* Voice Persona Description */}
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {voice.descriptionTr}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Informative Note */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Radio className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>
                  Ses seçimi konuşma devam ederken değiştirilirse tercüman bir sonraki cümleyi kesinti olmadan yeni sesle seslendirir.
                </span>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: GÖRÜNÜM & TEMA                                */}
          {/* ==================================================== */}
          {activeTab === 'appearance' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  Arayüz Teması
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  Ortam ışığına ve nöbet saatinize uygun ekran temasını belirleyin
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Light Mode */}
                <button
                  type="button"
                  onClick={() => {
                    if (theme !== 'light') onToggleTheme();
                  }}
                  className={`p-4 rounded-2xl text-left flex flex-col justify-between transition-all cursor-pointer active:scale-98 ${
                    theme === 'light'
                      ? 'bg-amber-50/80 border-2 border-amber-500 text-slate-900 shadow-sm ring-2 ring-amber-400/20'
                      : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className="p-2 rounded-xl bg-amber-100/70 text-amber-600">
                      <Sun className="w-5 h-5" />
                    </div>
                    {theme === 'light' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-400/20" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Aydınlık Mod</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      Gündüz klinik ve poliklinik kullanımı için aydınlık, ferah arayüz
                    </p>
                  </div>
                </button>

                {/* Dark Mode */}
                <button
                  type="button"
                  onClick={() => {
                    if (theme !== 'dark') onToggleTheme();
                  }}
                  className={`p-4 rounded-2xl text-left flex flex-col justify-between transition-all cursor-pointer active:scale-98 ${
                    theme === 'dark'
                      ? 'bg-teal-950/40 border-2 border-teal-500 text-white shadow-sm ring-2 ring-teal-400/20'
                      : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className="p-2 rounded-xl bg-teal-900/50 text-teal-400">
                      <Moon className="w-5 h-5" />
                    </div>
                    {theme === 'dark' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-400 ring-4 ring-teal-400/20" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Koyu Mod</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      Gece nöbetleri ve loş hasta odaları için göz yormayan karanlık arayüz
                    </p>
                  </div>
                </button>
              </div>

              {/* Tablet Optimization Tip */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Tablet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Büyük Ekranlı Tablet Optimizasyonu
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Sistem iPad, Galaxy Tab ve benzeri geniş ekranlı tabletlerde hem yatay hem dikey yönelimde maksimum okunabilirlik ve ergonomi için otomatik optimize edilmiştir.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: GEÇMİŞ (ÖNCEKİ KONUŞMALAR)                    */}
          {/* ==================================================== */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  Klinik Konuşma Geçmişi
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  Önceki hasta-hemşire diyalogları, tıbbi dozajlar ve klinik özetler
                </p>
              </div>

              {/* History Access Button */}
              {onOpenHistory && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleOpenHistoryClick}
                    className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-left transition-all cursor-pointer group active:scale-98"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform border border-indigo-200 dark:border-indigo-800">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            Önceki Konuşmaları Aç
                          </p>
                          {historyCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                              {historyCount} Kayıt
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Tüm seansları, tarihleri ve özet raporları inceleyin
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* Clear History Button if items exist */}
                  {historyCount > 0 && onClearHistory && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Tüm geçmiş konuşma kayıtları silinsin mi?')) {
                          onClearHistory();
                        }
                      }}
                      className="w-full py-2.5 px-3 rounded-2xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-rose-200/60 dark:border-rose-900/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Tüm Geçmiş Konuşmaları Temizle</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 4: REHBER & GÜVENLİK                             */}
          {/* ==================================================== */}
          {activeTab === 'guide' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  Kılavuz & Güvenlik
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  Sistemi verimli kullanma adımları ve veri güvenliği ilkeleri
                </p>
              </div>

              {/* Onboarding Interactive Guide Trigger */}
              <button
                type="button"
                onClick={handleOpenGuideClick}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 to-emerald-500/10 hover:from-teal-500/15 hover:to-emerald-500/15 dark:from-teal-950/40 dark:to-emerald-950/40 border border-teal-500/30 flex items-center justify-between text-left transition-all cursor-pointer group active:scale-98 shadow-2xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-teal-600 text-white group-hover:scale-105 transition-transform shadow-xs">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Adım Adım Hızlı Başlangıç Rehberi
                      </p>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-teal-600 text-white font-bold">
                        7 Adım
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Dil seçimi, çift yönlü konuşma, video kartları ve tablet modu anlatımı
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-teal-600 dark:text-teal-400 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* SECTION: Videolu Eğitimler (Interactive Video Modules) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                      <Video className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      İnteraktif Videolu Eğitimler & Cihaz Rehberleri
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    Otomatik Algılama
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Hemşire hastaya butonu veya solunum cihazını tarif ettiğinde sistem bunu konuşmadan anında saptar ve konuşma balonunun altında videolu rehber sunar. Aşağıdan videoları doğrudan önizleyebilirsiniz:
                </p>

                {/* Video Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* Video 1: Hemşire Çağrı Butonu */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-2.5">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          Hemşire Çağrı Butonu
                        </h5>
                      </div>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight">
                        "Beni çağırmak için butona basın" dendiğinde hastaya doğru kullanım videosu açılır.
                      </p>
                    </div>

                    {activeVideoPreview === 'nurse_call' ? (
                      <div className="flex flex-col gap-1.5 animate-in fade-in">
                        <video
                          src={NURSE_CALL_VIDEO_URL}
                          controls
                          autoPlay
                          playsInline
                          className="w-full rounded-lg bg-black aspect-video object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setActiveVideoPreview(null)}
                          className="text-[10px] text-rose-600 dark:text-rose-400 font-bold self-end hover:underline cursor-pointer"
                        >
                          Videoyu Kapat
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveVideoPreview('nurse_call')}
                        className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 text-xs font-bold border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Videoyu İzle / Önizle</span>
                      </button>
                    )}
                  </div>

                  {/* Video 2: Triflow Solunum Cihazı */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-2.5">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          Triflow Solunum Cihazı
                        </h5>
                      </div>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight">
                        "Triflow ile derin nefes çekin" talimatı verildiğinde doğru nefes egzersizi gösterilir.
                      </p>
                    </div>

                    {activeVideoPreview === 'triflow' ? (
                      <div className="flex flex-col gap-1.5 animate-in fade-in">
                        <video
                          src={TRIFLOW_VIDEO_URL}
                          controls
                          autoPlay
                          playsInline
                          className="w-full rounded-lg bg-black aspect-video object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setActiveVideoPreview(null)}
                          className="text-[10px] text-rose-600 dark:text-rose-400 font-bold self-end hover:underline cursor-pointer"
                        >
                          Videoyu Kapat
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveVideoPreview('triflow')}
                        className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 text-xs font-bold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Videoyu İzle / Önizle</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION: Anlık Özet & Klinik Anamnez Rehberi */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Anlık Özet & Anamnez Modülü Nasıl Çalışır?
                  </h4>
                </div>
                <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed pl-1">
                  <li className="flex items-start gap-1.5">
                    <span className="text-teal-600 font-bold shrink-0">✓</span>
                    <span><strong>Anında Analiz:</strong> Butona basıp beklemenize gerek kalmadan, konuşma devam ederken şikayetler, ilaçlar ve öyküler anlık olarak yan panele işlenir.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-teal-600 font-bold shrink-0">✓</span>
                    <span><strong>Miligram Belirtilmese Bile İlaç Tespiti:</strong> Parol, Beloc, Novalgin vb. ilaçlar doz söylenmese bile temiz isimleriyle yakalanır.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-teal-600 font-bold shrink-0">✓</span>
                    <span><strong>Akıllı Tekilleştirme:</strong> Hasta aynı alerjiyi veya hastalığı 5 defa söylese dahi tek ve temiz bir kayıt olarak listelenir.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-teal-600 font-bold shrink-0">✓</span>
                    <span><strong>Olumsuzluk Filtresi:</strong> "Alerjim yok", "Ameliyat olmadım" gibi yokluk bildirimleri veya sorular yanlışlıkla sisteme kaydedilmez.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-teal-600 font-bold shrink-0">✓</span>
                    <span><strong>HBYS Formatında Kopyalama:</strong> Panelin üstündeki "HBYS Formatında Kopyala" butonuyla tüm anamnez tek tıkla hastane kayıt sistemine aktarılabilir.</span>
                  </li>
                </ul>
              </div>

              {/* SECTION: Geniş Ekran / Tablet Yatay Modu */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Geniş Ekran & Tablet Yatay Modu
                  </h4>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Tablet ekranı yatay çevrildiğinde veya geniş bilgisayar monitörlerinde Canlı Konuşma ile Anlık Anamnez pencereleri <strong>eşzamanlı olarak yan yana</strong> açılır. Telefonlarda veya tablet dikey tutulduğunda ise parmağınızı sağa-sola kaydırarak (swipe) pencereler arasında zahmetsizce geçiş yapabilirsiniz.
                </p>
              </div>

              {/* SECTION: Yazım Denetimi, İmla Düzeltme & Siber Güvenlik Kalkanı */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-teal-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    İmla Düzeltme & Anti-Hack Güvenlik Kalkanı
                  </h4>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Tüm konuşmalar harf uyumluluğu, soru eki ayrıştırması (mı/mi/musunuz) ve birleşik kelime ayrıştırması ("kan basıncı", "500 mg Parol") süzgecinden geçirilir. Sistem yapay zekayı kandırmaya, saptırmaya (prompt injection) veya rol dışına çıkarmaya yönelik kötü niyetli komutlara karşı tam korumalıdır.
                </p>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                  🔒 Hasta-hemşire konuşmaları yalnızca bu cihazın yerel tarayıcı hafızasında saklanır; buluta sızdırılmaz.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 text-[11px] text-slate-400">
          <span>İki Yönlü Canlı Çevirmen v2.2</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white text-xs transition-colors cursor-pointer shadow-xs"
          >
            Tamam
          </button>
        </div>

      </div>
    </div>
  );
};

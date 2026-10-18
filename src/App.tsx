import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  FileText,
  Settings,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Activity,
  SlidersHorizontal,
  Monitor,
} from 'lucide-react';
import type {
  LanguageOption,
  SessionState,
  TranscriptMessage,
  ProviderError,
  ConversationSummary,
  ConversationHistoryItem,
  GeminiVoiceName,
  LiveAnamnesisState,
} from './types/interpreter';
import { DEFAULT_GEMINI_VOICE } from './utils/voiceOptions';
import {
  getInitialTargetLanguage,
  recordLanguageUsage,
  getFrequentlyUsedLanguages,
} from './services/languageCatalog';
import {
  getConversationHistory,
  archiveCurrentConversation,
  deleteConversationFromHistory,
  clearAllConversationHistory,
} from './services/historyStorage';
import { InterpreterSession } from './services/interpreterSession';
import { TranslationSupervisor } from './services/translationSupervisor';
import { InterpreterButton } from './components/InterpreterButton';
import { TranscriptView } from './components/TranscriptView';
import { LiveAnamnesisPanel } from './components/LiveAnamnesisPanel';
import { LanguageSelectorModal } from './components/LanguageSelectorModal';
import { ConversationSummaryModal } from './components/ConversationSummaryModal';
import { OnboardingModal } from './components/OnboardingModal';
import { SettingsModal } from './components/SettingsModal';
import { ConversationHistoryModal } from './components/ConversationHistoryModal';
import { CountryFlag } from './components/CountryFlag';
import { OfflineNotice, PermissionNotice, ErrorNotice } from './components/Notices';
import { SplashScreen } from './components/SplashScreen';
import {
  buildRealtimeAnamnesis,
  normalizeTranscriptText,
  extractMedicalEntities,
} from './utils/medicalEntityExtractor';

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return 'light'; // Always start in Light Mode for first-time users
    }
    return 'light';
  });

  // Onboarding tutorial state (shown automatically for first-time users)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem('interpreter_onboarding_completed');
      return completed !== 'true';
    }
    return false;
  });

  // Settings & History Modal States
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationHistoryItem[]>(() =>
    getConversationHistory()
  );
  const currentConversationIdRef = useRef<string | null>(null);
  const deletedConversationIdsRef = useRef<Set<string>>(new Set());

  const [selectedVoice, setSelectedVoice] = useState<GeminiVoiceName>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gemini_selected_voice') as GeminiVoiceName;
      if (saved && ['Zephyr', 'Puck', 'Aoede', 'Charon', 'Fenrir', 'Kore'].includes(saved)) {
        return saved;
      }
    }
    return DEFAULT_GEMINI_VOICE as GeminiVoiceName;
  });

  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [targetLanguage, setTargetLanguage] = useState<LanguageOption>(() =>
    getInitialTargetLanguage()
  );
  const [frequentLanguages, setFrequentLanguages] = useState<LanguageOption[]>(() =>
    getFrequentlyUsedLanguages()
  );
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [interimText, setInterimText] = useState<string>('');
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [permissionError, setPermissionError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Two-window sliding bottom panel state ('dialogue' = Canlı Konuşma, 'anamnesis' = Anlık Özet & Anamnez)
  const [activeBottomTab, setActiveBottomTab] = useState<'dialogue' | 'anamnesis'>('dialogue');
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Responsive wide-screen / tablet landscape detection:
  // When wide (>=1024px or landscape tablet >=768px with w > h), show side-by-side dual view
  const [isWideScreen, setIsWideScreen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const w = window.innerWidth;
    const h = window.innerHeight;
    return w >= 1024 || (w >= 768 && w > h);
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setIsWideScreen(w >= 1024 || (w >= 768 && w > h));
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Detect horizontal swipe: only trigger if horizontal swipe is clearly dominant
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
      if (deltaX < 0) {
        // Swiped left -> Switch to Anlık Özet & Anamnez page
        setActiveBottomTab('anamnesis');
      } else {
        // Swiped right -> Switch to Canlı Konuşma page
        setActiveBottomTab('dialogue');
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Fast local anamnesis fallback
  const realtimeAnamnesis = useMemo(() => {
    return buildRealtimeAnamnesis(messages);
  }, [messages]);

  // AI-Powered Deep Clinical Anamnesis (Triage Physician / Charge Nurse Persona)
  const [aiAnamnesis, setAiAnamnesis] = useState<LiveAnamnesisState | null>(null);

  useEffect(() => {
    const dialogueMsgs = messages.filter(
      (m) => (m.speaker === 'nurse' || m.speaker === 'patient') && (m.originalText || m.translatedText)
    );
    if (dialogueMsgs.length === 0) {
      setAiAnamnesis(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/live-anamnesis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: dialogueMsgs,
            targetLanguage: targetLanguage.nameTr,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setAiAnamnesis(data);
        }
      } catch (err) {
        console.debug('AI Anamnesis sync note:', err);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [messages, targetLanguage]);

  // Combined clinical state: prefers verified AI extraction when ready, otherwise fast local extractor
  const activeAnamnesis = useMemo(() => {
    if (aiAnamnesis) {
      return aiAnamnesis;
    }
    return realtimeAnamnesis;
  }, [aiAnamnesis, realtimeAnamnesis]);

  // Total count of verified clinical facts (vitals excluded per instruction)
  const totalAnamnesisCount =
    activeAnamnesis.chiefComplaints.length +
    activeAnamnesis.medications.length +
    activeAnamnesis.allergies.length +
    activeAnamnesis.chronicDiseases.length +
    activeAnamnesis.pastSurgeries.length +
    activeAnamnesis.habits.length +
    activeAnamnesis.familyHistory.length +
    activeAnamnesis.patientNeedsAndRequests.length +
    activeAnamnesis.clinicalInstructions.length;

  // Conversation Summary State
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState<boolean>(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);

  const [isToggling, setIsToggling] = useState(false);
  const sessionRef = useRef<InterpreterSession | null>(null);
  const supervisorRef = useRef<TranslationSupervisor | null>(null);
  const messagesRef = useRef<TranscriptMessage[]>([]);

  // Initialize background translation supervisor (Audits every turn, auto-heals dropped translations)
  useEffect(() => {
    const supervisor = new TranslationSupervisor(
      {
        onUpdateMessage: (healed) => {
          setMessages((prev) => prev.map((m) => (m.id === healed.id ? healed : m)));
        },
      },
      targetLanguage,
      selectedVoice
    );
    supervisor.attachSession(sessionRef.current);
    supervisor.notifySessionState(sessionState);
    supervisorRef.current = supervisor;

    return () => {
      supervisor.destroy();
      supervisorRef.current = null;
    };
  }, [targetLanguage, selectedVoice]);

  // Keep messagesRef synchronously updated and feed supervisor
  useEffect(() => {
    messagesRef.current = messages;
    supervisorRef.current?.inspectMessages(messages);
  }, [messages]);

  // Sync theme changes with DOM and localStorage
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Generate AI Conversation Summary
  const handleGenerateSummary = async (customMessages?: TranscriptMessage[]) => {
    const source = customMessages || messagesRef.current;
    const dialogueMessages = source.filter(
      (m) => m.speaker === 'nurse' || m.speaker === 'patient'
    );
    if (dialogueMessages.length === 0) return;

    setIsSummaryModalOpen(true);
    setIsGeneratingSummary(true);

    try {
      const res = await fetch('/api/summarize-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: dialogueMessages,
          targetLanguage: targetLanguage.nameTr,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      } else {
        console.warn('Summary generation notice, applying fallback');
        setSummary({
          briefSummaryTr: `Görüşme başarıyla tamamlandı. ${dialogueMessages.length} adet konuşma kaydı arşivlendi.`,
          patientChiefComplaints: [],
          patientNeedsAndRequests: [],
          clinicalInstructions: [],
          vitalSignsAndDosages: [],
          actionItems: ['Hasta takibi sürdürülmeli.'],
          targetLanguage: targetLanguage.nameTr,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.warn('Summary error, applying fallback:', err);
      setSummary({
        briefSummaryTr: `Görüşme başarıyla tamamlandı. Konuşma kayıtları arşivlendi.`,
        patientChiefComplaints: [],
        patientNeedsAndRequests: [],
        clinicalInstructions: [],
        vitalSignsAndDosages: [],
        actionItems: ['Hasta takibi sürdürülmeli.'],
        targetLanguage: targetLanguage.nameTr,
        timestamp: Date.now(),
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Update specific transcript message (e.g. from on-demand translate button)
  const handleUpdateMessage = (updated: TranscriptMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  // Initialize network monitor and session listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const session = new InterpreterSession();
    sessionRef.current = session;
    supervisorRef.current?.attachSession(session);

    session.setListeners({
      onStateChange: (state) => {
        setSessionState(state);
        supervisorRef.current?.notifySessionState(state);
      },
      onTranscript: (msg) => {
        // Normalize speech typos & capitalization, extract medical entities
        const cleanOrig = normalizeTranscriptText(msg.originalText, msg.language);
        const cleanTrans = msg.translatedText
          ? normalizeTranscriptText(msg.translatedText)
          : undefined;
        const combined = `${cleanOrig} ${cleanTrans || ''}`;
        const entities = extractMedicalEntities(combined);

        const cleanMsg: TranscriptMessage = {
          ...msg,
          originalText: cleanOrig,
          translatedText: cleanTrans,
          highlightedEntities: entities,
        };

        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === cleanMsg.id);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = cleanMsg;
            return updated;
          }
          return [...prev, cleanMsg];
        });
        setInterimText('');
      },
      onInterim: (text) => {
        setInterimText(text);
      },
      onLanguageDetected: (_lang) => {
        // Strict user-selected language enforcement: never auto-switch target language during speech
      },
      onAudioLevel: (lvl) => {
        setAudioLevel(lvl);
      },
      onMuteChange: (muted) => {
        setIsMuted(muted);
      },
      onError: (err: ProviderError) => {
        if (err.code === 'MIC_PERMISSION_DENIED') {
          setPermissionError(true);
        } else if (err.code === 'OFFLINE') {
          setIsOnline(false);
        } else {
          setErrorMessage(err.message);
        }
      },
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      session.destroy();
    };
  }, []);

  const handleToggleMute = () => {
    if (sessionRef.current && sessionState !== 'idle') {
      const next = sessionRef.current.toggleMute();
      setIsMuted(next);
    } else {
      setIsMuted((prev) => !prev);
    }
  };

  const handleToggleSession = async () => {
    if (isToggling) return;
    setErrorMessage(null);
    setPermissionError(false);

    setIsToggling(true);
    // Hard watchdog guarantees UI button never stays locked or stuck under any device state
    const watchdogTimer = setTimeout(() => {
      setIsToggling(false);
    }, 8500);

    try {
      if (sessionState === 'idle' || sessionState === 'error') {
        await sessionRef.current?.start({
          targetLanguage,
          initialMuted: isMuted,
          voiceName: selectedVoice,
        });
      } else {
        await sessionRef.current?.stop();
      }
    } catch (err: unknown) {
      console.error('Session toggle error:', err);
      setErrorMessage('Tercüme başlatılamadı. Lütfen tekrar deneyin.');
    } finally {
      clearTimeout(watchdogTimer);
      setIsToggling(false);
    }
  };

  const handleSelectVoice = (voice: GeminiVoiceName) => {
    setSelectedVoice(voice);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gemini_selected_voice', voice);
    }
    if (sessionRef.current) {
      sessionRef.current.setVoice(voice);
    }
    if (supervisorRef.current) {
      supervisorRef.current.updateVoice(voice);
    }
  };

  const handleSelectLanguage = (lang: LanguageOption) => {
    recordLanguageUsage(lang.code);
    setFrequentLanguages(getFrequentlyUsedLanguages(lang.code));
    if (lang.code === targetLanguage.code) return;
    setTargetLanguage(lang);
    if (sessionRef.current && sessionState !== 'idle') {
      sessionRef.current.setTargetLanguage(lang);
    }
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        speaker: 'system',
        originalText: `${lang.nameTr} ${lang.flag} diline geçildi`,
        timestamp: Date.now(),
        systemType: 'language_change',
      },
    ]);
  };

  // Auto-archive active conversation into history storage (debounced to avoid thread thrashing during speech)
  useEffect(() => {
    const dialogueMessages = messages.filter((m) => m.speaker === 'nurse' || m.speaker === 'patient');
    if (dialogueMessages.length === 0) {
      return;
    }
    // Do not re-archive if this conversation ID was explicitly deleted by the user
    if (currentConversationIdRef.current && deletedConversationIdsRef.current.has(currentConversationIdRef.current)) {
      return;
    }
    if (!currentConversationIdRef.current) {
      currentConversationIdRef.current = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }
    const timer = setTimeout(() => {
      if (currentConversationIdRef.current) {
        archiveCurrentConversation(
          messages,
          targetLanguage,
          summary,
          currentConversationIdRef.current
        );
        setConversationHistory(getConversationHistory());
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [messages, summary, targetLanguage]);

  // Start fresh conversation (cleanly saves current dialogue to history first)
  const handleNewConversation = () => {
    const dialogueMessages = messages.filter((m) => m.speaker === 'nurse' || m.speaker === 'patient');
    if (dialogueMessages.length > 0 && (!currentConversationIdRef.current || !deletedConversationIdsRef.current.has(currentConversationIdRef.current))) {
      archiveCurrentConversation(
        messages,
        targetLanguage,
        summary,
        currentConversationIdRef.current || undefined
      );
      setConversationHistory(getConversationHistory());
    }
    currentConversationIdRef.current = null;
    setMessages([]);
    setInterimText('');
    setSummary(null);
    setAiAnamnesis(null);
    setActiveBottomTab('dialogue');
  };

  // Restore past conversation from history
  const handleRestoreConversation = (item: ConversationHistoryItem) => {
    currentConversationIdRef.current = item.id;
    deletedConversationIdsRef.current.delete(item.id);
    setTargetLanguage(item.targetLanguage);
    setMessages(item.messages);
    setSummary(item.summary || null);
    setInterimText('');
  };

  // Delete past conversation: permanently removes from storage and cleans active screen if it was loaded
  const handleDeleteHistoryItem = (id: string) => {
    deletedConversationIdsRef.current.add(id);
    deleteConversationFromHistory(id);
    setConversationHistory(getConversationHistory());
    if (currentConversationIdRef.current === id) {
      currentConversationIdRef.current = null;
      setMessages([]);
      setSummary(null);
      setInterimText('');
    }
  };

  // Clear all history: permanently removes all records and cleans screen
  const handleClearAllHistory = () => {
    clearAllConversationHistory();
    setConversationHistory([]);
    currentConversationIdRef.current = null;
    setMessages([]);
    setSummary(null);
    setInterimText('');
  };

  const dialogueMessagesCount = messages.filter(
    (m) => m.speaker === 'nurse' || m.speaker === 'patient'
  ).length;

  return (
    <div className="flex flex-col h-screen w-full bg-[#F8FAFC] dark:bg-[#0A0E17] text-slate-900 dark:text-slate-100 overflow-hidden font-sans antialiased selection:bg-teal-100 dark:selection:bg-teal-900/50 transition-colors duration-200">
      {/* App Launch Splash Screen */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {/* Network / Permission Alerts */}
      {!isOnline && <OfflineNotice />}
      {permissionError && <PermissionNotice onDismiss={() => setPermissionError(false)} />}
      {errorMessage && <ErrorNotice message={errorMessage} onDismiss={() => setErrorMessage(null)} />}

      {/* Translucent Apple Liquid Glass Header (Optimized for Mobile, Tablet, PC, iPhone Dynamic Island) */}
      <header className="pt-safe px-3 sm:px-6 md:px-8 liquid-glass-panel border-b border-black/[0.04] dark:border-white/[0.08] flex flex-col shrink-0 select-none z-20 transition-colors duration-200">
        <div className="h-13 sm:h-14 md:h-16 flex items-center justify-between w-full max-w-7xl xl:max-w-[1600px] 2xl:max-w-[1760px] mx-auto">
          <div className="flex items-center">
            <div className="relative shrink-0">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-xl object-contain shadow-sm border border-white/40 dark:border-white/10"
              />
              {sessionState !== 'idle' && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0F1626] animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            {/* Active Target Language Liquid Glass Pill (Opens Full Language Modal) */}
            <button
              type="button"
              onClick={() => setIsLanguageModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 md:px-4 py-1.5 md:py-2 rounded-full liquid-glass-pill text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs"
              title="Hedef dili seç veya değiştir"
            >
              <CountryFlag flag={targetLanguage.flag} code={targetLanguage.code} country={targetLanguage.country} size="xs" />
              <span className="text-xs md:text-sm font-semibold">
                <span className="hidden sm:inline">{targetLanguage.nameTr}</span>
                <span className="sm:hidden">{targetLanguage.nameTr.split(' ')[0]}</span>
              </span>
            </button>

            {/* Unified Settings Liquid Glass Button (Theme, Guide & Previous Conversations) */}
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-1.5 sm:p-2 md:p-2.5 rounded-full liquid-glass-btn text-slate-700 dark:text-slate-200 cursor-pointer group relative shadow-xs"
              title="Ayarlar (Tema, Kılavuz ve Önceki Konuşmalar)"
              aria-label="Ayarlar"
            >
              <Settings className="w-4 h-4 md:w-4.5 md:h-4.5 text-slate-700 dark:text-slate-200 transition-transform duration-300 group-hover:rotate-45" />
              {conversationHistory.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-[#0F1626]" />
              )}
            </button>

            {/* New Chat Action (Archives and clears for new patient) */}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleNewConversation}
                className="flex items-center gap-1 px-2.5 sm:px-3 md:px-3.5 py-1.5 md:py-2 rounded-full liquid-glass-btn text-teal-700 dark:text-teal-300 text-xs md:text-sm font-semibold cursor-pointer shadow-xs"
                title="Mevcut konuşmayı arşive kaydet ve yeni konuşma başlat"
                aria-label="Yeni Sohbet"
              >
                <PlusCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-teal-600 dark:text-teal-400" />
                <span className="hidden sm:inline">Yeni</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Segmented Language Quick Rail in Apple Liquid Glass Panel (Direct Language Selection) */}
      <div className="px-3 sm:px-6 md:px-8 pt-1.5 sm:pt-2 pb-1 shrink-0 select-none max-w-7xl xl:max-w-[1600px] 2xl:max-w-[1760px] w-full mx-auto">
        <div className="liquid-glass-panel p-1 md:p-1.5 rounded-2xl flex items-center gap-1.5 md:gap-2 overflow-x-auto no-scrollbar border border-black/[0.04] dark:border-white/[0.08]">
          {frequentLanguages.map((lang) => {
            const isSelected = targetLanguage.code === lang.code;
            return (
              <button
                type="button"
                key={lang.code}
                onClick={() => handleSelectLanguage(lang)}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm whitespace-nowrap transition-all duration-200 flex items-center gap-2 shrink-0 cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'liquid-glass-emerald text-white font-extrabold shadow-md shadow-emerald-500/35 ring-2 ring-emerald-400/80 scale-[1.02]'
                    : 'liquid-glass-btn text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold'
                }`}
              >
                <CountryFlag flag={lang.flag} code={lang.code} country={lang.country} size="xs" />
                <span>{lang.nameTr.split(' ')[0]}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs animate-pulse shrink-0" />
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setIsLanguageModalOpen(true)}
            className="px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold liquid-glass-btn text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-teal-100 whitespace-nowrap shrink-0 cursor-pointer"
          >
            + Tüm Diller
          </button>
        </div>
      </div>

      {/* Main View Area: Responsive, Spacious, and Non-Overlapping */}
      <main className={`flex-1 flex flex-col min-h-0 overflow-hidden w-full mx-auto px-2 sm:px-3 md:px-5 transition-all ${
        isWideScreen ? 'max-w-[99%] xl:max-w-[1760px] gap-1' : 'max-w-7xl gap-1 sm:gap-2'
      }`}>
        {/* Core Centerpiece: Microphone Push Control & Equalizer */}
        <section className="shrink-0 flex flex-col items-center pt-0.5 sm:pt-1 pb-0.5 w-full">
          <InterpreterButton
            state={sessionState}
            onToggle={handleToggleSession}
            targetLanguageName={targetLanguage.nameTr}
            audioLevel={audioLevel}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            compact={isWideScreen}
          />
        </section>

        {/* Simultaneous Side-by-Side on Wide/Tablet Landscape OR Swipeable View on Mobile */}
        <section className="flex-1 flex flex-col min-h-0 liquid-glass-panel rounded-t-[20px] sm:rounded-t-[28px] md:rounded-t-[32px] overflow-hidden transition-colors duration-200 shadow-md">
          {/* Section Header */}
          <div className="px-3 sm:px-5 md:px-6 py-2 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between text-xs md:text-sm font-semibold select-none bg-white/50 dark:bg-white/[0.03] transition-colors duration-200 shrink-0 gap-2">
            
            {/* WIDE SCREEN: Clean single unified header row aligned with each column */}
            {isWideScreen ? (
              <div className="w-full flex items-center justify-between divide-x divide-black/[0.06] dark:divide-white/[0.08]">
                {/* Column 1 Title: Canlı Konuşma */}
                <div className="flex-1 flex items-center justify-between pr-4 sm:pr-6">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Canlı Konuşma</span>
                    {dialogueMessagesCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        {dialogueMessagesCount} İleti
                      </span>
                    )}
                  </div>
                </div>

                {/* Column 2 Title: Anlık Özet & Anamnez */}
                <div className="flex-1 flex items-center justify-between pl-4 sm:pl-6">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Anlık Özet & Anamnez</span>
                    {totalAnamnesisCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{totalAnamnesisCount} Veri</span>
                      </span>
                    )}
                  </div>
                  <span className="text-teal-800 dark:text-teal-300 font-bold tracking-tight text-xs sm:text-sm">
                    {targetLanguage.nameTr}
                  </span>
                </div>
              </div>
            ) : (
              /* Mobile & Tablet Portrait Mode: Sliding Tabs Switcher */
              <div className="flex items-center gap-1 p-0.5 sm:p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setActiveBottomTab('dialogue')}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all cursor-pointer ${
                    activeBottomTab === 'dialogue'
                      ? 'liquid-glass-emerald text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Canlı konuşma"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Canlı Konuşma</span>
                  {dialogueMessagesCount > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        activeBottomTab === 'dialogue'
                          ? 'bg-white/25 text-white'
                          : 'bg-black/10 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {dialogueMessagesCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveBottomTab('anamnesis')}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all cursor-pointer ${
                    activeBottomTab === 'anamnesis'
                      ? 'liquid-glass-emerald text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Anlık yapay zeka klinik anamnez ve özet"
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>Anlık Özet & Anamnez</span>
                  {totalAnamnesisCount > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold flex items-center gap-1 ${
                        activeBottomTab === 'anamnesis'
                          ? 'bg-white/25 text-white'
                          : 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{totalAnamnesisCount}</span>
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Navigation Controls on Mobile */}
            {!isWideScreen && (
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* Swipe Helper Label (Mobile & Tablet prompt) */}
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>Yana Kaydırın</span>
                  <span className="font-mono text-xs">⇄</span>
                </span>

                {/* Page Dots Indicator */}
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.05]">
                  <button
                    type="button"
                    onClick={() => setActiveBottomTab('dialogue')}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      activeBottomTab === 'dialogue'
                        ? 'w-4 bg-teal-600 dark:bg-teal-400'
                        : 'w-2 bg-slate-300 dark:bg-slate-600'
                    }`}
                    title="Canlı Konuşma"
                    aria-label="Canlı Konuşma"
                  />
                  <button
                    type="button"
                    onClick={() => setActiveBottomTab('anamnesis')}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      activeBottomTab === 'anamnesis'
                        ? 'w-4 bg-teal-600 dark:bg-teal-400'
                        : 'w-2 bg-slate-300 dark:bg-slate-600'
                    }`}
                    title="Anlık Özet & Anamnez"
                    aria-label="Anlık Özet & Anamnez"
                  />
                </div>

                {/* Prev / Next Page Chevrons */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveBottomTab('dialogue')}
                    disabled={activeBottomTab === 'dialogue'}
                    className={`p-1 rounded-lg transition-all ${
                      activeBottomTab === 'dialogue'
                        ? 'opacity-30 cursor-not-allowed text-slate-400'
                        : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 cursor-pointer active:scale-95'
                    }`}
                    title="Canlı Konuşma"
                    aria-label="Canlı Konuşma"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveBottomTab('anamnesis')}
                    disabled={activeBottomTab === 'anamnesis'}
                    className={`p-1 rounded-lg transition-all ${
                      activeBottomTab === 'anamnesis'
                        ? 'opacity-30 cursor-not-allowed text-slate-400'
                        : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 cursor-pointer active:scale-95'
                    }`}
                    title="Anlık Özet & Anamnez"
                    aria-label="Anlık Özet & Anamnez"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <span className="text-teal-800 dark:text-teal-300 font-bold tracking-tight text-xs md:text-sm pl-1 border-l border-black/[0.06] dark:border-white/[0.08]">
                  {targetLanguage.nameTr}
                </span>
              </div>
            )}
          </div>

          {/* Viewport: Either Simultaneous Side-by-Side (Tablet Landscape / Desktop) OR Swipeable Sheet (Mobile / Tablet Portrait) */}
          {isWideScreen ? (
            /* WIDE SCREEN: SIMULTANEOUS DUAL-PANE VIEW (Spacious, Maximized Full Height & Width) */
            <div className="flex-1 min-h-0 w-full grid grid-cols-2 divide-x divide-black/[0.05] dark:divide-white/[0.06] overflow-hidden">
              {/* Left Pane: Canlı Konuşma */}
              <div className="h-full flex flex-col min-h-0 overflow-hidden">
                <TranscriptView
                  messages={messages}
                  interimText={interimText}
                  targetLanguageName={targetLanguage.nameTr}
                  targetLanguageCode={targetLanguage.code}
                  onUpdateMessage={handleUpdateMessage}
                  onGenerateSummary={handleGenerateSummary}
                  dialogueMessagesCount={dialogueMessagesCount}
                  selectedVoice={selectedVoice}
                />
              </div>

              {/* Right Pane: Anlık Klinik Anamnez */}
              <div className="h-full flex flex-col min-h-0 overflow-hidden bg-slate-50/20 dark:bg-slate-900/10">
                <LiveAnamnesisPanel
                  anamnesis={activeAnamnesis}
                  targetLanguageName={targetLanguage.nameTr}
                />
              </div>
            </div>
          ) : (
            /* MOBILE / TABLET PORTRAIT: SINGLE PANE WITH HORIZONTAL SWIPE GESTURE */
            <div
              className="flex-1 min-h-0 w-full overflow-hidden relative"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="w-[200%] h-full flex flex-row transition-transform duration-300 ease-out will-change-transform"
                style={{
                  transform: activeBottomTab === 'dialogue' ? 'translateX(0%)' : 'translateX(-50%)',
                }}
              >
                {/* Window / Page 1: Canlı Konuşma Baloncukları */}
                <div className="w-1/2 h-full flex flex-col min-h-0 overflow-hidden">
                  <TranscriptView
                    messages={messages}
                    interimText={interimText}
                    targetLanguageName={targetLanguage.nameTr}
                    targetLanguageCode={targetLanguage.code}
                    onUpdateMessage={handleUpdateMessage}
                    onGenerateSummary={handleGenerateSummary}
                    dialogueMessagesCount={dialogueMessagesCount}
                    selectedVoice={selectedVoice}
                  />
                </div>

                {/* Window / Page 2: Anlık Özet & Klinik Anamnez */}
                <div className="w-1/2 h-full flex flex-col min-h-0 overflow-hidden">
                  <LiveAnamnesisPanel
                    anamnesis={activeAnamnesis}
                    targetLanguageName={targetLanguage.nameTr}
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Minimalist Signature Footer in Liquid Glass Panel with Demo Badge */}
      <footer className="pb-safe py-2 px-4 text-center liquid-glass-panel border-t border-black/[0.03] dark:border-white/[0.05] shrink-0 select-none transition-colors duration-200 flex flex-col items-center justify-center gap-1.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/30 dark:border-amber-400/30 text-amber-800 dark:text-amber-300 text-[10px] font-bold tracking-wider uppercase shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
          <span>Demo Sürümü</span>
          <span className="text-amber-600/70 dark:text-amber-400/70 font-medium normal-case">· Klinik Değerlendirme Modu</span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-tight">
          Hakan Karaarslan tarafından oluşturulmuştur
        </p>
      </footer>

      {/* Combined Settings Modal (Theme Switch & User Guide) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenGuide={() => setIsOnboardingOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        historyCount={conversationHistory.length}
        onClearHistory={handleClearAllHistory}
        selectedVoice={selectedVoice}
        onSelectVoice={handleSelectVoice}
      />

      {/* Conversation History Modal */}
      <ConversationHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={conversationHistory}
        onDeleteHistoryItem={handleDeleteHistoryItem}
        onClearAllHistory={handleClearAllHistory}
        onRestoreConversation={handleRestoreConversation}
      />

      {/* First-Time User Onboarding & Quick Start Guide Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen && !showSplash}
        onClose={() => setIsOnboardingOpen(false)}
      />

      {/* Language Selector Modal */}
      <LanguageSelectorModal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
        selectedLanguage={targetLanguage}
        onSelect={handleSelectLanguage}
      />

      {/* AI Clinical Conversation Summary Modal */}
      <ConversationSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        summary={summary}
        isLoading={isGeneratingSummary}
        onRegenerate={handleGenerateSummary}
        targetLanguageName={targetLanguage.nameTr}
      />
    </div>
  );
}



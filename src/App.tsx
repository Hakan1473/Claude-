import { useState, useEffect, useRef, useMemo } from 'react';
import { Settings, SquarePen, ChevronDown, Plus, MessagesSquare, ClipboardList } from 'lucide-react';
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
import { SegmentedControl } from './components/ui/SegmentedControl';
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

    // Abort stale requests so an older (or previous conversation's) answer never overwrites a newer one
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/live-anamnesis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: dialogueMsgs,
            targetLanguage: targetLanguage.nameTr,
          }),
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          if (!controller.signal.aborted) setAiAnamnesis(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) console.debug('AI Anamnesis sync note:', err);
      }
    }, 1200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
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
          // Merge so the original timestamp, language and extracted entities survive the heal
          setMessages((prev) =>
            prev.map((m) => (m.id === healed.id ? { ...m, ...healed, timestamp: m.timestamp } : m))
          );
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
    setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
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
    sessionRef.current?.resetConversationContext();
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
    sessionRef.current?.resetConversationContext();
    setTargetLanguage(item.targetLanguage);
    // Keep a running live session in sync with the restored conversation's language
    if (sessionRef.current && sessionState !== 'idle' && item.targetLanguage.code !== targetLanguage.code) {
      sessionRef.current.setTargetLanguage(item.targetLanguage);
    }
    setAiAnamnesis(null);
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
      sessionRef.current?.resetConversationContext();
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
    sessionRef.current?.resetConversationContext();
    setMessages([]);
    setSummary(null);
    setInterimText('');
  };

  const dialogueMessagesCount = messages.filter(
    (m) => m.speaker === 'nurse' || m.speaker === 'patient'
  ).length;

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-bg text-label overflow-hidden font-sans antialiased">
      {/* Ambient light field */}
      <div aria-hidden="true" className="ambient" />

      {/* App Launch Splash Screen */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {/* Network / Permission Alerts */}
      {!isOnline && <OfflineNotice />}
      {permissionError && <PermissionNotice onDismiss={() => setPermissionError(false)} />}
      {errorMessage && <ErrorNotice message={errorMessage} onDismiss={() => setErrorMessage(null)} />}

      {/* Translucent navigation bar */}
      <header className="relative pt-safe material hairline-b shrink-0 select-none z-20">
        <div className="h-[52px] sm:h-14 flex items-center justify-between gap-3 w-full max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src="/logo.png"
                alt="Canlı Sesli Tercüman"
                className="w-8 h-8 rounded-[9px] object-contain bg-white shadow-[0_0_0_0.5px_var(--hairline),0_1px_3px_rgba(0,0,0,0.08)]"
              />
              {sessionState !== 'idle' && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-sys-green ring-2 ring-bg" />
              )}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-[15px] sm:text-[16px] font-semibold tracking-[-0.02em] text-label truncate">
                Tercüman
              </p>
              <p className="hidden sm:block text-[12px] text-label-2 truncate">Sağlık personeli ve hasta iletişimi</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Active target language (opens full language sheet) */}
            <button
              type="button"
              data-shot="lang"
              onClick={() => setIsLanguageModalOpen(true)}
              className="pressable btn-gray h-9 pl-2.5 pr-2 rounded-full inline-flex items-center gap-2 text-[14px] font-medium cursor-pointer"
              title="Hedef dili seç veya değiştir"
            >
              <CountryFlag flag={targetLanguage.flag} code={targetLanguage.code} country={targetLanguage.country} size="xs" />
              <span className="max-w-[110px] sm:max-w-none truncate">
                <span className="hidden sm:inline">{targetLanguage.nameTr}</span>
                <span className="sm:hidden">{targetLanguage.nameTr.split(' ')[0]}</span>
              </span>
              <ChevronDown className="w-4 h-4 text-label-2" strokeWidth={2.25} />
            </button>

            {/* New conversation (archives the current one) */}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleNewConversation}
                className="pressable icon-btn cursor-pointer text-accent"
                title="Mevcut konuşmayı arşive kaydet ve yeni konuşma başlat"
                aria-label="Yeni Sohbet"
              >
                <SquarePen className="w-[18px] h-[18px]" strokeWidth={2} />
              </button>
            )}

            {/* Settings (voice, theme, guide & history) */}
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="pressable icon-btn cursor-pointer relative"
              title="Ayarlar"
              aria-label="Ayarlar"
            >
              <Settings className="w-[18px] h-[18px]" strokeWidth={2} />
              {conversationHistory.length > 0 && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-bg" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Quick language rail */}
      <div className="relative z-10 shrink-0 select-none w-full max-w-[1600px] mx-auto">
        <div className="fade-x flex items-center gap-2 overflow-x-auto no-scrollbar px-4 sm:px-6 pt-3 pb-1">
          {frequentLanguages.map((lang) => {
            const isSelected = targetLanguage.code === lang.code;
            return (
              <button
                type="button"
                key={lang.code}
                onClick={() => handleSelectLanguage(lang)}
                aria-pressed={isSelected}
                className={`pressable h-8 pl-2 pr-3.5 rounded-full text-[13px] whitespace-nowrap inline-flex items-center gap-2 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-label text-bg font-semibold'
                    : 'bg-surface text-label font-medium shadow-card hover:bg-surface-2'
                }`}
              >
                <CountryFlag flag={lang.flag} code={lang.code} country={lang.country} size="xs" />
                <span>{lang.nameTr.split(' ')[0]}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setIsLanguageModalOpen(true)}
            className="pressable h-8 px-3.5 rounded-full text-[13px] font-medium text-accent-ink bg-accent-soft hover:brightness-105 whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>Tüm Diller</span>
          </button>
        </div>
      </div>

      {/* Main view */}
      <main className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden w-full max-w-[1600px] mx-auto px-3 sm:px-6">
        {/* Centerpiece: microphone control */}
        <section className="shrink-0 flex flex-col items-center w-full">
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

        {/* Conversation + anamnesis: side by side on wide screens, swipeable on phones */}
        <section className="card flex-1 flex flex-col min-h-0 overflow-hidden mt-3 mb-2 sm:mb-3">
          {isWideScreen ? (
            <div className="hairline-b grid grid-cols-2 shrink-0 select-none">
              <div className="flex items-center gap-2 px-6 h-12">
                <span className="glyph w-6 h-6 rounded-[7px] bg-accent">
                  <MessagesSquare className="w-3.5 h-3.5" strokeWidth={2.25} />
                </span>
                <h2 className="text-[15px] font-semibold tracking-[-0.016em]">Canlı Konuşma</h2>
                {dialogueMessagesCount > 0 && (
                  <span className="text-[13px] text-label-2 tabular">{dialogueMessagesCount} ileti</span>
                )}
              </div>
              <div className="flex items-center gap-2 px-6 h-12 hairline-l">
                <span className="glyph w-6 h-6 rounded-[7px] bg-sys-indigo">
                  <ClipboardList className="w-3.5 h-3.5" strokeWidth={2.25} />
                </span>
                <h2 className="text-[15px] font-semibold tracking-[-0.016em]">Anlık Özet & Anamnez</h2>
                {totalAnamnesisCount > 0 && (
                  <span className="text-[13px] text-label-2 tabular">{totalAnamnesisCount} veri</span>
                )}
                <span className="ml-auto text-[13px] text-label-2 truncate">Türkçe ⇄ {targetLanguage.nameTr}</span>
              </div>
            </div>
          ) : (
            <div className="px-3 pt-3 pb-2 shrink-0 select-none">
              <SegmentedControl
                ariaLabel="Görünüm seçimi"
                value={activeBottomTab}
                onChange={setActiveBottomTab}
                items={[
                  {
                    id: 'dialogue',
                    label: 'Canlı Konuşma',
                    title: 'Canlı konuşma',
                    badge:
                      dialogueMessagesCount > 0 ? (
                        <span className="text-[12px] text-label-2 font-medium tabular">{dialogueMessagesCount}</span>
                      ) : undefined,
                  },
                  {
                    id: 'anamnesis',
                    label: 'Özet & Anamnez',
                    title: 'Anlık yapay zeka klinik anamnez ve özet',
                    badge:
                      totalAnamnesisCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[12px] text-label-2 font-medium tabular">
                          <span className="w-1.5 h-1.5 rounded-full bg-sys-green" />
                          {totalAnamnesisCount}
                        </span>
                      ) : undefined,
                  },
                ]}
              />
            </div>
          )}

          {isWideScreen ? (
            <div className="flex-1 min-h-0 w-full grid grid-cols-2 overflow-hidden">
              <div className="h-full flex flex-col min-h-0 overflow-hidden">
                <TranscriptView
                  messages={messages}
                  interimText={interimText}
                  targetLanguageName={targetLanguage.nameTr}
                  targetLanguageCode={targetLanguage.code}
                  onUpdateMessage={handleUpdateMessage}
                  onGenerateSummary={() => handleGenerateSummary()}
                  dialogueMessagesCount={dialogueMessagesCount}
                  selectedVoice={selectedVoice}
                />
              </div>
              <div className="h-full flex flex-col min-h-0 overflow-hidden hairline-l bg-surface-2/40">
                <LiveAnamnesisPanel anamnesis={activeAnamnesis} targetLanguageName={targetLanguage.nameTr} />
              </div>
            </div>
          ) : (
            <div
              className="flex-1 min-h-0 w-full overflow-hidden relative"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="w-[200%] h-full flex flex-row transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform"
                style={{
                  transform: activeBottomTab === 'dialogue' ? 'translateX(0%)' : 'translateX(-50%)',
                }}
              >
                <div className="w-1/2 h-full flex flex-col min-h-0 overflow-hidden" aria-hidden={activeBottomTab !== 'dialogue'}>
                  <TranscriptView
                    messages={messages}
                    interimText={interimText}
                    targetLanguageName={targetLanguage.nameTr}
                    targetLanguageCode={targetLanguage.code}
                    onUpdateMessage={handleUpdateMessage}
                    onGenerateSummary={() => handleGenerateSummary()}
                    dialogueMessagesCount={dialogueMessagesCount}
                    selectedVoice={selectedVoice}
                  />
                </div>
                <div className="w-1/2 h-full flex flex-col min-h-0 overflow-hidden" aria-hidden={activeBottomTab !== 'anamnesis'}>
                  <LiveAnamnesisPanel anamnesis={activeAnamnesis} targetLanguageName={targetLanguage.nameTr} />
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Signature footer */}
      <footer className="relative z-10 pb-safe shrink-0 select-none">
        <p className="px-4 pb-2 text-center text-[11px] text-label-3 tracking-[-0.003em]">
          <span className="font-semibold text-sys-orange">Demo</span>
          <span className="hidden sm:inline"> · Klinik değerlendirme modu</span>
          <span> · Hakan Karaarslan tarafından oluşturulmuştur</span>
        </p>
      </footer>

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

      <ConversationHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={conversationHistory}
        onDeleteHistoryItem={handleDeleteHistoryItem}
        onClearAllHistory={handleClearAllHistory}
        onRestoreConversation={handleRestoreConversation}
      />

      <OnboardingModal isOpen={isOnboardingOpen && !showSplash} onClose={() => setIsOnboardingOpen(false)} />

      <LanguageSelectorModal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
        selectedLanguage={targetLanguage}
        onSelect={handleSelectLanguage}
      />

      <ConversationSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        summary={summary}
        isLoading={isGeneratingSummary}
        onRegenerate={() => handleGenerateSummary()}
        targetLanguageName={targetLanguage.nameTr}
      />
    </div>
  );
}

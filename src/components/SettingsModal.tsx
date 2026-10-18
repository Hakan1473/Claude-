import { useState, useRef, useEffect, type FC } from 'react';
import {
  Sun,
  Moon,
  Clock,
  ChevronRight,
  Check,
  CheckCircle2,
  Tablet,
  Play,
  Square,
  Monitor,
  ShieldCheck,
  BookOpen,
  Bell,
  Wind,
  Lock,
} from 'lucide-react';
import type { GeminiVoiceName } from '../types/interpreter';
import { GEMINI_VOICE_OPTIONS } from '../utils/voiceOptions';
import { playNormalizedAudioWav } from '../services/audio/pcmHelper';
import { NURSE_CALL_VIDEO_URL, TRIFLOW_VIDEO_URL } from '../utils/medicalTutorialDetection';
import { Sheet } from './ui/Sheet';
import { SegmentedControl } from './ui/SegmentedControl';

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

  const sectionHeader = (text: string) => (
    <h3 className="px-4 mb-1.5 text-[13px] font-medium text-label-2 tracking-[-0.004em]">{text}</h3>
  );
  const sectionFooter = (text: React.ReactNode) => (
    <p className="px-4 mt-2 text-[13px] leading-snug text-label-2">{text}</p>
  );

  const videoModules: {
    id: 'nurse_call' | 'triflow';
    title: string;
    desc: string;
    url: string;
    glyph: string;
    icon: typeof Bell;
  }[] = [
    {
      id: 'nurse_call',
      title: 'Hemşire Çağrı Butonu',
      desc: '"Beni çağırmak için butona basın" dendiğinde hastaya kullanım videosu açılır.',
      url: NURSE_CALL_VIDEO_URL,
      glyph: 'bg-sys-red',
      icon: Bell,
    },
    {
      id: 'triflow',
      title: 'Triflow Solunum Cihazı',
      desc: '"Triflow ile derin nefes çekin" talimatında doğru nefes egzersizi gösterilir.',
      url: TRIFLOW_VIDEO_URL,
      glyph: 'bg-sys-teal',
      icon: Wind,
    },
  ];

  const anamnesisFeatures: [string, string][] = [
    ['Anında analiz', 'Konuşma devam ederken şikayetler, ilaçlar ve öyküler anlık olarak yan panele işlenir.'],
    ['Doz olmadan ilaç tespiti', 'Parol, Beloc, Novalgin gibi ilaçlar doz söylenmese bile temiz isimleriyle yakalanır.'],
    ['Akıllı tekilleştirme', 'Aynı alerji veya hastalık defalarca söylense de tek kayıt olarak listelenir.'],
    ['Olumsuzluk filtresi', '"Alerjim yok", "Ameliyat olmadım" gibi yokluk bildirimleri kaydedilmez.'],
    ['HBYS formatında kopyalama', 'Panelin üstündeki Kopyala ile tüm anamnez tek dokunuşla kayıt sistemine aktarılır.'],
  ];

  return (
    <Sheet
      onClose={onClose}
      title="Ayarlar"
      subtitle="Seslendirme, görünüm ve sistem yönetimi"
      widthClass="sm:max-w-2xl"
      fixedHeight
      bodyClassName="px-4 sm:px-6 pb-6"
      footer={
        <>
          <span className="flex-1 text-[12px] text-label-3">İki Yönlü Canlı Çevirmen v2.2</span>
          <button
            type="button"
            onClick={onClose}
            className="pressable btn-primary h-9 px-5 rounded-full text-[15px] font-semibold cursor-pointer"
          >
            Bitti
          </button>
        </>
      }
    >
      <div className="sheet-sticky sticky top-0 z-10 pb-4">
        <SegmentedControl
          ariaLabel="Ayar kategorileri"
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { id: 'voice', label: 'Ses' },
            { id: 'appearance', label: 'Görünüm' },
            {
              id: 'history',
              label: 'Geçmiş',
              badge:
                historyCount > 0 ? <span className="text-[12px] text-label-2 tabular">{historyCount}</span> : undefined,
            },
            { id: 'guide', label: 'Kılavuz' },
          ]}
        />
      </div>

      {/* VOICE */}
      {activeTab === 'voice' && (
        <div className="anim-fade space-y-6">
          <div>
            {sectionHeader('Tercüman sesi')}
            <div className="group-list">
              {GEMINI_VOICE_OPTIONS.map((voice) => {
                const isSelected = selectedVoice === voice.id;
                const isTesting = testingVoiceId === voice.id;
                const isFemale = voice.gender === 'female';

                return (
                  <div
                    key={voice.id}
                    onClick={() => onSelectVoice?.(voice.id)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onSelectVoice?.(voice.id);
                      }
                    }}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-fill-2 active:bg-fill"
                  >
                    <span
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-[16px] font-semibold text-white shrink-0 ${
                        isFemale
                          ? 'bg-[linear-gradient(160deg,#ff8fa3,#ff2d55)]'
                          : 'bg-[linear-gradient(160deg,#7ab8ff,#0071e3)]'
                      }`}
                    >
                      {voice.name[0]}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-medium tracking-[-0.016em] text-label truncate">
                        {voice.name}
                        <span className="ml-1.5 text-[13px] font-normal text-label-2">{isFemale ? 'Kadın' : 'Erkek'}</span>
                      </p>
                      <p className="text-[13px] text-label-2 leading-snug truncate">{voice.toneTr}</p>
                      <p className="text-[12px] text-label-3 leading-snug line-clamp-1 mt-0.5">{voice.descriptionTr}</p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleTestVoice(voice.id, e)}
                      title={isTesting ? 'Sesi Durdur' : 'Örnek Sesi Dinle'}
                      aria-label={isTesting ? 'Sesi Durdur' : 'Örnek Sesi Dinle'}
                      className={`pressable w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer ${
                        isTesting ? 'btn-primary' : 'btn-tinted'
                      }`}
                    >
                      {isTesting ? (
                        <Square className="w-3 h-3 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </button>

                    <span className="w-5 flex justify-center shrink-0">
                      {isSelected && <Check className="w-5 h-5 text-accent" strokeWidth={2.75} />}
                    </span>
                  </div>
                );
              })}
            </div>
            {sectionFooter(
              <>
                Aktif ses: <span className="text-label font-medium">{currentVoiceObj?.name}</span>. Konuşma sırasında
                değiştirilirse bir sonraki cümle kesintisiz olarak yeni sesle seslendirilir.
              </>
            )}
          </div>
        </div>
      )}

      {/* APPEARANCE */}
      {activeTab === 'appearance' && (
        <div className="anim-fade space-y-6">
          <div>
            {sectionHeader('Görünüm')}
            <div className="rounded-[14px] bg-surface dark:bg-surface-2 px-4 sm:px-8 pt-5 pb-4 grid grid-cols-2 gap-4 sm:gap-8">
              {(['light', 'dark'] as const).map((mode) => {
                const active = theme === mode;
                const isDarkTile = mode === 'dark';
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      if (theme !== mode) onToggleTheme();
                    }}
                    aria-pressed={active}
                    className="group flex flex-col items-center gap-3 cursor-pointer"
                  >
                    {/* Miniature screen preview */}
                    <span
                      className={`relative w-full max-w-[150px] aspect-[3/4] rounded-[18px] overflow-hidden p-2.5 flex flex-col gap-1.5 transition-shadow ${
                        isDarkTile ? 'bg-black' : 'bg-[#f5f5f7]'
                      } ${active ? 'ring-[3px] ring-accent' : 'ring-1 ring-separator group-hover:ring-label-3'}`}
                    >
                      <span className={`h-2 w-2/3 rounded-full ${isDarkTile ? 'bg-white/25' : 'bg-black/15'}`} />
                      <span className="mx-auto mt-2 w-9 h-9 rounded-full bg-[#0071e3]" />
                      <span className={`mt-2 flex-1 rounded-[10px] p-1.5 flex flex-col gap-1 ${isDarkTile ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
                        <span className={`h-1.5 w-4/5 rounded-full ${isDarkTile ? 'bg-white/20' : 'bg-black/10'}`} />
                        <span className={`h-1.5 w-3/5 rounded-full ${isDarkTile ? 'bg-white/20' : 'bg-black/10'}`} />
                        <span className="mt-auto h-4 w-4/5 self-end rounded-[6px] bg-[#0071e3]/25" />
                      </span>
                    </span>
                    <span className="text-[15px] font-medium text-label inline-flex items-center gap-1.5">
                      {isDarkTile ? <Moon className="w-4 h-4" strokeWidth={2} /> : <Sun className="w-4 h-4" strokeWidth={2} />}
                      {isDarkTile ? 'Koyu' : 'Açık'}
                    </span>
                    <span
                      className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-colors ${
                        active ? 'bg-accent text-white' : 'ring-[1.5px] ring-label-3'
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
            {sectionFooter('Açık mod gündüz klinik kullanımı, koyu mod gece nöbetleri ve loş hasta odaları için idealdir.')}
          </div>

          <div>
            <div className="group-list">
              <div className="flex items-start gap-3 px-4 py-3">
                <span className="glyph w-[29px] h-[29px] bg-sys-indigo mt-0.5">
                  <Tablet className="w-4 h-4" strokeWidth={2.25} />
                </span>
                <div>
                  <p className="text-[16px] tracking-[-0.016em] text-label">Büyük Ekran Optimizasyonu</p>
                  <p className="text-[13px] text-label-2 leading-snug mt-0.5">
                    iPad, Galaxy Tab ve geniş ekranlarda yatay ve dikey yönelimde okunabilirlik için otomatik
                    uyarlanır.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {activeTab === 'history' && (
        <div className="anim-fade space-y-6">
          {onOpenHistory && (
            <div>
              {sectionHeader('Klinik konuşma geçmişi')}
              <div className="group-list">
                <button
                  type="button"
                  onClick={handleOpenHistoryClick}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer transition-colors hover:bg-fill-2 active:bg-fill"
                >
                  <span className="glyph w-[29px] h-[29px] bg-sys-indigo">
                    <Clock className="w-4 h-4" strokeWidth={2.25} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[16px] tracking-[-0.016em] text-label">Önceki Konuşmaları Aç</span>
                    <span className="block text-[13px] text-label-2">Seanslar, tarihler ve özet raporları</span>
                  </span>
                  {historyCount > 0 && <span className="text-[15px] text-label-2 tabular">{historyCount}</span>}
                  <ChevronRight className="w-4 h-4 text-label-3" strokeWidth={2.5} />
                </button>
              </div>
              {sectionFooter('Hasta-hemşire konuşmaları yalnızca bu cihazın tarayıcı hafızasında saklanır.')}
            </div>
          )}

          {historyCount > 0 && onClearHistory && (
            <div className="group-list">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Tüm geçmiş konuşma kayıtları silinsin mi?')) {
                    onClearHistory();
                  }
                }}
                className="w-full px-4 py-3 text-[16px] text-sys-red text-center cursor-pointer transition-colors hover:bg-fill-2 active:bg-fill"
              >
                Tüm Geçmiş Konuşmaları Temizle
              </button>
            </div>
          )}
        </div>
      )}

      {/* GUIDE */}
      {activeTab === 'guide' && (
        <div className="anim-fade space-y-6">
          <div>
            {sectionHeader('Başlarken')}
            <div className="group-list">
              <button
                type="button"
                onClick={handleOpenGuideClick}
                className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer transition-colors hover:bg-fill-2 active:bg-fill"
              >
                <span className="glyph w-[29px] h-[29px] bg-accent">
                  <BookOpen className="w-4 h-4" strokeWidth={2.25} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[16px] tracking-[-0.016em] text-label">Hızlı Başlangıç Rehberi</span>
                  <span className="block text-[13px] text-label-2 truncate">
                    Dil seçimi, çift yönlü konuşma, video kartları ve tablet modu
                  </span>
                </span>
                <span className="text-[15px] text-label-2">7 adım</span>
                <ChevronRight className="w-4 h-4 text-label-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div>
            {sectionHeader('Videolu eğitimler')}
            <div className="group-list">
              {videoModules.map((mod) => {
                const Icon = mod.icon;
                const isOpenPreview = activeVideoPreview === mod.id;
                return (
                  <div key={mod.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`glyph w-[29px] h-[29px] ${mod.glyph}`}>
                        <Icon className="w-4 h-4" strokeWidth={2.25} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[16px] tracking-[-0.016em] text-label">{mod.title}</p>
                        <p className="text-[13px] text-label-2 leading-snug">{mod.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveVideoPreview(isOpenPreview ? null : mod.id)}
                        className={`pressable h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-[13px] font-medium cursor-pointer shrink-0 ${
                          isOpenPreview ? 'btn-gray' : 'btn-tinted'
                        }`}
                      >
                        {isOpenPreview ? (
                          <span>Kapat</span>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>İzle</span>
                          </>
                        )}
                      </button>
                    </div>
                    {isOpenPreview && (
                      <video
                        src={mod.url}
                        controls
                        autoPlay
                        playsInline
                        className="anim-fade mt-3 w-full rounded-[12px] bg-black aspect-video object-contain"
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {sectionFooter(
              'Personel cihazı veya butonu tarif ettiğinde sistem bunu algılar ve konuşma balonunun altında videolu rehber sunar.'
            )}
          </div>

          <div>
            {sectionHeader('Anlık özet ve anamnez')}
            <div className="group-list">
              {anamnesisFeatures.map(([title, body]) => (
                <div key={title} className="flex items-start gap-3 px-4 py-3">
                  <CheckCircle2 className="w-5 h-5 text-sys-green shrink-0 mt-px" strokeWidth={2} />
                  <div>
                    <p className="text-[15px] font-medium tracking-[-0.014em] text-label">{title}</p>
                    <p className="text-[13px] text-label-2 leading-snug mt-0.5">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            {sectionHeader('Ekran düzeni')}
            <div className="group-list">
              <div className="flex items-start gap-3 px-4 py-3">
                <span className="glyph w-[29px] h-[29px] bg-sys-gray mt-0.5">
                  <Monitor className="w-4 h-4" strokeWidth={2.25} />
                </span>
                <p className="text-[14px] text-label-2 leading-relaxed">
                  Tablet yatay çevrildiğinde veya geniş ekranlarda Canlı Konuşma ile Anlık Anamnez{' '}
                  <span className="text-label font-medium">yan yana</span> açılır. Telefonda veya dikey tablette sağa-sola
                  kaydırarak pencereler arasında geçiş yapabilirsiniz.
                </p>
              </div>
            </div>
          </div>

          <div>
            {sectionHeader('Gizlilik ve güvenlik')}
            <div className="group-list">
              <div className="flex items-start gap-3 px-4 py-3">
                <span className="glyph w-[29px] h-[29px] bg-sys-green mt-0.5">
                  <ShieldCheck className="w-4 h-4" strokeWidth={2.25} />
                </span>
                <p className="text-[14px] text-label-2 leading-relaxed">
                  Konuşmalar harf uyumu, soru eki ayrıştırması (mı/mi/musunuz) ve birleşik kelime ayrıştırması ("kan
                  basıncı", "500 mg Parol") süzgecinden geçirilir. Sistem yapay zekayı saptırmaya yönelik (prompt
                  injection) komutlara karşı korumalıdır.
                </p>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="glyph w-[29px] h-[29px] bg-accent">
                  <Lock className="w-4 h-4" strokeWidth={2.25} />
                </span>
                <p className="text-[14px] text-label-2 leading-snug">
                  Konuşmalar yalnızca bu cihazın yerel tarayıcı hafızasında saklanır; buluta gönderilmez.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
};

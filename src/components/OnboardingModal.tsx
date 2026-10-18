import { useState, useEffect, useCallback, type FC, type ReactNode } from 'react';
import {
  Globe,
  Mic,
  ChevronLeft,
  X,
  RefreshCw,
  Languages,
  Volume2,
  Plus,
  ClipboardList,
  Video,
  ShieldCheck,
  Smartphone,
  Monitor,
  Play,
  Check,
  ArrowRight,
} from 'lucide-react';
import { CountryFlag } from './CountryFlag';
import { NURSE_CALL_VIDEO_URL, TRIFLOW_VIDEO_URL } from '../utils/medicalTutorialDetection';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Step {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  bulletPoints: string[];
  icon: ReactNode;
  glyph: string;
  renderVisual: () => ReactNode;
}

/** Neutral stage that hosts each step's illustrative preview. */
const Stage: FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`w-full rounded-[18px] bg-surface-2 p-4 text-left ${className}`}>{children}</div>
);

const Chip: FC<{ active?: boolean; children: ReactNode }> = ({ active, children }) => (
  <span
    className={`h-8 pl-2 pr-3 rounded-full inline-flex items-center gap-2 text-[13px] shrink-0 ${
      active ? 'bg-label text-bg font-semibold' : 'bg-surface text-label font-medium shadow-card'
    }`}
  >
    {children}
  </span>
);

export const OnboardingModal: FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [playingVideo, setPlayingVideo] = useState<'nurse_call' | 'triflow' | null>(null);

  const steps: Step[] = [
    {
      id: 'step_language_selection',
      title: 'Dil Seçimi & +100 Dünya Dili',
      subtitle: 'Hastanın konuştuğu dili tek dokunuşla belirleyin',
      description:
        'Ekranın üstündeki hızlı dil çubuğundan hastanızın konuştuğu dili anında seçebilirsiniz. Aradığınız dil listede yoksa "Tüm Diller"e dokunarak 100’den fazla dünya dili ve lehçesi arasında arama yapabilirsiniz.',
      bulletPoints: [
        'Üst kısımdaki dil çubuğundan tek dokunuşla dil seçimi',
        '+100 dünya dili için kapsamlı arama ve ülke bayrakları',
        'Seçilen dil hafızaya alınır ve sonraki oturumlarda hatırlanır',
      ],
      icon: <Globe className="w-7 h-7" strokeWidth={2} />,
      glyph: 'bg-accent',
      renderVisual: () => (
        <Stage>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Chip active>
              <CountryFlag flag="🇬🇧" code="en" country="İngiltere" size="xs" />
              İngilizce
            </Chip>
            <Chip>
              <CountryFlag flag="🇩🇪" code="de" country="Almanya" size="xs" />
              Almanca
            </Chip>
            <Chip>
              <CountryFlag flag="🇷🇺" code="ru" country="Rusya" size="xs" />
              Rusça
            </Chip>
            <span className="h-8 px-3 rounded-full inline-flex items-center gap-1 text-[13px] font-medium bg-accent-soft text-accent-ink shrink-0">
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              Tüm Diller
            </span>
          </div>
        </Stage>
      ),
    },
    {
      id: 'step_start_session',
      title: 'Canlı İki Yönlü Tercüme',
      subtitle: 'Mikrofon butonuyla tercümanı hemen başlatın',
      description:
        'Ekranın ortasındaki mavi mikrofon butonuna dokunduğunuzda canlı ses hattı açılır. Siz Türkçe konuştuğunuzda sistem bunu hastanın diline çevirip seslendirir; hasta konuştuğunda ise size Türkçe seslendirir.',
      bulletPoints: [
        'Tek dokunuşla anında canlı tercüme bağlantısı',
        'Türkçe konuşan her zaman personel, yabancı dilde konuşan her zaman hasta olarak ayrıştırılır',
        'Doğal ve empatik yapay zeka ses tonlamasıyla anında seslendirme',
      ],
      icon: <Mic className="w-7 h-7" strokeWidth={2} />,
      glyph: 'bg-sys-green',
      renderVisual: () => (
        <Stage className="flex flex-col items-center gap-3 py-6">
          <span className="relative flex items-center justify-center">
            <span className="absolute -inset-2 rounded-full bg-accent/25 anim-breathe" />
            <span className="mic-hero relative w-16 h-16 rounded-full text-white flex items-center justify-center">
              <Mic className="w-7 h-7" strokeWidth={2} />
            </span>
          </span>
          <span className="text-[13px] font-medium text-label-2">Dokunun ve konuşmaya başlayın</span>
        </Stage>
      ),
    },
    {
      id: 'step_quick_language_switch',
      title: 'Kesintisiz Dil Değişimi',
      subtitle: 'Görüşmeyi durdurmadan anında dil değiştirin',
      description:
        'Görüşme esnasında hastanın farklı bir dil konuştuğunu fark ederseniz ya da hasta yakını başka bir dilde devreye girerse oturumu kapatmanıza gerek yoktur. Üst çubuktan yeni dile dokunduğunuz anda sistem görüşmeyi kesmeden çeviriye devam eder.',
      bulletPoints: [
        'Konuşmayı durdurmadan veya oturumu yeniden başlatmadan geçiş',
        'Yeni dil seçildiğinde sistem anında uyum sağlar',
        'Diyalog akışı ve kayıtlar korunur',
      ],
      icon: <RefreshCw className="w-7 h-7" strokeWidth={2} />,
      glyph: 'bg-sys-orange',
      renderVisual: () => (
        <Stage className="flex items-center justify-center gap-3">
          <Chip>
            <CountryFlag flag="🇬🇧" code="en" country="İngiltere" size="xs" />
            İngilizce
          </Chip>
          <ArrowRight className="w-4 h-4 text-label-3 shrink-0" strokeWidth={2.5} />
          <Chip active>
            <CountryFlag flag="🇸🇦" code="sa" country="Suudi Arabistan" size="xs" />
            Arapça
          </Chip>
        </Stage>
      ),
    },
    {
      id: 'step_realtime_anamnesis',
      title: 'Anlık Anamnez & Klinik Özet',
      subtitle: 'Konuşulan tıbbi bilgiler anında kategorize edilir',
      description:
        'Yapay zeka siz konuşurken görüşmeyi analiz eder. Hastanın şikayetleri, ilaçları, alerjileri, kronik hastalıkları, ameliyatları, alışkanlıkları ve talepleri anında "Özet & Anamnez" penceresine işlenir.',
      bulletPoints: [
        'Konuşma bittikten sonra değil, konuşurken anlık olarak işlenir',
        'Gereksiz sorular veya olumsuzluklar ("alerjim yok" vb.) elenir',
        'Tekrarlanan bilgiler tekilleştirilir, net bir klinik tablo sunulur',
      ],
      icon: <ClipboardList className="w-7 h-7" strokeWidth={2} />,
      glyph: 'bg-sys-indigo',
      renderVisual: () => (
        <Stage className="grid grid-cols-2 gap-2">
          {[
            ['Şikayetler', 'Göğüs ağrısı, nefes darlığı', 'bg-sys-pink'],
            ['İlaçlar', 'Parol 500 mg, Beloc', 'bg-sys-green'],
            ['Kronik Hastalık', 'Tip 2 diyabet', 'bg-sys-purple'],
            ['Alerjiler', 'Penisilin', 'bg-sys-red'],
          ].map(([label, value, dot]) => (
            <div key={label} className="rounded-[12px] bg-surface shadow-card px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-label-2 mb-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                {label}
              </span>
              <p className="text-[13px] font-medium text-label leading-snug">{value}</p>
            </div>
          ))}
        </Stage>
      ),
    },
    {
      id: 'step_dual_pane_responsive',
      title: 'Çift Pencere & Geniş Ekran',
      subtitle: 'Telefonda kaydırma, tablet ve bilgisayarda yan yana görünüm',
      description:
        'Uygulama ekran boyutunuza ve cihaz yönünüze göre uyarlanır. Telefonda veya dikey tablette alt bölüm parmağınızı sağa/sola kaydırarak değişir. Tablet yatay tutulduğunda veya bilgisayarda Canlı Konuşma ile Anlık Anamnez yan yana çalışır.',
      bulletPoints: [
        'Mobil / dikey ekran: kaydırarak Canlı Konuşma ve Anamnez arasında geçiş',
        'Tablet yatay / bilgisayar: iki pencere aynı anda yan yana',
        'Hasta konuşurken bir yandan anamnez tablosu izlenebilir',
      ],
      icon: <Monitor className="w-7 h-7" strokeWidth={2} />,
      glyph: 'bg-sys-gray',
      renderVisual: () => (
        <Stage className="flex items-end justify-center gap-5">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-[52px] h-[92px] rounded-[12px] bg-surface shadow-card p-1.5 flex flex-col gap-1">
              <span className="h-2 rounded-full bg-fill" />
              <span className="flex-1 rounded-[6px] bg-accent-soft" />
            </div>
            <span className="text-[11px] text-label-2 inline-flex items-center gap-1">
              <Smartphone className="w-3 h-3" /> Kaydır
            </span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-[150px] h-[92px] rounded-[12px] bg-surface shadow-card p-1.5 flex gap-1">
              <span className="flex-1 rounded-[6px] bg-accent-soft" />
              <span className="flex-1 rounded-[6px] bg-sys-indigo/15" />
            </div>
            <span className="text-[11px] text-label-2 inline-flex items-center gap-1">
              <Monitor className="w-3 h-3" /> Yan yana
            </span>
          </div>
        </Stage>
      ),
    },
    {
      id: 'step_medical_tutorials',
      title: 'Videolu Tıbbi Eğitimler',
      subtitle: 'Çağrı zili ve cihaz kullanımında hastaya videolu rehber',
      description:
        'Sağlık personeli hastaya Hemşire Çağrı Butonunu veya Triflow Solunum Cihazını nasıl kullanacağını anlattığında yapay zeka bunu algılar ve konuşma balonunun altında video kartı sunar.',
      bulletPoints: [
        'Hemşire çağrı zili anlatıldığında doğru buton kullanım videosu',
        'Triflow anlatıldığında doğru nefes alma tekniği videosu',
        'Videolar sessiz oynatılır, cihaz görsel olarak kolayca anlaşılır',
      ],
      icon: <Video className="w-7 h-7" strokeWidth={2} />,
      glyph: 'bg-sys-red',
      renderVisual: () => (
        <Stage className="flex flex-col gap-2.5">
          {playingVideo && (
            <div className="flex flex-col gap-1.5 anim-fade">
              <video
                src={playingVideo === 'nurse_call' ? NURSE_CALL_VIDEO_URL : TRIFLOW_VIDEO_URL}
                controls
                autoPlay
                playsInline
                className="w-full aspect-video object-contain rounded-[12px] bg-black"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['nurse_call', 'Çağrı Butonu', '"Beni çağırmak için butona basın"'],
                ['triflow', 'Triflow Cihazı', '"Derin nefes çekerek topları kaldırın"'],
              ] as const
            ).map(([id, label, hint]) => {
              const active = playingVideo === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPlayingVideo(active ? null : id)}
                  className={`pressable rounded-[12px] p-3 text-left cursor-pointer ${
                    active ? 'bg-accent text-white' : 'bg-surface shadow-card'
                  }`}
                >
                  <span
                    className={`flex items-center gap-1.5 text-[13px] font-semibold mb-0.5 ${
                      active ? 'text-white' : 'text-accent-ink'
                    }`}
                  >
                    {active ? <X className="w-3.5 h-3.5" strokeWidth={2.5} /> : <Play className="w-3 h-3 fill-current" />}
                    {label}
                  </span>
                  <span className={`block text-[11px] leading-snug ${active ? 'text-white/80' : 'text-label-2'}`}>
                    {hint}
                  </span>
                </button>
              );
            })}
          </div>
        </Stage>
      ),
    },
    {
      id: 'step_translate_and_audio',
      title: 'Yazılı Çeviri & Sesli Dinleme',
      subtitle: 'Her cümle için yazılı çeviri, sesli tekrar ve güvenlik',
      description:
        'Konuşma kartlarındaki "Çevir" butonuyla yazılı çeviriye ulaşabilir, hoparlör simgesiyle cümlenin sesli okunuşunu dilediğiniz kadar dinleyebilirsiniz. Sistem hatasız yazım sunar ve kötüye kullanıma karşı korumalıdır.',
      bulletPoints: [
        'Her kartın sağ üstünde bağımsız Dinle ve Çevir butonları',
        'Kelimelerin birbirine yapışması engellenmiş, düzgün imla',
        'Yapay zekayı saptırma girişimlerine karşı güvenlik kalkanı',
      ],
      icon: <Languages className="w-7 h-7" strokeWidth={2} />,
      glyph: 'bg-sys-teal',
      renderVisual: () => (
        <Stage className="flex flex-col gap-2.5">
          <div className="rounded-[14px] bg-surface shadow-card p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-semibold text-label-2">Hemşire · Türkçe</span>
              <span className="flex items-center gap-1.5">
                <span className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center">
                  <Volume2 className="w-3.5 h-3.5 text-label" strokeWidth={2} />
                </span>
                <span className="h-7 px-2.5 rounded-full bg-surface-2 text-accent-ink text-[12px] font-medium inline-flex items-center gap-1">
                  <Languages className="w-3 h-3" strokeWidth={2.25} />
                  Çevir
                </span>
              </span>
            </div>
            <p className="text-[14px] text-label leading-snug">Tansiyonunuzu ölçeceğim, lütfen kolunuzu uzatın.</p>
            <p className="mt-2 pt-2 hairline-t text-[13px] font-medium text-accent-ink leading-snug">
              I will check your blood pressure, please extend your arm.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-sys-green">
            <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2.25} />
            Klinik veri güvenliği ve hasta mahremiyeti koruması aktif
          </span>
        </Stage>
      ),
    },
  ];

  // Always reopen the guide from the first step (e.g. when launched again from Settings)
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setPlayingVideo(null);
    }
  }, [isOpen]);

  const current = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const handleFinish = useCallback(() => {
    try {
      localStorage.setItem('has_seen_medical_onboarding', 'true');
      // The key App.tsx checks on launch; without it the guide reopened on every visit
      localStorage.setItem('interpreter_onboarding_completed', 'true');
    } catch (_e) {
      // ignore
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        handleFinish();
      } else if (e.key === 'ArrowRight' && currentStep < steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        setCurrentStep((prev) => prev - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, steps.length, handleFinish]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-[2px] anim-fade" />

      <div className="sheet relative w-full sm:max-w-lg flex flex-col overflow-hidden rounded-t-[20px] sm:rounded-[26px] shadow-float max-h-[94dvh] sm:max-h-[88vh] pb-safe sm:pb-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 sm:px-5 pt-3 sm:pt-4 shrink-0">
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="pressable h-[30px] pl-1 pr-3 rounded-full text-accent text-[15px] inline-flex items-center gap-0.5 cursor-pointer hover:bg-fill-2"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
              Geri
            </button>
          ) : (
            <span className="text-[13px] font-medium text-label-2 pl-1">Hızlı Kullanım Kılavuzu</span>
          )}
          <button
            type="button"
            onClick={handleFinish}
            className="pressable w-[30px] h-[30px] rounded-full bg-fill text-label-2 hover:text-label flex items-center justify-center cursor-pointer"
            title="Kılavuzu Kapat"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div key={current.id} className="modal-body px-6 sm:px-9 pt-4 pb-4 overflow-y-auto flex-1 flex flex-col items-center text-center anim-rise">
          <span className={`glyph w-[60px] h-[60px] rounded-[16px] ${current.glyph} shadow-[0_8px_20px_-8px_rgba(0,0,0,0.35)]`}>
            {current.icon}
          </span>

          <p className="mt-4 text-[13px] font-medium text-label-2 tabular">
            Adım {currentStep + 1} / {steps.length}
          </p>
          <h2
            id="onboarding-title"
            className="mt-1 text-[26px] sm:text-[28px] font-bold tracking-[-0.03em] leading-[1.15] text-label"
          >
            {current.title}
          </h2>
          <p className="mt-2 text-[15px] sm:text-[16px] text-label-2 leading-snug max-w-sm">{current.subtitle}</p>

          <div className="w-full mt-6">{current.renderVisual()}</div>

          <p className="mt-5 text-[15px] text-label-2 leading-relaxed text-left w-full">{current.description}</p>

          <ul className="mt-4 w-full space-y-2.5 text-left">
            {current.bulletPoints.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-[15px] text-label leading-snug">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-accent-soft text-accent flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-9 pt-3 pb-5 shrink-0 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={isLast ? handleFinish : () => setCurrentStep((prev) => prev + 1)}
            className="pressable btn-primary w-full h-[50px] rounded-[14px] text-[17px] font-semibold tracking-[-0.022em] cursor-pointer"
          >
            {isLast ? 'Başlayın' : 'Devam'}
          </button>

          <div className="flex items-center gap-2">
            {steps.map((step, idx) => (
              <button
                type="button"
                key={step.id}
                onClick={() => setCurrentStep(idx)}
                className={`h-[7px] rounded-full transition-all duration-300 cursor-pointer ${
                  currentStep === idx ? 'w-[22px] bg-label' : 'w-[7px] bg-label-3/50 hover:bg-label-3'
                }`}
                title={`Adım ${idx + 1}`}
                aria-label={`Adım ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

import { useState, useEffect, useCallback, type FC } from 'react';
import {
  Globe,
  Mic,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Languages,
  Volume2,
  Search,
  FileText,
  SlidersHorizontal,
  Video,
  ShieldCheck,
  Smartphone,
  Monitor,
  Play,
} from 'lucide-react';
import { CountryFlag } from './CountryFlag';
import { NURSE_CALL_VIDEO_URL, TRIFLOW_VIDEO_URL } from '../utils/medicalTutorialDetection';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [playingVideo, setPlayingVideo] = useState<'nurse_call' | 'triflow' | null>(null);

  const steps = [
    {
      id: 'step_language_selection',
      badge: 'Adım 1 / 7',
      title: 'Dil Seçimi & +100 Dünya Dili',
      subtitle: 'Hastanın konuştuğu dili tek dokunuşla belirleyin',
      description:
        'Ekranın en üstünde yer alan hızlı dil çubuğundan hastanızın konuştuğu dili anında seçebilirsiniz. Aradığınız dil ilk listede yoksa "+ Tüm Diller" butonuna dokunarak 100’den fazla dünya dili ve lehçesi arasında hızlı arama yapabilirsiniz.',
      bulletPoints: [
        'Üst kısımdaki akıcı dil çubuğundan tek tıkla dil seçimi',
        '+100 dünya dili için kapsamlı arama ve ülke bayrakları',
        'Seçilen dil hafızaya alınır ve sonraki oturumlarda otomatik hatırlanır',
      ],
      renderVisual: () => (
        <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Üst Dil Seçim Çubuğu</span>
            </span>
            <span className="text-[10px] text-teal-700 dark:text-teal-300 font-medium bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
              Tek Tıkla Seç
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto py-1 px-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600 text-white shadow-sm flex items-center gap-2 shrink-0">
              <CountryFlag flag="🇬🇧" code="en" country="İngiltere" size="xs" />
              <span>İngilizce</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0 opacity-80">
              <CountryFlag flag="🇩🇪" code="de" country="Almanya" size="xs" />
              <span>Almanca</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0 opacity-80">
              <CountryFlag flag="🇷🇺" code="ru" country="Rusya" size="xs" />
              <span>Rusça</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0 opacity-80">
              <CountryFlag flag="🇸🇦" code="sa" country="Suudi Arabistan" size="xs" />
              <span>Arapça</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg text-xs font-medium border border-dashed border-teal-500/40 text-teal-700 dark:text-teal-300 flex items-center gap-1 shrink-0">
              <Search className="w-3 h-3" />
              <span>+ Tüm Diller</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'step_start_session',
      badge: 'Adım 2 / 7',
      title: 'Canlı İki Yönlü Tercüme & Rol Ayrımı',
      subtitle: 'Merkezi Başlat butonuyla yapay zeka tercümanı hemen başlatın',
      description:
        'Ekranın ortasındaki büyük "Başlat" butonuna dokunduğunuzda canlı ses hattı açılır. Siz Türkçe konuştuğunuzda sistem bunu hastanın diline çevirip seslendirir; hasta konuştuğunda ise Türkçe olarak size seslendirir.',
      bulletPoints: [
        'Büyük Başlat butonu ile anında canlı tercüme bağlantısı',
        'Türkçe konuşan her zaman hemşire/personel, yabancı dilde konuşan her zaman hasta olarak ayrıştırılır',
        'Doğal, empatik ve insansı yapay zeka ses tonlamasıyla konuşmalar anında seslendirilir',
      ],
      renderVisual: () => (
        <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-2.5">
          <div className="w-16 h-16 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex flex-col items-center justify-center shadow-md ring-4 ring-teal-500/20">
            <Mic className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Başlat</span>
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Dokunun ve doğrudan konuşmaya başlayın
          </span>
        </div>
      ),
    },
    {
      id: 'step_quick_language_switch',
      badge: 'Adım 3 / 7',
      title: 'Konuşma Sırasında Kesintisiz Dil Değişimi',
      subtitle: 'Görüşmeyi durdurmadan veya baştan başlatmadan anında dil değiştirin',
      description:
        'Görüşme esnasında hastanın farklı bir dil konuştuğunu fark ederseniz ya da hasta yakını başka bir dilde devreye girerse, oturumu kapatmanıza gerek yoktur. Üst dil çubuğundan yeni dile dokunduğunuz anda sistem görüşmeyi kesmeden yeni dille çeviriye devam eder.',
      bulletPoints: [
        'Konuşmayı durdurmadan veya oturumu baştan başlatmadan kesintisiz geçiş',
        'Tek tıkla yeni dil seçildiğinde sistem anında yeni dile uyum sağlar',
        'Diyalog akışı ve kayıtlar korunarak tercüme akışı devam eder',
      ],
      renderVisual: () => (
        <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Canlı Oturum Sırasında Dil Değişimi</span>
            </span>
            <span className="text-[10px] text-teal-700 dark:text-teal-300 font-semibold bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
              Kesintisiz
            </span>
          </div>
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Önceki:</span>
              <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <CountryFlag flag="🇬🇧" code="en" country="İngiltere" size="xs" />
                İngilizce
              </span>
              <span className="text-teal-600 font-bold">➔</span>
              <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-teal-600 text-white flex items-center gap-1">
                <CountryFlag flag="🇸🇦" code="sa" country="Suudi Arabistan" size="xs" />
                Arapça
              </span>
            </div>
            <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
              Anında Aktif
            </span>
          </div>
        </div>
      ),
    },
    {
      id: 'step_realtime_anamnesis',
      badge: 'Adım 4 / 7',
      title: 'Anlık Yapay Zeka Anamnez & Klinik Özet',
      subtitle: 'Konuşulan tüm tıbbi bilgiler anında kategorize edilir',
      description:
        'Yapay zeka siz konuşurken görüşmeyi derinlemesine analiz eder. Hastanın şikayetleri, kullandığı ilaçlar, doğrulanmış alerjileri, kronik hastalıkları, geçirdiği ameliyatlar, alışkanlıkları ve talepleri anında "Anlık Özet & Anamnez" penceresine işlenir.',
      bulletPoints: [
        'Konuşma bittikten sonra değil, konuşurken ANLIK olarak işlenir',
        'Kıdemli hekim/hemşire mantığıyla gereksiz sorular veya olumsuzluklar ("alerjim yok" vb.) elenir',
        'Tekrarlanan bilgiler tekilleştirilir, temiz ve net bir klinik tablo sunulur',
      ],
      renderVisual: () => (
        <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-teal-700 dark:text-teal-300">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Anlık Klinik Anamnez Paneli</span>
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
              Canlı Ayrıştırma
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-rose-600 block mb-0.5">Şikayetler:</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Göğüs ağrısı, Nefes darlığı</p>
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-emerald-600 block mb-0.5">İlaçlar:</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Parol 500 mg, Beloc</p>
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-purple-600 block mb-0.5">Kronik Hastalık:</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Tip 2 Diyabet, Hipertansiyon</p>
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-pink-600 block mb-0.5">Alerjiler:</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Penisilin Alerjisi</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'step_dual_pane_responsive',
      badge: 'Adım 5 / 7',
      title: 'Çift Pencere & Geniş Ekran / Tablet Yatay Modu',
      subtitle: 'Mobilde kaydırma hareketi, tablet ve bilgisayarda eşzamanlı yan yana görünüm',
      description:
        'Uygulama ekran boyutunuza ve cihaz yönünüze göre akıllıca uyarlanır. Akıllı telefon veya dikey tablette alt bölüm parmağınızı sağa/sola kaydırarak (swipe) değişir. Tablet yatay tutulduğunda veya bilgisayar ekranında ise Canlı Konuşma ile Anlık Anamnez EŞZAMANLI YAN YANA çalışır.',
      bulletPoints: [
        'Mobil / Dikey Ekran: Parmağınızı sağa-sola kaydırarak Canlı Konuşma ve Anamnez arasında geçiş',
        'Tablet Yatay / Bilgisayar Ekranı: İki pencere de aynı anda yan yana açık ve eşzamanlı canlı çalışır',
        'Geniş ekranda bölünmüş görünüm ile hasta konuşurken bir yandan anamnez tablosu izlenebilir',
      ],
      renderVisual: () => (
        <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
              <Monitor className="w-3.5 h-3.5" />
              <span>Duyarlı Ekran Deneyimi</span>
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
              <Smartphone className="w-3 h-3" /> Mobil & <Monitor className="w-3 h-3" /> Geniş Ekran
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
            <div className="flex-1 p-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-center">
              <span className="text-xs font-bold text-teal-800 dark:text-teal-300">Canlı Konuşma</span>
            </div>
            <div className="text-teal-600 font-bold text-xs shrink-0">+</div>
            <div className="flex-1 p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center">
              <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">Anlık Anamnez</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'step_medical_tutorials',
      badge: 'Adım 6 / 7',
      title: 'İnteraktif Videolu Tıbbi Eğitimler',
      subtitle: 'Hemşire çağrı zili ve cihaz kullanımı anlatıldığında hastaya videolu rehber',
      description:
        'Sağlık personeli hastaya Hemşire Çağrı Butonunu veya Triflow Solunum Cihazını nasıl kullanacağını anlattığında, yapay zeka bunu anında algılar ve konuşma balonunun altında hastanın dilinde açıklamalı interaktif video kartı sunar.',
      bulletPoints: [
        'Hemşire Çağrı Zili anlatıldığında hastaya doğru buton kullanım videosu gösterilir',
        'Triflow solunum egzersiz cihazı anlatıldığında doğru nefes alma tekniği videosu açılır',
        'Videolar sessiz oynatılır, hastanın görsel olarak cihazı doğru anlamasını sağlar',
      ],
      renderVisual: () => (
        <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-teal-700 dark:text-teal-300">
            <span className="flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Otomatik Algılanan Video Kartları</span>
            </span>
            <span className="text-[10px] bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded-full font-bold border border-teal-200 dark:border-teal-800">
              Görsel Rehberlik
            </span>
          </div>

          {/* Active video player if open */}
          {playingVideo && (
            <div className="flex flex-col gap-1.5 bg-black rounded-xl p-1 overflow-hidden animate-in fade-in">
              <video
                src={playingVideo === 'nurse_call' ? NURSE_CALL_VIDEO_URL : TRIFLOW_VIDEO_URL}
                controls
                autoPlay
                playsInline
                className="w-full aspect-video object-contain rounded-lg"
              />
              <button
                type="button"
                onClick={() => setPlayingVideo(null)}
                className="text-[10px] text-white/80 hover:text-white self-end px-2 py-0.5 font-bold cursor-pointer"
              >
                Kapat ✕
              </button>
            </div>
          )}

          {/* Video List Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPlayingVideo(playingVideo === 'nurse_call' ? null : 'nurse_call')}
              className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                playingVideo === 'nurse_call'
                  ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 ring-2 ring-teal-400/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-teal-400'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-teal-700 dark:text-teal-300">
                <Play className="w-3 h-3 fill-current shrink-0" />
                <span className="text-[11px] font-bold leading-tight">Çağrı Butonu</span>
              </div>
              <p className="text-[9.5px] text-slate-500 dark:text-slate-400 line-clamp-2">
                "Beni çağırmak için butona basın" dendiğinde açılır
              </p>
            </button>

            <button
              type="button"
              onClick={() => setPlayingVideo(playingVideo === 'triflow' ? null : 'triflow')}
              className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                playingVideo === 'triflow'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-400/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-indigo-700 dark:text-indigo-300">
                <Play className="w-3 h-3 fill-current shrink-0" />
                <span className="text-[11px] font-bold leading-tight">Triflow Cihazı</span>
              </div>
              <p className="text-[9.5px] text-slate-500 dark:text-slate-400 line-clamp-2">
                "Derin nefes çekerek topları kaldırın" dendiğinde açılır
              </p>
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 'step_translate_and_audio',
      badge: 'Adım 7 / 7',
      title: 'Yazılı Çeviri, Sesli Dinleme & Güvenlik Kalkanı',
      subtitle: 'Her cümlenin yazılı çevirisi, sesli tekrarı ve anti-manipülasyon koruması',
      description:
        'Konuşma baloncuklarındaki "Çevir" butonuyla yazılı çeviriye ulaşabilir, "Hoparlör" simgesiyle cümlenin sesli okunuşunu dilediğiniz kadar dinleyebilirsiniz. Sistem harf ve kelime ayrıştırmasıyla hatasız yazım sunar ve kötüye kullanımlara karşı korumalıdır.',
      bulletPoints: [
        'Her baloncuğun sağ üstünde bağımsız Çevir ve Dinle butonları',
        'Kelimelerin birbirine yapışması engellenmiş, mükemmel Türkçe ve yabancı dil imlası',
        'Kötü niyetli komutlara ve yapay zekayı saptırma girişimlerine karşı tam güvenlik kalkanı',
      ],
      renderVisual: () => (
        <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                Hemşire (Türkçe)
              </span>
              <div className="flex items-center gap-1.5">
                <div className="p-1 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  <Volume2 className="w-3.5 h-3.5" />
                </div>
                <div className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                  <Languages className="w-3 h-3 text-teal-600" />
                  <span>Çevir</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
              "Tansiyonunuzu ölçeceğim, lütfen kolunuzu uzatın."
            </p>
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/50 text-xs text-teal-900 dark:text-teal-100">
              <span className="text-[10px] font-bold block text-teal-700 dark:text-teal-400">ÇEVİRİ:</span>
              "I will check your blood pressure, please extend your arm."
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Klinik Veri Güvenliği ve Hasta Mahremiyeti Koruması Aktif</span>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[currentStep];

  const handleFinish = useCallback(() => {
    try {
      localStorage.setItem('has_seen_medical_onboarding', 'true');
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-800">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="inline-flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              {current.badge}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Hızlı Kullanım Kılavuzu</span>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Kılavuzu Kapat"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-3.5">
          <div>
            <h2 id="onboarding-title" className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {current.title}
            </h2>
            <p className="text-xs sm:text-sm text-teal-700 dark:text-teal-400 font-medium mt-0.5">
              {current.subtitle}
            </p>
          </div>

          {/* Step Visual Preview Area */}
          <div className="my-1">{current.renderVisual()}</div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {current.description}
          </p>

          <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            {current.bulletPoints.map((point) => (
              <div key={point} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          {/* Step Dot Indicators */}
          <div className="flex items-center gap-1.5">
            {steps.map((step, idx) => (
              <button
                type="button"
                key={step.id}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all duration-200 cursor-pointer ${
                  currentStep === idx
                    ? 'w-5 sm:w-6 bg-teal-600 dark:bg-teal-400'
                    : 'w-1.5 sm:w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                }`}
                title={`Adım ${idx + 1}`}
                aria-label={`Adım ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1 active:scale-95 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Geri</span>
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <span>Sonraki</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <span>Kılavuzu Tamamla</span>
                <Sparkles className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

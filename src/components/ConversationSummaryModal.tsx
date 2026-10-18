import { useState, type FC } from 'react';
import {
  FileText,
  X,
  Copy,
  Check,
  AlertCircle,
  HeartPulse,
  Coffee,
  CheckCircle2,
  Pill,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { ConversationSummary } from '../types/interpreter';

interface ConversationSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: ConversationSummary | null;
  isLoading: boolean;
  onRegenerate: () => void;
  targetLanguageName?: string;
}

export const ConversationSummaryModal: FC<ConversationSummaryModalProps> = ({
  isOpen,
  onClose,
  summary,
  isLoading,
  onRegenerate,
  targetLanguageName = 'Yabancı Hasta',
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!summary) return;

    const sections = [
      `KONUŞMA ÖZETİ (${targetLanguageName} ⇄ Türkçe)`,
      `Tarih: ${new Date(summary.timestamp).toLocaleString('tr-TR')}`,
      '',
      '--- GENEL ÖZET ---',
      summary.briefSummaryTr,
      '',
    ];

    if (summary.patientChiefComplaints.length > 0) {
      sections.push('--- DİLE GETİRİLEN ŞİKAYETLER & BELİRTİLER ---');
      summary.patientChiefComplaints.forEach((item) => {
        sections.push(`• ${item}`);
      });
      sections.push('');
    }

    if (summary.patientNeedsAndRequests.length > 0) {
      sections.push('--- İSTEK & TALEPLER (KLİMA, SU, KONFOR VB.) ---');
      summary.patientNeedsAndRequests.forEach((item) => {
        sections.push(`• ${item}`);
      });
      sections.push('');
    }

    if (summary.clinicalInstructions.length > 0) {
      sections.push('--- İLETİLEN TALİMAT & BİLGİLENDİRMELER ---');
      summary.clinicalInstructions.forEach((item) => {
        sections.push(`• ${item}`);
      });
      sections.push('');
    }

    if (summary.vitalSignsAndDosages.length > 0) {
      sections.push('--- KONUŞULAN ÖLÇÜM, İLAÇ & DEĞERLER ---');
      summary.vitalSignsAndDosages.forEach((item) => {
        sections.push(`• ${item}`);
      });
      sections.push('');
    }

    if (summary.actionItems.length > 0) {
      sections.push('--- TAKİP VE SONRAKİ ADIMLAR ---');
      summary.actionItems.forEach((item) => {
        sections.push(`• ${item}`);
      });
      sections.push('');
    }

    try {
      await navigator.clipboard.writeText(sections.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Clipboard write error:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Konuşma Özeti
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-600 text-white">
                  Yapay Zeka
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Görüşülen diyaloğun net ve anlaşılır konuşma dökümü
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {summary && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all active:scale-95 cursor-pointer"
                title="Tüm özeti kopyala"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400">Kopyalandı</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Kopyala</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 rounded-full transition-all active:scale-95 cursor-pointer"
              aria-label="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain font-sans">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-10 h-10 text-teal-600 dark:text-teal-400 animate-spin mb-3" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                Konuşma Özeti Hazırlanıyor...
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-400 max-w-xs">
                Yapay zeka tüm konuşmayı hızlıca tarayarak özet, istek ve önemli bilgileri çıkarıyor.
              </p>
            </div>
          ) : summary ? (
            <>
              {/* Executive Conversation Summary */}
              <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60">
                <div className="flex items-center gap-1.5 mb-1.5 text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
                  <FileText className="w-4 h-4" />
                  <span>Genel Konuşma Özeti</span>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {summary.briefSummaryTr}
                </p>
              </div>

              {/* Complaints & Symptoms */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 shadow-xs">
                <div className="flex items-center gap-1.5 mb-2.5 text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                  <HeartPulse className="w-4 h-4" />
                  <span>Dile Getirilen Şikayetler & Belirtiler</span>
                </div>
                {summary.patientChiefComplaints.length > 0 ? (
                  <ul className="space-y-1.5">
                    {summary.patientChiefComplaints.map((item) => (
                      <li
                        key={item}
                        className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 flex items-start gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 italic">Belirtilen bir şikayet kaydedilmedi.</p>
                )}
              </div>

              {/* Requests (e.g. AC, food, water) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 shadow-xs">
                <div className="flex items-center gap-1.5 mb-2.5 text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
                  <Coffee className="w-4 h-4" />
                  <span>İstek & Talepler (Klima, Konfor, Su vb.)</span>
                </div>
                {summary.patientNeedsAndRequests.length > 0 ? (
                  <ul className="space-y-1.5">
                    {summary.patientNeedsAndRequests.map((item) => (
                      <li
                        key={item}
                        className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 flex items-start gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 italic">Özel bir istek belirtilmedi.</p>
                )}
              </div>

              {/* Instructions Given */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 shadow-xs">
                <div className="flex items-center gap-1.5 mb-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>İletilen Bilgilendirme & Talimatlar</span>
                </div>
                {summary.clinicalInstructions.length > 0 ? (
                  <ul className="space-y-1.5">
                    {summary.clinicalInstructions.map((item) => (
                      <li
                        key={item}
                        className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 flex items-start gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 italic">Özel bir talimat kaydedilmedi.</p>
                )}
              </div>

              {/* Dosages, Measurements and Numbers */}
              {summary.vitalSignsAndDosages.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 shadow-xs">
                  <div className="flex items-center gap-1.5 mb-2.5 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    <Pill className="w-4 h-4" />
                    <span>Konuşulan Ölçüm, İlaç & Değerler</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.vitalSignsAndDosages.map((item) => (
                      <span
                        key={item}
                        className="px-2.5 py-1 rounded-lg bg-amber-100/80 dark:bg-amber-500/20 border border-amber-300/80 dark:border-amber-500/40 text-amber-900 dark:text-amber-300 font-mono font-semibold text-xs"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Action Items */}
              {summary.actionItems.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 shadow-xs">
                  <div className="flex items-center gap-1.5 mb-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                    <AlertCircle className="w-4 h-4" />
                    <span>Takip ve Sonraki Adımlar</span>
                  </div>
                  <ul className="space-y-1.5">
                    {summary.actionItems.map((item) => (
                      <li
                        key={item}
                        className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 flex items-start gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Henüz bir özet oluşturulmadı
              </p>
              <p className="text-xs text-slate-400 max-w-xs mb-4">
                Konuşma kayıtlarını yapay zeka ile analiz ederek konuşma özeti çıkarmak için butona dokunun.
              </p>
              <button
                type="button"
                onClick={onRegenerate}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Özeti Şimdi Oluştur</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-300 transition-colors disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Yeniden Analiz Et</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};

import { useState, type FC } from 'react';
import {
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Copy,
  Check,
  Droplet,
  Bed,
  Heart,
  RotateCcw,
} from 'lucide-react';
import type { CompanionReport } from '../../types/companion';

interface CompanionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: CompanionReport | null;
  onStartNewSession: () => void;
}

export const CompanionReportModal: FC<CompanionReportModalProps> = ({
  isOpen,
  onClose,
  report,
  onStartNewSession,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !report) return null;

  const handleCopy = () => {
    const textToCopy = `[HASTA ASİSTANI GÖRÜŞME RAPORU]
Oda: ${report.patientRoom} - ${report.patientName}
Tarih: ${new Date(report.timestamp).toLocaleString('tr-TR')}
Aciliyet: ${report.urgencyLevel.toUpperCase()}

GENEL ÖZET:
${report.briefSummaryTr}

ŞİKAYETLER & SEMPTOMLAR:
${report.patientChiefComplaints.length > 0 ? report.patientChiefComplaints.map((c) => `• ${c}`).join('\n') : '• Belirtilmedi'}

İHTİYAÇ VE TALEPLER:
${report.patientNeedsAndRequests.length > 0 ? report.patientNeedsAndRequests.map((r) => `• ${r}`).join('\n') : '• Belirtilmedi'}

AĞRI DURUMU:
${report.painSummary || 'Belirtilmedi'} ${report.painLevel ? `(Skor: ${report.painLevel}/10)` : ''}

HEMŞİREYE İLETİLEN BİLDİRİM:
${report.nurseActionReportTr}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getUrgencyBadge = (urgency: CompanionReport['urgencyLevel']) => {
    switch (urgency) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-500 text-white animate-pulse shadow-sm">
            <Flame className="w-3.5 h-3.5" />
            KRİTİK / ACİL MÜDAHALE
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            Yüksek Öncelik
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
            Orta Öncelik
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60">
            Rutin / Konfor
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#0E1524] rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-[#121A2A]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Görüşme Özeti & Rapor
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <Bed className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  {report.patientRoom}
                </span>
                <span>•</span>
                <span>{report.patientName}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Kapat"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confirmed Delivery Banner to Nurses */}
        <div className="bg-emerald-500 text-white px-4 py-2.5 flex items-center justify-between text-xs font-semibold shadow-xs shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Yetkili Hemşire İstasyonuna Rapor İletildi</span>
          </div>
          <span className="text-[11px] opacity-90">
            {new Date(report.timestamp).toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Report Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* Brief Summary Box */}
          <div className="bg-slate-50 dark:bg-[#131C2D] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Genel Durum Özeti
              </span>
              {getUrgencyBadge(report.urgencyLevel)}
            </div>
            <p className="text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-relaxed font-medium">
              {report.briefSummaryTr}
            </p>
          </div>

          {/* Section: Needs & Requests (İhtiyaç ve Talepler) */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Droplet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              Hastanın İhtiyaç ve Talepleri
            </h3>
            {report.patientNeedsAndRequests.length > 0 ? (
              <div className="space-y-1.5">
                {report.patientNeedsAndRequests.map((need) => (
                  <div
                    key={need}
                    className="p-2.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/70 dark:border-teal-800/60 text-xs font-semibold text-teal-900 dark:text-teal-200 flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                    <span>{need}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Özel bir konfor talebi belirtilmedi.</p>
            )}
          </div>

          {/* Section: Complaints & Symptoms (Şikayetler & Semptomlar) */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              Şikayetler, Semptomlar ve Ağrı Durumu
            </h3>
            <div className="space-y-2">
              {report.painSummary && (
                <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-800/60 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2">
                  <span className="font-bold shrink-0">Ağrı Durumu:</span>
                  <span>{report.painSummary}</span>
                </div>
              )}
              {report.patientChiefComplaints.length > 0 ? (
                <div className="space-y-1.5">
                  {report.patientChiefComplaints.map((comp) => (
                    <div
                      key={comp}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-[#131C2D] border border-slate-200/60 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span>{comp}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Belirtilmiş akut bir şikayet bulunmuyor.</p>
              )}
            </div>
          </div>

          {/* Section: Dispatched Action Note for Nurse */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Hemşire İstasyonuna Gönderilen Rapor
            </h3>
            <div className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs font-medium text-amber-950 dark:text-amber-200 leading-relaxed">
              {report.nurseActionReportTr}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-[#121A2A] border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A2333] text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 cursor-pointer shadow-2xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Kopyalandı' : 'Raporu Kopyala'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartNewSession();
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Yeni Sohbet Başlat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

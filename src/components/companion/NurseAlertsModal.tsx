import type { FC } from 'react';
import {
  Bell,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Check,
  Bed,
  Globe,
  Droplet,
  Trash2,
} from 'lucide-react';
import type { NurseAlert } from '../../types/companion';

interface NurseAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: NurseAlert[];
  onUpdateStatus: (id: string, status: 'acknowledged' | 'resolved') => void;
  onClearAll: () => void;
}

export const NurseAlertsModal: FC<NurseAlertsModalProps> = ({
  isOpen,
  onClose,
  alerts,
  onUpdateStatus,
  onClearAll,
}) => {
  if (!isOpen) return null;

  const pendingCount = alerts.filter((a) => a.status === 'pending').length;

  const getUrgencyBadge = (urgency: NurseAlert['urgency']) => {
    switch (urgency) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white animate-pulse shadow-sm">
            <Flame className="w-3 h-3" />
            KRİTİK / ACİL
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-xs">
            <AlertTriangle className="w-3 h-3" />
            Yüksek Öncelik
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
            <Clock className="w-3 h-3" />
            Orta Öncelik
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
            <Check className="w-3 h-3" />
            Rutin / Konfor
          </span>
        );
    }
  };

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'Az önce';
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    return new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0E1524] rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-[#121A2A]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-2xs">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Hemşire Çağrı & Hasta Bildirim Paneli
                </h2>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white">
                    {pendingCount} Bekleyen
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hasta asistanı tarafından otomatik analiz edilen istek ve şikayetler
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {alerts.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer mr-1"
                title="Tümünü Temizle"
                aria-label="Tümünü Temizle"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
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
        </div>

        {/* Alerts List */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {alerts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Bekleyen Herhangi Bir Hemşire Çağrısı Yok
              </p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Hasta refakatçisiyle konuşurken bir istek, ağrı veya şikayet ilettiğinde burada anında görünecektir.
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-2xl border transition-all duration-200 shadow-2xs ${
                  alert.status === 'resolved'
                    ? 'bg-slate-50 dark:bg-[#121A2A]/50 border-slate-200/60 dark:border-slate-800/60 opacity-65'
                    : alert.urgency === 'critical'
                    ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 ring-1 ring-rose-500/30'
                    : alert.urgency === 'high'
                    ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/80'
                    : 'bg-white dark:bg-[#141C2B] border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Top Row: Room, Urgency & Timestamp */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-900 dark:text-white">
                      <Bed className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      {alert.patientRoom}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {alert.patientName}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      <Globe className="w-3 h-3" />
                      {alert.detectedLanguage}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {getUrgencyBadge(alert.urgency)}
                    <span className="text-[11px] text-slate-400">{formatTime(alert.timestamp)}</span>
                  </div>
                </div>

                {/* Summary (in Turkish for staff) */}
                <div className="mb-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                    {alert.summaryTr}
                  </p>
                  {alert.patientOriginalText && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">
                      "{alert.patientOriginalText}"
                    </p>
                  )}
                </div>

                {/* Extracted Badges (Pain, Needs, Symptoms) */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {typeof alert.painLevel === 'number' && alert.painLevel > 0 && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                      Ağrı: {alert.painLevel}/10
                    </span>
                  )}
                  {alert.requests.map((req) => (
                    <span
                      key={req}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center gap-1"
                    >
                      <Droplet className="w-2.5 h-2.5 text-teal-600" />
                      {req}
                    </span>
                  ))}
                  {alert.symptoms.map((sym) => (
                    <span
                      key={sym}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      {sym}
                    </span>
                  ))}
                </div>

                {/* Action Controls for Nurse */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <div className="text-[11px] font-medium text-slate-400">
                    Durum:{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {alert.status === 'pending'
                        ? 'Bekliyor'
                        : alert.status === 'acknowledged'
                        ? 'İlgileniliyor'
                        : 'Çözümlendi'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {alert.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(alert.id, 'acknowledged')}
                        className="px-3 py-1 rounded-xl text-xs font-semibold bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 transition-colors cursor-pointer active:scale-95"
                      >
                        İlgileniyorum
                      </button>
                    )}
                    {alert.status !== 'resolved' ? (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(alert.id, 'resolved')}
                        className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer active:scale-95 flex items-center gap-1 shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Tamamlandı</span>
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>İlgilenildi</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

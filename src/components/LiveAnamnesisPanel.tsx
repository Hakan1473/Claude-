import { useState, type FC } from 'react';
import {
  FileText,
  Pill,
  AlertTriangle,
  HeartPulse,
  Scissors,
  Cigarette,
  Users,
  HandHeart,
  Stethoscope,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import type { LiveAnamnesisState } from '../types/interpreter';

interface LiveAnamnesisPanelProps {
  anamnesis: LiveAnamnesisState;
  targetLanguageName?: string;
}

export const LiveAnamnesisPanel: FC<LiveAnamnesisPanelProps> = ({
  anamnesis,
  targetLanguageName = 'Hasta Dili',
}) => {
  const [copied, setCopied] = useState(false);

  // Compute total extracted clinical data points (excluding vitals as requested)
  const totalItems =
    anamnesis.chiefComplaints.length +
    anamnesis.medications.length +
    anamnesis.allergies.length +
    anamnesis.chronicDiseases.length +
    anamnesis.pastSurgeries.length +
    anamnesis.habits.length +
    anamnesis.familyHistory.length +
    anamnesis.patientNeedsAndRequests.length +
    anamnesis.clinicalInstructions.length;

  // Copy structured clinical anamnesis to clipboard for hospital electronic records (HBYS)
  const handleCopyAnamnesis = async () => {
    const lines: string[] = [
      `=== KLİNİK ANAMNEZ VE VAKA BİLGİSİ ===`,
      `Tarih: ${new Date().toLocaleString('tr-TR')}`,
      `Görüşme Dili: Türkçe ⇄ ${targetLanguageName}`,
      '',
    ];

    if (anamnesis.chiefComplaints.length > 0) {
      lines.push(`[BAŞVURU ŞİKAYETLERİ & BELİRTİLER]`);
      anamnesis.chiefComplaints.forEach((c) => lines.push(`- ${c}`));
      lines.push('');
    }

    if (anamnesis.medications.length > 0) {
      lines.push(`[KULLANILAN İLAÇLAR]`);
      anamnesis.medications.forEach((m) => lines.push(`- ${m}`));
      lines.push('');
    }

    if (anamnesis.allergies.length > 0) {
      lines.push(`[ALERJİLER]`);
      anamnesis.allergies.forEach((a) => lines.push(`- ${a}`));
      lines.push('');
    }

    if (anamnesis.chronicDiseases.length > 0) {
      lines.push(`[KRONİK HASTALIKLAR]`);
      anamnesis.chronicDiseases.forEach((d) => lines.push(`- ${d}`));
      lines.push('');
    }

    if (anamnesis.pastSurgeries.length > 0) {
      lines.push(`[GEÇİRİLMİŞ OPERASYONLAR / CERRAHİ ÖYKÜ]`);
      anamnesis.pastSurgeries.forEach((s) => lines.push(`- ${s}`));
      lines.push('');
    }

    if (anamnesis.habits.length > 0) {
      lines.push(`[ALIŞKANLIKLAR & YAŞAM TARZI]`);
      anamnesis.habits.forEach((h) => lines.push(`- ${h}`));
      lines.push('');
    }

    if (anamnesis.familyHistory.length > 0) {
      lines.push(`[AİLE ÖYKÜSÜ]`);
      anamnesis.familyHistory.forEach((f) => lines.push(`- ${f}`));
      lines.push('');
    }

    if (anamnesis.patientNeedsAndRequests.length > 0) {
      lines.push(`[HASTANIN İSTEK VE TALEPLERİ]`);
      anamnesis.patientNeedsAndRequests.forEach((r) => lines.push(`- ${r}`));
      lines.push('');
    }

    if (anamnesis.clinicalInstructions.length > 0) {
      lines.push(`[HEMŞİRELİK TALİMATLARI]`);
      anamnesis.clinicalInstructions.forEach((i) => lines.push(`- ${i}`));
      lines.push('');
    }

    const fullText = lines.join('\n');
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {
      console.warn('Copy anamnesis failed:', e);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-3 sm:px-5 md:px-6 py-3.5 space-y-3.5 animate-in fade-in duration-200">
      {/* Real-time Status Header */}
      <div className="flex items-center justify-between gap-2 p-3 rounded-2xl liquid-glass-panel border border-teal-500/30 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Anlık Klinik Anamnez
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                {totalItems} Bilgi Yakalandı
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
              Konuşma esnasında otomatik ayrıştırılıp anında kaydedilir
            </p>
          </div>
        </div>

        {totalItems > 0 && (
          <button
            type="button"
            onClick={handleCopyAnamnesis}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold liquid-glass-btn text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-teal-100 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Tüm Anamnez Raporunu Kopyala"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-300 text-[11px]">Kopyalandı</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px]">Kopyala</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Empty State */}
      {totalItems === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500 select-none">
          <div className="w-13 h-13 rounded-2xl liquid-glass-panel flex items-center justify-center mb-3 shadow-sm border border-white/60 dark:border-white/10">
            <Sparkles className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          </div>
          <p className="text-xs uppercase tracking-wider font-bold text-slate-800 dark:text-slate-200 mb-1">
            Anamnez Bekleniyor
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
            Konuşmada şikayetler, istekler, kullanılan ilaçlar, alerjiler, kronik hastalıklar veya operasyonlar geçtikçe anlık olarak burada listelenecektir.
          </p>
        </div>
      )}

      {/* Anamnesis Categories Grid (Spacious and Readable) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
        {/* 1. Kullandığı İlaçlar */}
        {anamnesis.medications.length > 0 && (
          <div className="p-3.5 rounded-2xl liquid-glass-panel border border-emerald-500/25 dark:border-emerald-500/20 shadow-xs flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-black/[0.04] dark:border-white/[0.06]">
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Pill className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Kullanılan İlaçlar
              </h4>
              <span className="ml-auto text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100/70 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                {anamnesis.medications.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {anamnesis.medications.map((med, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs"
                >
                  <Pill className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{med}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 2. Alerjiler */}
        {anamnesis.allergies.length > 0 && (
          <div className="p-3.5 rounded-2xl liquid-glass-panel border border-rose-500/30 dark:border-rose-500/25 shadow-xs flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-black/[0.04] dark:border-white/[0.06]">
              <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-rose-950 dark:text-rose-200">
                Alerjiler (Dikkat)
              </h4>
              <span className="ml-auto text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                {anamnesis.allergies.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {anamnesis.allergies.map((allergy, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-2xs"
                >
                  <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{allergy}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 3. Kronik Hastalıklar */}
        {anamnesis.chronicDiseases.length > 0 && (
          <div className="p-3.5 rounded-2xl liquid-glass-panel border border-purple-500/25 dark:border-purple-500/20 shadow-xs flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-black/[0.04] dark:border-white/[0.06]">
              <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                <HeartPulse className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Kronik Hastalıklar
              </h4>
              <span className="ml-auto text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                {anamnesis.chronicDiseases.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {anamnesis.chronicDiseases.map((dis, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50/80 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 shadow-2xs"
                >
                  <HeartPulse className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>{dis}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 4. Geçirilmiş Operasyonlar */}
        {anamnesis.pastSurgeries.length > 0 && (
          <div className="p-3.5 rounded-2xl liquid-glass-panel border border-blue-500/25 dark:border-blue-500/20 shadow-xs flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-black/[0.04] dark:border-white/[0.06]">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Scissors className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Geçirilmiş Operasyonlar
              </h4>
              <span className="ml-auto text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                {anamnesis.pastSurgeries.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {anamnesis.pastSurgeries.map((surg, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50/80 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 shadow-2xs"
                >
                  <Scissors className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>{surg}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 5. Alışkanlıklar & Yaşam Tarzı */}
        {anamnesis.habits.length > 0 && (
          <div className="p-3.5 rounded-2xl liquid-glass-panel border border-slate-300 dark:border-slate-700 shadow-xs flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-black/[0.04] dark:border-white/[0.06]">
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Cigarette className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Alışkanlıklar & Yaşam Tarzı
              </h4>
              <span className="ml-auto text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300">
                {anamnesis.habits.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {anamnesis.habits.map((h, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs"
                >
                  <Cigarette className="w-3 h-3 text-slate-500 shrink-0" />
                  <span>{h}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 6. Aile Öyküsü */}
        {anamnesis.familyHistory.length > 0 && (
          <div className="p-3.5 rounded-2xl liquid-glass-panel border border-indigo-500/25 dark:border-indigo-500/20 shadow-xs flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-black/[0.04] dark:border-white/[0.06]">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Users className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Aile Öyküsü
              </h4>
              <span className="ml-auto text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                {anamnesis.familyHistory.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {anamnesis.familyHistory.map((fam, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 shadow-2xs"
                >
                  <Users className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>{fam}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 7. Hastanın İstek & Talepleri */}
        {anamnesis.patientNeedsAndRequests.length > 0 && (
          <div className="p-3.5 rounded-2xl liquid-glass-panel border border-cyan-500/25 dark:border-cyan-500/20 shadow-xs flex flex-col justify-between md:col-span-2">
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-black/[0.04] dark:border-white/[0.06]">
              <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
                <HandHeart className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Hastanın İstek & İhtiyaçları
              </h4>
              <span className="ml-auto text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
                {anamnesis.patientNeedsAndRequests.length}
              </span>
            </div>
            <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
              {anamnesis.patientNeedsAndRequests.map((req, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">•</span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 8. Hastanın Şikayetleri */}
        {anamnesis.chiefComplaints.length > 0 && (
          <div className="p-3.5 rounded-2xl liquid-glass-panel border border-rose-500/20 dark:border-rose-500/15 shadow-xs flex flex-col justify-between md:col-span-2">
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-black/[0.04] dark:border-white/[0.06]">
              <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Aktif Şikayetler & Belirtiler
              </h4>
              <span className="ml-auto text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                {anamnesis.chiefComplaints.length}
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              {anamnesis.chiefComplaints.map((c, idx) => (
                <li key={idx} className="flex items-start gap-1.5 bg-rose-50/40 dark:bg-rose-950/20 p-2 rounded-xl border border-rose-200/50 dark:border-rose-900/30">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 9. Hemşirelik Notları & Direktifleri */}
        {anamnesis.clinicalInstructions.length > 0 && (
          <div className="p-3.5 rounded-2xl liquid-glass-panel border border-teal-500/25 dark:border-teal-500/20 shadow-xs flex flex-col justify-between md:col-span-2">
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-black/[0.04] dark:border-white/[0.06]">
              <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                <Stethoscope className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Hemşirelik Notu & Talimatlar
              </h4>
              <span className="ml-auto text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                {anamnesis.clinicalInstructions.length}
              </span>
            </div>
            <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
              {anamnesis.clinicalInstructions.map((ins, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-teal-600 dark:text-teal-400 font-bold">•</span>
                  <span>{ins}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

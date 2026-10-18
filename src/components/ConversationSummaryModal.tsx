import { useState, type FC } from 'react';
import {
  FileText,
  Copy,
  Check,
  HeartPulse,
  Coffee,
  CheckCircle2,
  Pill,
  Loader2,
  RefreshCw,
  Sparkles,
  ListChecks,
} from 'lucide-react';
import { Sheet } from './ui/Sheet';
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

  const listSection = (
    title: string,
    items: string[],
    glyph: string,
    Icon: typeof HeartPulse,
    emptyText?: string,
    chips = false
  ) => {
    if (items.length === 0 && !emptyText) return null;
    return (
      <section className="group-list anim-rise">
        <header className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
          <span className={`glyph w-[26px] h-[26px] rounded-[7px] ${glyph}`}>
            <Icon className="w-[15px] h-[15px]" strokeWidth={2.25} />
          </span>
          <h3 className="text-[15px] font-semibold tracking-[-0.016em] text-label">{title}</h3>
          {items.length > 0 && <span className="ml-auto text-[13px] text-label-2 tabular">{items.length}</span>}
        </header>
        <div className="!shadow-none">
          {items.length === 0 ? (
            <p className="px-4 pb-3.5 text-[14px] text-label-3">{emptyText}</p>
          ) : chips ? (
            <div className="px-4 pb-3.5 flex flex-wrap gap-1.5">
              {items.map((item) => (
                <span key={item} className="px-2.5 py-1 rounded-full bg-sys-orange/12 text-sys-orange text-[13px] font-medium tabular">
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <ul className="pl-4">
              {items.map((item, idx) => (
                <li
                  key={item}
                  className={`pr-4 py-2.5 text-[15px] leading-snug tracking-[-0.012em] text-label ${idx > 0 ? 'hairline-t' : ''}`}
                >
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    );
  };

  return (
    <Sheet
      onClose={onClose}
      title="Konuşma Özeti"
      subtitle={`Yapay zeka · Türkçe ⇄ ${targetLanguageName}`}
      widthClass="sm:max-w-xl"
      bodyClassName="px-4 sm:px-6 pb-6"
      trailing={
        summary ? (
          <button
            type="button"
            onClick={handleCopy}
            className={`pressable h-[30px] px-3 rounded-full inline-flex items-center gap-1.5 text-[13px] font-medium cursor-pointer ${
              copied ? 'bg-sys-green/15 text-sys-green' : 'btn-tinted'
            }`}
            title="Tüm özeti kopyala"
          >
            {copied ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <Copy className="w-3.5 h-3.5" strokeWidth={2} />}
            <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
          </button>
        ) : undefined
      }
      footer={
        <>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isLoading}
            className="pressable btn-gray h-9 px-4 rounded-full inline-flex items-center gap-1.5 text-[14px] font-medium cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} strokeWidth={2.25} />
            <span>Yeniden Analiz Et</span>
          </button>
          <span className="flex-1" />
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
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center anim-fade">
          <Loader2 className="w-8 h-8 text-label-3 animate-spin mb-4" strokeWidth={2} />
          <p className="text-[17px] font-semibold tracking-[-0.022em] shimmer-text mb-1">Özet hazırlanıyor</p>
          <p className="text-[14px] text-label-2 max-w-xs">
            Yapay zeka konuşmayı tarayarak özet, istek ve önemli bilgileri çıkarıyor.
          </p>
        </div>
      ) : summary ? (
        <div className="space-y-4">
          <section className="rounded-[14px] p-4 bg-accent-soft anim-rise">
            <div className="flex items-center gap-1.5 mb-1.5 text-[13px] font-semibold text-accent-ink">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.25} />
              <span>Genel Özet</span>
            </div>
            <p className="text-[16px] leading-relaxed tracking-[-0.014em] text-label">{summary.briefSummaryTr}</p>
          </section>

          {listSection(
            'Şikayetler & Belirtiler',
            summary.patientChiefComplaints,
            'bg-sys-pink',
            HeartPulse,
            'Belirtilen bir şikayet kaydedilmedi.'
          )}
          {listSection(
            'İstek & Talepler',
            summary.patientNeedsAndRequests,
            'bg-sys-orange',
            Coffee,
            'Özel bir istek belirtilmedi.'
          )}
          {listSection(
            'İletilen Bilgilendirme & Talimatlar',
            summary.clinicalInstructions,
            'bg-sys-green',
            CheckCircle2,
            'Özel bir talimat kaydedilmedi.'
          )}
          {listSection('Ölçüm, İlaç & Değerler', summary.vitalSignsAndDosages, 'bg-sys-yellow', Pill, undefined, true)}
          {listSection('Takip ve Sonraki Adımlar', summary.actionItems, 'bg-sys-indigo', ListChecks)}
        </div>
      ) : (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-accent-soft text-accent flex items-center justify-center mb-4">
            <FileText className="w-6 h-6" strokeWidth={2} />
          </div>
          <p className="text-[17px] font-semibold tracking-[-0.022em] text-label mb-1">Henüz özet yok</p>
          <p className="text-[14px] text-label-2 max-w-xs mb-5">
            Konuşma kayıtlarını yapay zeka ile analiz ederek özet çıkarmak için dokunun.
          </p>
          <button
            type="button"
            onClick={onRegenerate}
            className="pressable btn-primary h-11 px-6 rounded-full inline-flex items-center gap-2 text-[15px] font-semibold cursor-pointer"
          >
            <Sparkles className="w-4 h-4" strokeWidth={2.25} />
            <span>Özeti Oluştur</span>
          </button>
        </div>
      )}
    </Sheet>
  );
};

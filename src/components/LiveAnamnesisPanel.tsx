import { useState, useCallback, type FC, type ReactNode } from 'react';
import {
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
  Activity,
  ClipboardList,
  BookOpenText,
} from 'lucide-react';
import { TermPopover } from './TermPopover';
import type { TermCategory } from '../services/termExplainer';
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
  const [openTerm, setOpenTerm] = useState<{
    key: string;
    term: string;
    category: TermCategory;
    rect: DOMRect;
    glyph: string;
    icon: ReactNode;
  } | null>(null);
  const closeTerm = useCallback(() => setOpenTerm(null), []);

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
      anamnesis.chiefComplaints.forEach((c) => {
        lines.push(`- ${c}`);
      });
      lines.push('');
    }

    if (anamnesis.medications.length > 0) {
      lines.push(`[KULLANILAN İLAÇLAR]`);
      anamnesis.medications.forEach((m) => {
        lines.push(`- ${m}`);
      });
      lines.push('');
    }

    if (anamnesis.allergies.length > 0) {
      lines.push(`[ALERJİLER]`);
      anamnesis.allergies.forEach((a) => {
        lines.push(`- ${a}`);
      });
      lines.push('');
    }

    if (anamnesis.chronicDiseases.length > 0) {
      lines.push(`[KRONİK HASTALIKLAR]`);
      anamnesis.chronicDiseases.forEach((d) => {
        lines.push(`- ${d}`);
      });
      lines.push('');
    }

    if (anamnesis.pastSurgeries.length > 0) {
      lines.push(`[GEÇİRİLMİŞ OPERASYONLAR / CERRAHİ ÖYKÜ]`);
      anamnesis.pastSurgeries.forEach((s) => {
        lines.push(`- ${s}`);
      });
      lines.push('');
    }

    if (anamnesis.habits.length > 0) {
      lines.push(`[ALIŞKANLIKLAR & YAŞAM TARZI]`);
      anamnesis.habits.forEach((h) => {
        lines.push(`- ${h}`);
      });
      lines.push('');
    }

    if (anamnesis.familyHistory.length > 0) {
      lines.push(`[AİLE ÖYKÜSÜ]`);
      anamnesis.familyHistory.forEach((f) => {
        lines.push(`- ${f}`);
      });
      lines.push('');
    }

    if (anamnesis.patientNeedsAndRequests.length > 0) {
      lines.push(`[HASTANIN İSTEK VE TALEPLERİ]`);
      anamnesis.patientNeedsAndRequests.forEach((r) => {
        lines.push(`- ${r}`);
      });
      lines.push('');
    }

    if (anamnesis.clinicalInstructions.length > 0) {
      lines.push(`[HEMŞİRELİK TALİMATLARI]`);
      anamnesis.clinicalInstructions.forEach((i) => {
        lines.push(`- ${i}`);
      });
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

  const sections: {
    key: string;
    title: string;
    items: string[];
    icon: typeof Pill;
    glyph: string;
    wide?: boolean;
    critical?: boolean;
    /** Vademecum category: items become tappable and open an AI explanation */
    explain?: TermCategory;
  }[] = [
    { key: 'complaints', title: 'Aktif Şikayetler & Belirtiler', items: anamnesis.chiefComplaints, icon: Activity, glyph: 'bg-sys-pink', wide: true, explain: 'complaint' },
    { key: 'allergies', title: 'Alerjiler', items: anamnesis.allergies, icon: AlertTriangle, glyph: 'bg-sys-red', critical: true, explain: 'allergy' },
    { key: 'medications', title: 'Kullanılan İlaçlar', items: anamnesis.medications, icon: Pill, glyph: 'bg-sys-green', explain: 'medication' },
    { key: 'chronic', title: 'Kronik Hastalıklar', items: anamnesis.chronicDiseases, icon: HeartPulse, glyph: 'bg-sys-purple', explain: 'chronic' },
    { key: 'surgeries', title: 'Geçirilmiş Operasyonlar', items: anamnesis.pastSurgeries, icon: Scissors, glyph: 'bg-sys-teal', explain: 'surgery' },
    { key: 'habits', title: 'Alışkanlıklar & Yaşam Tarzı', items: anamnesis.habits, icon: Cigarette, glyph: 'bg-sys-gray', explain: 'habit' },
    { key: 'family', title: 'Aile Öyküsü', items: anamnesis.familyHistory, icon: Users, glyph: 'bg-sys-indigo', explain: 'family' },
    { key: 'needs', title: 'Hastanın İstek & İhtiyaçları', items: anamnesis.patientNeedsAndRequests, icon: HandHeart, glyph: 'bg-sys-orange', wide: true },
    { key: 'instructions', title: 'Hemşirelik Notu & Talimatlar', items: anamnesis.clinicalInstructions, icon: Stethoscope, glyph: 'bg-accent', wide: true },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-5 md:px-6 py-3 md:py-5 gap-3 md:gap-4">
      {/* Live status header */}
      <div className="flex items-center justify-between gap-3 px-1 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sys-green opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sys-green" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold tracking-[-0.016em] text-label truncate">
              Anlık Klinik Anamnez
              <span className="ml-1.5 font-normal text-label-2 tabular">{totalItems} bilgi</span>
            </h3>
            <p className="text-[12px] text-label-2 truncate">Konuşma sırasında otomatik ayrıştırılır</p>
          </div>
        </div>

        {totalItems > 0 && (
          <button
            type="button"
            onClick={handleCopyAnamnesis}
            className={`pressable h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-[13px] font-medium cursor-pointer shrink-0 ${
              copied ? 'bg-sys-green/15 text-sys-green' : 'btn-tinted'
            }`}
            title="Tüm Anamnez Raporunu Kopyala"
          >
            {copied ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <Copy className="w-3.5 h-3.5" strokeWidth={2} />}
            <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
          </button>
        )}
      </div>

      {/* Empty state */}
      {totalItems === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 text-center select-none anim-fade">
          <div className="w-14 h-14 rounded-full bg-sys-indigo/12 text-sys-indigo flex items-center justify-center mb-4">
            <ClipboardList className="w-6 h-6" strokeWidth={2} />
          </div>
          <p className="text-[17px] font-semibold tracking-[-0.022em] text-label mb-1">Anamnez Bekleniyor</p>
          <p className="text-[14px] text-label-2 max-w-[300px] leading-relaxed">
            Şikayetler, istekler, ilaçlar, alerjiler, kronik hastalıklar ve operasyonlar konuşmada geçtikçe burada
            listelenir.
          </p>
        </div>
      )}

      {/* Vademecum card for the tapped term */}
      {openTerm && (
        <TermPopover
          key={openTerm.key + openTerm.term}
          term={openTerm.term}
          category={openTerm.category}
          anchor={openTerm.rect}
          glyphClass={openTerm.glyph}
          icon={openTerm.icon}
          onClose={closeTerm}
        />
      )}

      {totalItems > 0 && (
        <p className="px-1 -mt-1 text-[12px] text-label-3 inline-flex items-center gap-1.5">
          <BookOpenText className="w-3.5 h-3.5" strokeWidth={2} />
          İlaç, hastalık veya ameliyata dokunarak ne olduğunu görün
        </p>
      )}

      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
        {sections
          .filter((s) => s.items.length > 0)
          .map((section) => {
            const Icon = section.icon;
            return (
              <section
                key={section.key}
                className={`anim-rise rounded-[16px] overflow-hidden ${section.wide ? 'md:col-span-2' : ''} ${
                  section.critical ? 'bg-sys-red/8 ring-1 ring-sys-red/25' : 'bg-surface shadow-card'
                }`}
              >
                <header className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
                  <span className={`glyph w-[26px] h-[26px] rounded-[7px] ${section.glyph}`}>
                    <Icon className="w-[15px] h-[15px]" strokeWidth={2.25} />
                  </span>
                  <h4
                    className={`text-[15px] font-semibold tracking-[-0.016em] ${
                      section.critical ? 'text-sys-red' : 'text-label'
                    }`}
                  >
                    {section.title}
                  </h4>
                  <span className="ml-auto text-[13px] text-label-2 tabular">{section.items.length}</span>
                </header>
                <ul className="pl-4">
                  {section.items.map((item, idx) => {
                    const itemKey = `${section.key}-${idx}`;
                    const textClass = section.critical ? 'text-sys-red font-semibold' : 'text-label';
                    return (
                      <li
                        // biome-ignore lint/suspicious/noArrayIndexKey: items may repeat across sources
                        key={itemKey}
                        className={idx > 0 ? 'hairline-t' : ''}
                      >
                        {section.explain ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              const category = section.explain as TermCategory;
                              setOpenTerm({
                                key: itemKey,
                                term: item,
                                category,
                                rect: e.currentTarget.getBoundingClientRect(),
                                glyph: section.glyph,
                                icon: <Icon className="w-[18px] h-[18px]" strokeWidth={2.25} />,
                              });
                            }}
                            aria-haspopup="dialog"
                            aria-expanded={openTerm?.key === itemKey}
                            title="Ne olduğunu gör"
                            className={`term-chip group w-full -ml-4 pl-4 pr-3 py-2.5 flex items-center gap-2 text-left cursor-pointer text-[15px] leading-snug tracking-[-0.012em] ${textClass} ${
                              openTerm?.key === itemKey ? 'bg-fill' : 'hover:bg-fill-2 active:bg-fill'
                            }`}
                          >
                            <span className="flex-1 min-w-0">{item}</span>
                            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-label-3 group-hover:text-accent transition-colors shrink-0">
                              <BookOpenText className="w-4 h-4" strokeWidth={2} />
                            </span>
                          </button>
                        ) : (
                          <p className={`pr-4 py-2.5 text-[15px] leading-snug tracking-[-0.012em] ${textClass}`}>{item}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
      </div>
    </div>
  );
};

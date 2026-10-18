import { useState, type FC } from 'react';
import {
  X,
  Clock,
  Trash2,
  ArrowUpRight,
  ChevronLeft,
  Sparkles,
  Copy,
  Check,
  Search,
  MessageSquare,
  Bell,
  Activity,
} from 'lucide-react';
import type { ConversationHistoryItem, TranscriptMessage } from '../types/interpreter';
import { CountryFlag } from './CountryFlag';
import { Sheet } from './ui/Sheet';
import { toSearchKey } from '../utils/searchText';
import { detectMedicalTutorialVideo } from '../utils/medicalTutorialDetection';

interface ConversationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ConversationHistoryItem[];
  onDeleteHistoryItem: (id: string) => void;
  onClearAllHistory: () => void;
  onRestoreConversation?: (item: ConversationHistoryItem) => void;
}

export const ConversationHistoryModal: FC<ConversationHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onDeleteHistoryItem,
  onClearAllHistory,
  onRestoreConversation,
}) => {
  const [selectedItem, setSelectedItem] = useState<ConversationHistoryItem | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredHistory = history.filter((item) => {
    const q = toSearchKey(searchQuery.trim());
    if (!q) return true;
    const has = (text?: string) => toSearchKey(text).includes(q);
    const langMatch = has(item.targetLanguage.nameTr) || has(item.targetLanguage.name) || has(item.targetLanguage.country);
    const textMatch = item.messages.some((m: TranscriptMessage) => has(m.originalText) || has(m.translatedText));
    const summaryMatch =
      item.summary &&
      (has(item.summary.briefSummaryTr) ||
        item.summary.patientChiefComplaints.some((c: string) => has(c)) ||
        item.summary.vitalSignsAndDosages.some((v: string) => has(v)));
    return langMatch || textMatch || summaryMatch;
  });

  const handleCopyTranscript = async (item: ConversationHistoryItem) => {
    const lines = [
      `HASTA GÖRÜŞME KAYDI (${item.targetLanguage.nameTr} - ${formatDate(item.createdAt)})`,
      '-------------------------------------------------------',
      '',
    ];

    if (item.summary) {
      lines.push('--- KLİNİK ÖZET ---');
      lines.push(item.summary.briefSummaryTr);
      lines.push('');
    }

    lines.push('--- DİYALOG AKIŞI ---');
    item.messages
      .filter((m: TranscriptMessage) => m.speaker === 'nurse' || m.speaker === 'patient')
      .forEach((m: TranscriptMessage) => {
        const role = m.speaker === 'nurse' ? 'Hemşire (TR)' : `Hasta (${item.targetLanguage.nameTr})`;
        lines.push(`[${role}]: ${m.originalText}`);
        if (m.translatedText) {
          lines.push(` -> [Çeviri]: ${m.translatedText}`);
        }
      });

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Copy error:', e);
    }
  };

  return (
    <Sheet
      onClose={onClose}
      widthClass="sm:max-w-2xl"
      fixedHeight
      bodyClassName="px-4 sm:px-6 pb-6"
      leading={
        selectedItem ? (
          <button
            type="button"
            onClick={() => setSelectedItem(null)}
            aria-label="Listeye Dön"
            className="pressable -ml-1 w-[30px] h-[30px] rounded-full bg-fill text-accent flex items-center justify-center shrink-0 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
        ) : undefined
      }
      title={selectedItem ? `${selectedItem.targetLanguage.nameTr} Görüşmesi` : 'Geçmiş Sohbetler'}
      subtitle={
        selectedItem ? (
          <span className="tabular">
            {formatDate(selectedItem.createdAt)} · {selectedItem.messages.length} mesaj
          </span>
        ) : (
          `${history.length} görüşme · Önceki tercümeler ve özetler`
        )
      }
      trailing={
        selectedItem ? (
          <button
            type="button"
            onClick={() => handleCopyTranscript(selectedItem)}
            className={`pressable h-[30px] px-3 rounded-full inline-flex items-center gap-1.5 text-[13px] font-medium cursor-pointer ${
              copied ? 'bg-sys-green/15 text-sys-green' : 'btn-tinted'
            }`}
            title="Görüşmeyi Kopyala"
          >
            {copied ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <Copy className="w-3.5 h-3.5" strokeWidth={2} />}
            <span className="hidden sm:inline">{copied ? 'Kopyalandı' : 'Kopyala'}</span>
          </button>
        ) : undefined
      }
      footer={
        !selectedItem && history.length > 0 ? (
          confirmClearAll ? (
            <div className="w-full flex items-center justify-end gap-2 anim-fade">
              <span className="flex-1 text-[13px] text-sys-red font-medium">Tümü kalıcı olarak silinsin mi?</span>
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                className="pressable btn-gray h-8 px-3.5 rounded-full text-[13px] font-medium cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearAllHistory();
                  setConfirmClearAll(false);
                }}
                className="pressable h-8 px-3.5 rounded-full text-[13px] font-semibold bg-sys-red text-white cursor-pointer"
              >
                Hepsini Sil
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between gap-2">
              <span className="text-[13px] text-label-2 tabular">Toplam {history.length} kayıt</span>
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="pressable h-8 px-3 rounded-full text-[13px] font-medium text-sys-red hover:bg-sys-red/10 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Tümünü Temizle</span>
              </button>
            </div>
          )
        ) : undefined
      }
    >
      {!selectedItem ? (
        /* LIST VIEW */
        <div className="anim-fade">
          {history.length > 0 && (
            <div className="sheet-sticky sticky top-0 z-10 pb-3">
              <div className="relative">
                <Search
                  className="w-4 h-4 text-label-2 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  strokeWidth={2.25}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Metin, şikayet, ilaç veya dil ara"
                  className="field w-full h-10 pl-9 pr-9 text-[16px] sm:text-[15px]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Aramayı temizle"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-label-3 text-bg flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3 h-3" strokeWidth={3} />
                  </button>
                )}
              </div>
            </div>
          )}

          {history.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center px-6">
              <div className="w-14 h-14 rounded-full bg-sys-indigo/12 text-sys-indigo flex items-center justify-center mb-4">
                <Clock className="w-6 h-6" strokeWidth={2} />
              </div>
              <h3 className="text-[17px] font-semibold tracking-[-0.022em] text-label">Kayıtlı Görüşme Yok</h3>
              <p className="text-[14px] text-label-2 max-w-xs mt-1 leading-relaxed">
                Canlı tercümeyi başlatıp hastayla konuştuğunuzda diyaloglar burada otomatik olarak arşivlenir.
              </p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-[14px] text-label-2">
              "{searchQuery}" ile eşleşen görüşme bulunamadı.
            </div>
          ) : (
            <div className="group-list">
              {filteredHistory.map((item) => (
                <div key={item.id} className="flex items-start gap-3 pl-4 pr-3 py-3 transition-colors hover:bg-fill-2">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="flex items-start gap-3 flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <span className="mt-1">
                      <CountryFlag
                        flag={item.targetLanguage.flag}
                        code={item.targetLanguage.code}
                        country={item.targetLanguage.country}
                        size="md"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-[16px] font-semibold tracking-[-0.016em] text-label truncate">
                          {item.targetLanguage.nameTr}
                        </span>
                        <span className="text-[13px] text-label-2 tabular shrink-0">{formatDate(item.createdAt)}</span>
                      </span>
                      {item.previewText && (
                        <span className="block text-[14px] text-label-2 leading-snug line-clamp-2 mt-0.5">
                          {item.previewText}
                        </span>
                      )}
                      <span className="mt-1.5 flex items-center gap-2 text-[12px] text-label-3">
                        <span className="tabular">{item.messages.length} mesaj</span>
                        {item.summary && (
                          <span className="inline-flex items-center gap-1 text-accent-ink font-medium">
                            <Sparkles className="w-3 h-3" strokeWidth={2.25} />
                            Özet var
                          </span>
                        )}
                      </span>
                    </span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    {confirmDeleteId === item.id ? (
                      <div className="flex items-center gap-1 anim-fade">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="pressable h-7 px-2.5 rounded-full btn-gray text-[12px] font-medium cursor-pointer"
                        >
                          Vazgeç
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteHistoryItem(item.id);
                            setConfirmDeleteId(null);
                          }}
                          className="pressable h-7 px-2.5 rounded-full bg-sys-red text-white text-[12px] font-semibold cursor-pointer"
                          title="Kalıcı Olarak Sil"
                        >
                          Sil
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="pressable w-8 h-8 rounded-full text-label-3 hover:text-sys-red hover:bg-sys-red/10 flex items-center justify-center cursor-pointer"
                        title="Bu Görüşmeyi Sil"
                        aria-label="Sil"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* DETAIL VIEW */
        <div className="anim-fade space-y-5">
          <div className="flex items-center gap-2">
            {onRestoreConversation && (
              <button
                type="button"
                onClick={() => {
                  onRestoreConversation(selectedItem);
                  onClose();
                }}
                className="pressable btn-primary flex-1 h-11 rounded-[12px] inline-flex items-center justify-center gap-2 text-[15px] font-semibold cursor-pointer"
                title="Bu görüşmeyi ana ekrana yükle"
              >
                <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
                <span>Ekrana Yükle</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onDeleteHistoryItem(selectedItem.id);
                setSelectedItem(null);
              }}
              className="pressable h-11 px-4 rounded-[12px] bg-sys-red/10 text-sys-red inline-flex items-center justify-center gap-2 text-[15px] font-medium cursor-pointer"
              title="Bu görüşmeyi kalıcı olarak sil"
            >
              <Trash2 className="w-4 h-4" strokeWidth={2} />
              <span>Sil</span>
            </button>
          </div>

          {selectedItem.summary && (
            <div>
              <h4 className="px-4 mb-1.5 text-[13px] font-medium text-label-2 inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" strokeWidth={2.25} />
                Kayıtlı konuşma özeti
              </h4>
              <div className="group-list">
                <p className="px-4 py-3 text-[15px] leading-relaxed text-label">{selectedItem.summary.briefSummaryTr}</p>
                {selectedItem.summary.patientChiefComplaints.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-[13px] font-medium text-label-2 mb-1">Hastanın şikayetleri</p>
                    <ul className="space-y-1">
                      {selectedItem.summary.patientChiefComplaints.map((c: string) => (
                        <li key={c} className="text-[15px] text-label flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-sys-pink mt-2 shrink-0" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedItem.summary.vitalSignsAndDosages.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-[13px] font-medium text-label-2 mb-1">İlaç ve dozajlar</p>
                    <ul className="space-y-1">
                      {selectedItem.summary.vitalSignsAndDosages.map((c: string) => (
                        <li key={c} className="text-[15px] text-label flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-sys-green mt-2 shrink-0" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <h4 className="px-4 mb-2 text-[13px] font-medium text-label-2 inline-flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" strokeWidth={2.25} />
              Diyalog akışı
            </h4>

            <div className="space-y-3">
              {selectedItem.messages
                .filter((m: TranscriptMessage) => m.speaker === 'nurse' || m.speaker === 'patient')
                .map((msg: TranscriptMessage) => {
                  const isNurse = msg.speaker === 'nurse';
                  const tutorial = detectMedicalTutorialVideo(msg.originalText, msg.translatedText);
                  const hasTutorial = msg.showTutorialVideo || msg.showNurseCallTutorial || tutorial.shouldShow;
                  const isTriflow = msg.tutorialVideoType === 'triflow' || tutorial.type === 'triflow';

                  return (
                    <div key={msg.id} className={`flex flex-col ${isNurse ? 'items-end' : 'items-start'}`}>
                      <span className="flex items-center gap-1.5 mb-1 px-2 text-[12px] font-medium text-label-2">
                        {isNurse ? (
                          <>
                            <CountryFlag flag="🇹🇷" code="tr" country="Türkiye" size="xs" />
                            Hemşire · Türkçe
                          </>
                        ) : (
                          <>
                            <CountryFlag
                              flag={selectedItem.targetLanguage.flag}
                              code={selectedItem.targetLanguage.code}
                              country={selectedItem.targetLanguage.country}
                              size="xs"
                            />
                            Hasta · {selectedItem.targetLanguage.nameTr}
                          </>
                        )}
                      </span>

                      <div
                        className={`max-w-[88%] rounded-[18px] px-4 py-3 ${
                          isNurse ? 'bg-accent text-white rounded-br-[6px]' : 'bg-surface text-label rounded-bl-[6px] shadow-card'
                        }`}
                      >
                        <p className="text-[15px] leading-snug tracking-[-0.012em]">{msg.originalText}</p>

                        {msg.translatedText && (
                          <p
                            className={`mt-2 pt-2 text-[14px] leading-snug border-t ${
                              isNurse ? 'border-white/25 text-white/85' : 'border-separator text-label-2'
                            }`}
                          >
                            {msg.translatedText}
                          </p>
                        )}

                        {msg.highlightedDosages && msg.highlightedDosages.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {msg.highlightedDosages.map((d: string) => (
                              <span
                                key={d}
                                className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${
                                  isNurse ? 'bg-white/20 text-white' : 'bg-sys-orange/15 text-sys-orange'
                                }`}
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        )}

                        {hasTutorial && (
                          <div
                            className={`mt-2 flex items-center gap-1.5 text-[12px] font-medium ${
                              isNurse ? 'text-white/85' : 'text-accent-ink'
                            }`}
                          >
                            {isTriflow ? (
                              <>
                                <Activity className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} />
                                <span>Triflow eğitim videosu gösterildi</span>
                              </>
                            ) : (
                              <>
                                <Bell className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} />
                                <span>Hemşire çağrı butonu videosu gösterildi</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
};

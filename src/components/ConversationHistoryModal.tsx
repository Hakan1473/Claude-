import { useState, type FC } from 'react';
import {
  X,
  Clock,
  Trash2,
  ExternalLink,
  ChevronLeft,
  Calendar,
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
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const langMatch =
      item.targetLanguage.nameTr.toLowerCase().includes(q) ||
      item.targetLanguage.name.toLowerCase().includes(q) ||
      item.targetLanguage.country.toLowerCase().includes(q);
    const textMatch = item.messages.some(
      (m: TranscriptMessage) =>
        m.originalText.toLowerCase().includes(q) ||
        Boolean(m.translatedText?.toLowerCase().includes(q))
    );
    const summaryMatch =
      item.summary &&
      (item.summary.briefSummaryTr.toLowerCase().includes(q) ||
        item.summary.patientChiefComplaints.some((c: string) => c.toLowerCase().includes(q)) ||
        item.summary.vitalSignsAndDosages.some((v: string) => v.toLowerCase().includes(q)));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[90vh] max-h-[820px]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-2.5">
            {selectedItem ? (
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1.5 -ml-1 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Listeye Dön</span>
              </button>
            ) : (
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                <Clock className="w-4 h-4" />
              </div>
            )}

            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{selectedItem ? 'Görüşme Detayı' : 'Geçmiş Sohbetler'}</span>
                {!selectedItem && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {history.length} Görüşme
                  </span>
                )}
              </h2>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                {selectedItem ? (
                  <>
                    <CountryFlag flag={selectedItem.targetLanguage.flag} code={selectedItem.targetLanguage.code} country={selectedItem.targetLanguage.country} size="xs" />
                    <span>{selectedItem.targetLanguage.nameTr} • {formatDate(selectedItem.createdAt)}</span>
                  </>
                ) : (
                  <span>Önceki tüm tercümeler ve konuşma özetleri</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {selectedItem && (
              <button
                type="button"
                onClick={() => handleCopyTranscript(selectedItem)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                title="Görüşmeyi Kopyala"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">{copied ? 'Kopyalandı' : 'Kopyala'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!selectedItem ? (
            /* LIST VIEW */
            <>
              {/* Search Bar */}
              {history.length > 0 && (
                <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Konuşma metni, şikayet, ilaç veya dilde ara..."
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-8 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* History List Items */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-500 mb-3 shadow-sm">
                      <Clock className="w-7 h-7" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      Henüz Kayıtlı Görüşme Yok
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1">
                      Canlı tercümeyi başlatıp hastayla konuştuktan sonra tüm diyaloglar burada otomatik olarak arşivlenir.
                    </p>
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    "{searchQuery}" aramasıyla eşleşen görüşme bulunamadı.
                  </div>
                ) : (
                  filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 transition-all group shadow-xs hover:border-indigo-400/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                        >
                          <CountryFlag flag={item.targetLanguage.flag} code={item.targetLanguage.code} country={item.targetLanguage.country} size="lg" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {item.targetLanguage.nameTr}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-medium">
                                ({item.targetLanguage.name})
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(item.createdAt)}</span>
                              <span>•</span>
                              <span>{item.messages.length} mesaj</span>
                            </p>
                          </div>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.summary && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-600 text-white flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Konuşma Özeti</span>
                            </span>
                          )}

                          {confirmDeleteId === item.id ? (
                            <div className="flex items-center gap-1 animate-in fade-in duration-150">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteHistoryItem(item.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                                title="Kalıcı Olarak Sil"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Sil</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-[11px] font-medium cursor-pointer"
                              >
                                Vazgeç
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title="Bu Görüşmeyi Sil"
                              aria-label="Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Preview Snippet */}
                      {item.previewText && (
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="w-full text-left text-xs text-slate-600 dark:text-slate-300 mt-2.5 line-clamp-2 leading-relaxed bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl font-normal cursor-pointer"
                        >
                          {item.previewText}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Clear All Bar */}
              {history.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between shrink-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Toplam {history.length} kayıtlı görüşme
                  </span>
                  {confirmClearAll ? (
                    <div className="flex items-center gap-2 animate-in fade-in duration-150">
                      <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                        Tümü kalıcı silinsin mi?
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onClearAllHistory();
                          setConfirmClearAll(false);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        Evet, Hepsini Sil
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearAll(false)}
                        className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer"
                      >
                        Vazgeç
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClearAll(true)}
                      className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1.5 font-semibold cursor-pointer px-2.5 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Tüm Geçmişi Temizle</span>
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            /* DETAILED CONVERSATION VIEW */
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Top Banner Action */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <CountryFlag flag={selectedItem.targetLanguage.flag} code={selectedItem.targetLanguage.code} country={selectedItem.targetLanguage.country} size="lg" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {selectedItem.targetLanguage.nameTr} Görüşmesi
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {formatDate(selectedItem.createdAt)} • {selectedItem.messages.length} mesaj
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteHistoryItem(selectedItem.id);
                      setSelectedItem(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-rose-200 dark:border-rose-800"
                    title="Bu görüşmeyi kalıcı olarak sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sil</span>
                  </button>

                  {onRestoreConversation && (
                    <button
                      type="button"
                      onClick={() => {
                        onRestoreConversation(selectedItem);
                        onClose();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Bu görüşmeyi ana ekrana yükle"
                    >
                      <span>Ekrana Yükle</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Clinical Summary Section (if present) */}
              {selectedItem.summary && (
                <div className="rounded-2xl p-4 space-y-2.5 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60">
                  <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Kayıtlı Konuşma Özeti</span>
                  </div>

                  <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-teal-100 dark:border-teal-900/50">
                    {selectedItem.summary.briefSummaryTr}
                  </p>

                  {selectedItem.summary.patientChiefComplaints.length > 0 && (
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-slate-700 dark:text-slate-300">Hastanın Şikayetleri:</p>
                      <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 pl-1">
                        {selectedItem.summary.patientChiefComplaints.map((c: string) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedItem.summary.vitalSignsAndDosages.length > 0 && (
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-slate-700 dark:text-slate-300">İlaç ve Dozajlar:</p>
                      <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 pl-1">
                        {selectedItem.summary.vitalSignsAndDosages.map((c: string) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Messages Stream */}
              <div className="space-y-2.5 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Diyalog Akışı ({selectedItem.messages.length})</span>
                </h4>

                {selectedItem.messages
                  .filter((m: TranscriptMessage) => m.speaker === 'nurse' || m.speaker === 'patient')
                  .map((msg: TranscriptMessage) => {
                    const isNurse = msg.speaker === 'nurse';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isNurse ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                              isNurse
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                : 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-700 font-extrabold shadow-xs'
                            }`}
                          >
                            {isNurse ? (
                              <>
                                <CountryFlag flag="🇹🇷" code="tr" country="Türkiye" size="xs" />
                                <span>Hemşire (Türkçe)</span>
                              </>
                            ) : (
                              <>
                                <CountryFlag flag={selectedItem.targetLanguage.flag} code={selectedItem.targetLanguage.code} country={selectedItem.targetLanguage.country} size="xs" />
                                <span>Hasta ({selectedItem.targetLanguage.nameTr})</span>
                              </>
                            )}
                          </span>
                        </div>

                        <div
                          className={`max-w-[85%] rounded-2xl p-3 shadow-2xs ${
                            isNurse
                              ? 'bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-tr-xs'
                              : 'bg-gradient-to-r from-teal-600 to-cyan-700 text-white rounded-tl-xs shadow-md shadow-teal-500/20'
                          }`}
                        >
                          <p className="text-xs sm:text-sm font-medium leading-relaxed">
                            {msg.originalText}
                          </p>

                          {msg.translatedText && (
                            <div
                              className={`mt-2 pt-2 text-xs border-t ${
                                isNurse
                                  ? 'border-slate-200 dark:border-slate-700 text-teal-600 dark:text-teal-400 font-semibold'
                                  : 'border-white/20 text-teal-50'
                              }`}
                            >
                              <span className="text-[10px] uppercase font-bold opacity-80 block mb-0.5">
                                Çeviri:
                              </span>
                              <span>{msg.translatedText}</span>
                            </div>
                          )}

                          {msg.highlightedDosages && msg.highlightedDosages.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {msg.highlightedDosages.map((d: string) => (
                                <span
                                  key={d}
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200 border border-amber-400/30"
                                >
                                  💊 {d}
                                </span>
                              ))}
                            </div>
                          )}

                          {(() => {
                            const tutorial = detectMedicalTutorialVideo(msg.originalText, msg.translatedText);
                            const hasTutorial =
                              msg.showTutorialVideo ||
                              msg.showNurseCallTutorial ||
                              tutorial.shouldShow;
                            if (!hasTutorial) return null;

                            const isTriflow =
                              msg.tutorialVideoType === 'triflow' ||
                              tutorial.type === 'triflow';

                            return (
                              <div className="mt-2 pt-1.5 border-t border-black/10 dark:border-white/10 flex items-center gap-1.5 text-[10px] font-bold text-teal-600 dark:text-teal-400">
                                {isTriflow ? (
                                  <>
                                    <Activity className="w-3 h-3 text-cyan-500 shrink-0" />
                                    <span>Triflow Solunum Cihazı Eğitim Videosu Gösterildi</span>
                                  </>
                                ) : (
                                  <>
                                    <Bell className="w-3 h-3 text-red-500 shrink-0" />
                                    <span>Hemşire Çağrı Butonu Eğitim Videosu Gösterildi</span>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

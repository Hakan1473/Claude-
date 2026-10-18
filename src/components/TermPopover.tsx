import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FC, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, RotateCcw, Info } from 'lucide-react';
import { explainTerm, type TermCategory, type TermExplanation } from '../services/termExplainer';

interface TermPopoverProps {
  term: string;
  category: TermCategory;
  /** Screen rect of the tapped item; the card grows out of it. */
  anchor: DOMRect;
  glyphClass: string;
  icon: ReactNode;
  onClose: () => void;
}

const MARGIN = 12;

/** Vademecum card: a small floating sheet that explains a captured clinical term. */
export const TermPopover: FC<TermPopoverProps> = ({ term, category, anchor, glyphClass, icon, onClose }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<TermExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pos, setPos] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    width: number;
    originX: number;
    above: boolean;
    docked: boolean;
  }>({ left: -9999, top: 0, width: 360, originX: 180, above: false, docked: false });

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    explainTerm(term, category)
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message || 'Açıklama şu anda alınamadı'));
    return () => {
      alive = false;
    };
  }, [term, category, attempt]);

  // Place the card next to the tapped item (flipping above when needed) and keep it fully on screen
  // as its content loads. On phones it docks to the bottom like a notification card.
  const place = useCallback(
    (height: number) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (vw < 640) {
        setPos({ left: MARGIN, width: vw - MARGIN * 2, bottom: MARGIN, originX: (vw - MARGIN * 2) / 2, above: true, docked: true });
        return;
      }
      const width = Math.min(360, vw - MARGIN * 2);
      const centerX = anchor.left + anchor.width / 2;
      const left = Math.min(Math.max(centerX - width / 2, MARGIN), vw - width - MARGIN);
      const fitsBelow = anchor.bottom + 8 + height <= vh - MARGIN;
      const fitsAbove = anchor.top - 8 - height >= MARGIN;
      const above = !fitsBelow && (fitsAbove || anchor.top > vh - anchor.bottom);
      let top = above ? anchor.top - 8 - height : anchor.bottom + 8;
      top = Math.min(Math.max(top, MARGIN), vh - MARGIN - height);
      setPos({ left, width, top, originX: Math.min(Math.max(centerX - left, 24), width - 24), above, docked: false });
    },
    [anchor]
  );

  useLayoutEffect(() => {
    place(cardRef.current?.offsetHeight || 320);
  }, [place]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const ro = new ResizeObserver(() => place(card.offsetHeight));
    ro.observe(card);
    return () => ro.disconnect();
  }, [place]);

  // Dismiss on outside tap, Escape, scroll or resize
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onScroll = (e: Event) => {
      if (cardRef.current && e.target instanceof Node && cardRef.current.contains(e.target)) return;
      onClose();
    };
    const t = window.setTimeout(() => document.addEventListener('pointerdown', onPointer), 0);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label={`${term} açıklaması`}
      className={`term-popover fixed z-[80] rounded-[22px] overflow-hidden ${pos.docked ? 'term-popover-docked' : ''}`}
      style={{
        left: pos.left,
        top: pos.top,
        bottom: pos.bottom,
        width: pos.width,
        maxHeight: `calc(100dvh - ${MARGIN * 2}px)`,
        overflowY: 'auto',
        transformOrigin: `${pos.originX}px ${pos.above ? '100%' : '0%'}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <span className={`glyph w-9 h-9 rounded-[10px] ${glyphClass} shadow-[0_4px_12px_-4px_rgba(0,0,0,0.35)]`}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-semibold tracking-[-0.022em] text-label leading-tight truncate">
            {data?.title || term}
          </p>
          {data?.subtitle ? (
            <p className="text-[13px] text-label-2 leading-snug mt-0.5">{data.subtitle}</p>
          ) : !data && !error ? (
            <span className="term-skeleton block h-3 w-32 mt-1.5 rounded-full" />
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="pressable w-7 h-7 rounded-full bg-fill text-label-2 flex items-center justify-center shrink-0 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>
      </div>

      <div className="px-4 pb-4">
        {error ? (
          <div className="flex items-center justify-between gap-3 py-2">
            <p className="text-[14px] text-label-2">{error}</p>
            <button
              type="button"
              onClick={() => setAttempt((a) => a + 1)}
              className="pressable btn-tinted h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-[13px] font-medium cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.25} />
              Tekrar dene
            </button>
          </div>
        ) : !data ? (
          <div className="space-y-2 pt-1" aria-label="Yükleniyor">
            <span className="term-skeleton block h-3.5 w-full rounded-full" />
            <span className="term-skeleton block h-3.5 w-[86%] rounded-full" />
            <span className="term-skeleton block h-3.5 w-[64%] rounded-full" />
            <div className="pt-2 space-y-2">
              <span className="term-skeleton block h-10 w-full rounded-[12px]" />
              <span className="term-skeleton block h-10 w-full rounded-[12px]" />
            </div>
          </div>
        ) : (
          <div className="term-content">
            {!data.recognized && (
              <p className="mb-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-sys-orange">
                <Info className="w-3.5 h-3.5" strokeWidth={2.25} />
                Terim kesin olarak tanımlanamadı
              </p>
            )}
            <p className="text-[15px] leading-relaxed tracking-[-0.012em] text-label">{data.summary}</p>
            {data.fields.length > 0 && (
              <dl className="mt-3 rounded-[14px] bg-fill-2 overflow-hidden">
                {data.fields.map((f, i) => (
                  <div key={f.label} className={`px-3 py-2.5 ${i > 0 ? 'hairline-t' : ''}`}>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.04em] text-label-2">{f.label}</dt>
                    <dd className="text-[14px] text-label leading-snug mt-0.5">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}

        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-label-3">
          <Sparkles className="w-3 h-3 shrink-0" strokeWidth={2.25} />
          Yapay zekâ özetidir; klinik kararlar için doğrulayın.
        </p>
      </div>
    </div>,
    document.body
  );
};

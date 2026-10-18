import { useEffect, useState, useMemo, useRef, useCallback, type FC } from 'react';
import { MULTILINGUAL_WORDS } from '../data/multilingualWords';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: FC<SplashScreenProps> = ({ onFinish }) => {
  const [isFading, setIsFading] = useState(false);
  // Keep the latest callback in a ref: App passes a new arrow function on every render,
  // which previously restarted the timers and could keep the splash on screen.
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const finishedRef = useRef(false);

  const finish = useCallback((delay: number) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setIsFading(true);
    window.setTimeout(() => onFinishRef.current(), delay);
  }, []);

  useEffect(() => {
    // Show the splash for ~2.6 s, then fade out smoothly (matches the 700 ms transition)
    const timer = window.setTimeout(() => finish(700), 2600);
    return () => window.clearTimeout(timer);
  }, [finish]);

  const handleInstantSkip = () => finish(300);

  // Dense typographic strips of care words in every script, gliding in alternating directions
  const wordRows = useMemo(() => {
    // Deterministic shuffle so the composition is stable between renders
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const words = [...MULTILINGUAL_WORDS];
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    const rowCount = 28;
    const perRow = 14;
    return Array.from({ length: rowCount }, (_, r) => ({
      rowId: `row-${r}`,
      isReverse: r % 2 === 1,
      serif: r % 2 === 0,
      duration: `${70 + ((r * 13) % 5) * 14}s`,
      offset: `-${(r * 7) % 40}s`,
      items: Array.from({ length: perRow }, (_, k) => {
        const word = words[(r * perRow + k * 3) % words.length];
        return { word, accent: (r + k) % 6 === 0, slotId: `r${r}-w${k}` };
      }),
    }));
  }, []);

  return (
    <button
      type="button"
      onClick={handleInstantSkip}
      aria-label="Uygulamaya geç"
      className={`fixed inset-0 z-[70] flex items-center justify-center bg-bg select-none cursor-pointer overflow-hidden border-none transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        isFading ? 'opacity-0 scale-[1.02] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Multilingual word strips */}
      <div aria-hidden="true" className="splash-words absolute inset-0 pointer-events-none overflow-hidden flex flex-col justify-center">
        {wordRows.map((row) => {
          const trackClass = row.isReverse ? 'track-scroll-right' : 'track-scroll-left';
          const renderTrack = (prefix: string) => (
            <div
              className={`flex shrink-0 items-baseline gap-[0.55em] pr-[0.55em] ${trackClass}`}
              style={{ animationDuration: row.duration, animationDelay: row.offset }}
            >
              {row.items.map((item) => (
                <span
                  key={`${prefix}-${item.slotId}`}
                  className={`whitespace-nowrap ${row.serif ? 'splash-word-serif' : 'splash-word-sans'} ${
                    item.accent ? 'splash-word-accent' : ''
                  }`}
                >
                  {item.word}
                </span>
              ))}
            </div>
          );
          return (
            <div key={row.rowId} className="splash-row w-full overflow-hidden flex whitespace-nowrap">
              {renderTrack('t1')}
              {renderTrack('t2')}
            </div>
          );
        })}
      </div>

      {/* Soft clearing so the logo and title stay perfectly legible */}
      <div aria-hidden="true" className="splash-clearing absolute inset-0 pointer-events-none" />

      {/* Centerpiece */}
      <div className="relative z-10 flex flex-col items-center text-center px-8">
        <div className="relative anim-splash-logo">
          <span aria-hidden="true" className="ai-glow -inset-3 opacity-60 dark:opacity-80" />
          <img
            src="/logo.png"
            alt="Canlı Sesli Tercüman"
            className="relative w-[104px] h-[104px] sm:w-[120px] sm:h-[120px] rounded-[26px] sm:rounded-[28px] bg-white object-contain shadow-[0_0_0_0.5px_var(--hairline),0_20px_50px_-12px_rgba(0,0,0,0.25)]"
          />
        </div>

        <h1
          className="anim-rise mt-7 text-[28px] sm:text-[34px] font-semibold tracking-[-0.03em] text-label leading-tight"
          style={{ animationDelay: '0.15s' }}
        >
          Canlı Sesli Tercüman
        </h1>
        <p className="anim-rise mt-2 text-[15px] sm:text-[17px] text-label-2 max-w-xs" style={{ animationDelay: '0.25s' }}>
          Sağlık personeli ve hasta için iki yönlü iletişim.
        </p>

        <div className="anim-rise mt-8 w-28 h-[3px] rounded-full bg-fill overflow-hidden" style={{ animationDelay: '0.35s' }}>
          <div className="anim-progress w-full h-full rounded-full bg-accent" />
        </div>

        <p className="anim-rise mt-8 text-[12px] text-label-3" style={{ animationDelay: '0.45s' }}>
          60+ dilde anlık tercüme · Hakan Karaarslan tarafından oluşturulmuştur
        </p>
      </div>
    </button>
  );
};

import { useEffect, useState, useMemo, type FC } from 'react';
import { POPULAR_LANGUAGES } from '../services/languageCatalog';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: FC<SplashScreenProps> = ({ onFinish }) => {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Show splash screen for ~1.8 seconds, then trigger a smooth fade-out
    const timer = setTimeout(() => {
      setIsFading(true);
      const closeTimer = setTimeout(() => {
        onFinish();
      }, 700); // matches transition duration
      return () => clearTimeout(closeTimer);
    }, 1800);

    return () => clearTimeout(timer);
  }, [onFinish]);

  const handleInstantSkip = () => {
    setIsFading(true);
    setTimeout(() => {
      onFinish();
    }, 300);
  };

  // Native language names drifting softly in the background
  const languageRows = useMemo(() => {
    const list = POPULAR_LANGUAGES;
    const rowCount = 7;
    const chunkSize = Math.ceil(list.length / rowCount);
    const rows = [];

    for (let i = 0; i < rowCount; i++) {
      const slice = list.slice(i * chunkSize, (i + 1) * chunkSize);
      const rawItems = slice.length >= 6 ? slice : [...slice, ...list.slice(0, 6 - slice.length)];
      rows.push({
        rowId: `row-${i}`,
        isReverse: i % 2 === 1,
        duration: `${48 + (i % 3) * 10}s`,
        items: rawItems.map((lang, itemIdx) => ({ ...lang, slotId: `row-${i}-item-${itemIdx}-${lang.code}` })),
      });
    }
    return rows;
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
      {/* Faint, drifting language names */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none overflow-hidden flex flex-col justify-center gap-5 sm:gap-7 opacity-[0.07] dark:opacity-[0.1] [mask-image:radial-gradient(ellipse_75%_50%_at_center,transparent_55%,#000_100%)]"
      >
        {languageRows.map((row) => {
          const trackClass = row.isReverse ? 'track-scroll-right' : 'track-scroll-left';
          const renderTrack = (prefix: string, hidden?: boolean) => (
            <div
              aria-hidden={hidden}
              className={`flex shrink-0 items-center gap-8 pr-8 ${trackClass}`}
              style={{ animationDuration: row.duration }}
            >
              {row.items.map((lang) => (
                <span
                  key={`${prefix}-${lang.slotId}`}
                  className="text-[34px] sm:text-[44px] font-semibold tracking-[-0.03em] text-label whitespace-nowrap"
                >
                  {lang.nameTr}
                </span>
              ))}
            </div>
          );
          return (
            <div key={row.rowId} className="w-full overflow-hidden flex whitespace-nowrap">
              {renderTrack('t1')}
              {renderTrack('t2', true)}
            </div>
          );
        })}
      </div>

      {/* Centerpiece */}
      <div className="relative z-10 flex flex-col items-center text-center px-8">
        <img
          src="/logo.png"
          alt="Canlı Sesli Tercüman"
          className="anim-splash-logo w-[104px] h-[104px] sm:w-[120px] sm:h-[120px] rounded-[26px] sm:rounded-[28px] bg-white object-contain shadow-[0_0_0_0.5px_var(--hairline),0_20px_50px_-12px_rgba(0,113,227,0.35)]"
        />

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

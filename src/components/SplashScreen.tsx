import { useEffect, useState, useMemo, type FC } from 'react';
import { POPULAR_LANGUAGES } from '../services/languageCatalog';
import { Sparkles } from 'lucide-react';
import { CountryFlag } from './CountryFlag';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: FC<SplashScreenProps> = ({ onFinish }) => {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Show splash screen for ~1.8 seconds, then trigger ultra-smooth fade-out
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

  // Partition languages across 8 full-height horizontal rows
  const languageRows = useMemo(() => {
    const list = POPULAR_LANGUAGES;
    const rowCount = 8;
    const chunkSize = Math.ceil(list.length / rowCount);
    const rows = [];

    for (let i = 0; i < rowCount; i++) {
      const slice = list.slice(i * chunkSize, (i + 1) * chunkSize);
      // Fallback if slice is small to ensure track is full
      const rawItems = slice.length >= 6 ? slice : [...slice, ...list.slice(0, 6 - slice.length)];
      const items = rawItems.map((lang, itemIdx) => ({
        ...lang,
        slotId: `row-${i}-item-${itemIdx}-${lang.code}`,
      }));
      rows.push({
        rowId: `row-${i}`,
        isReverse: i % 2 === 1,
        duration: `${24 + (i % 4) * 5}s`,
        items,
      });
    }
    return rows;
  }, []);

  return (
    <button
      type="button"
      onClick={handleInstantSkip}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#F8FAFC] dark:bg-[#0A0E17] select-none cursor-pointer overflow-hidden text-left border-none transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isFading ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* ============================================================ */}
      {/* Crisp Full-Screen Language Strips (No Blur, Sharp & Clear)  */}
      {/* ============================================================ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex flex-col justify-between py-2 select-none opacity-85 dark:opacity-75">
        {languageRows.map((row) => {
          const trackClass = row.isReverse ? 'track-scroll-right' : 'track-scroll-left';

          return (
            <div key={row.rowId} className="w-full overflow-hidden flex whitespace-nowrap">
              {/* Track 1 */}
              <div
                className={`flex shrink-0 items-center gap-2.5 pr-2.5 ${trackClass}`}
                style={{ animationDuration: row.duration }}
              >
                {row.items.map((lang) => (
                  <div
                    key={`t1-${lang.slotId}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#131B2A] border border-slate-200/90 dark:border-slate-700/80 shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_6px_rgba(0,0,0,0.3)] shrink-0"
                  >
                    <CountryFlag flag={lang.flag} code={lang.code} country={lang.country} size="xs" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                      {lang.nameTr}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">
                      · {lang.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Track 2 (Exact duplicate for 100% seamless, hitch-free infinite loop) */}
              <div
                aria-hidden="true"
                className={`flex shrink-0 items-center gap-2.5 pr-2.5 ${trackClass}`}
                style={{ animationDuration: row.duration }}
              >
                {row.items.map((lang) => (
                  <div
                    key={`t2-${lang.slotId}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#131B2A] border border-slate-200/90 dark:border-slate-700/80 shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_6px_rgba(0,0,0,0.3)] shrink-0"
                  >
                    <CountryFlag flag={lang.flag} code={lang.code} country={lang.country} size="xs" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                      {lang.nameTr}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">
                      · {lang.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* Centerpiece: High-End Floating Brand Card                     */}
      {/* ============================================================ */}
      <div className="relative z-20 max-w-sm w-full bg-white/95 dark:bg-[#0E1524]/95 border border-slate-200 dark:border-slate-700/80 rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.22)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500">
        {/* Logo with Ambient Glow */}
        <div className="relative mb-4">
          <div className="absolute -inset-3 rounded-2xl bg-teal-500/20 dark:bg-teal-400/20 blur-xl animate-pulse" />
          <img
            src="/logo.png"
            alt="Sistem Logosu"
            className="relative w-28 h-28 sm:w-32 sm:h-32 object-contain drop-shadow-md rounded-2xl border border-slate-100 dark:border-white/10"
          />
        </div>

        {/* Title */}
        <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase mb-1">
          Canlı Sesli Tercüman
        </h1>

        {/* Subtitle */}
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium max-w-xs mb-3">
          Sağlık Personeli & Hasta İki Yönlü İletişim Sistemi
        </p>

        {/* 60+ Languages Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-500/30 text-teal-800 dark:text-teal-300 text-[11px] font-semibold mb-4 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>60+ Dilde Anlık Canlı Tercüme</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-[200px] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
          <div className="w-full h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
        </div>

        {/* Developer Attribution */}
        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tracking-wide">
          Hakan Karaarslan tarafından oluşturulmuştur
        </p>
      </div>
    </button>
  );
};

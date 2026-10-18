import { useEffect, useState, type CSSProperties } from 'react';

interface CountryFlagProps {
  flag: string;
  code?: string;
  country?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** Silk-cloth waving animation (on by default; honours prefers-reduced-motion). */
  animate?: boolean;
}

/**
 * Universal conversion from a Unicode Regional Indicator Flag emoji to a 2-letter ISO country code.
 * Example: 🇬 (1F1EC) + 🇧 (1F1E7) -> 'gb'
 * 🇹 (1F1F9) + 🇷 (1F1F7) -> 'tr'
 */
export function flagEmojiToCountryCode(flagEmoji: string): string | null {
  if (!flagEmoji) return null;
  const chars = Array.from(flagEmoji);
  if (chars.length === 2) {
    const c1 = chars[0].codePointAt(0);
    const c2 = chars[1].codePointAt(0);
    if (c1 && c2 && c1 >= 0x1f1e6 && c1 <= 0x1f1ff && c2 >= 0x1f1e6 && c2 <= 0x1f1ff) {
      const letter1 = String.fromCharCode(c1 - 0x1f1e6 + 65).toLowerCase();
      const letter2 = String.fromCharCode(c2 - 0x1f1e6 + 65).toLowerCase();
      return `${letter1}${letter2}`;
    }
  }
  return null;
}

/**
 * Converts any emoji to Twemoji SVG URL.
 * Example: 🇬🇧 -> 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1ec-1f1e7.svg'
 */
export function flagEmojiToTwemojiUrl(emoji: string): string {
  const codePoints = Array.from(emoji)
    .map((c) => c.codePointAt(0)?.toString(16))
    .filter(Boolean)
    .join('-');
  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${codePoints}.svg`;
}

// Special overrides for custom flags or scripts
const SPECIAL_CODE_MAP: Record<string, string> = {
  en: 'gb',
  ar: 'sa',
  zh: 'cn',
  ja: 'jp',
  ko: 'kr',
  hi: 'in',
  ur: 'pk',
  bn: 'bd',
  fa: 'ir',
  he: 'il',
  el: 'gr',
  cs: 'cz',
  da: 'dk',
  sv: 'se',
  vi: 'vn',
  uk: 'ua',
  sr: 'rs',
  sl: 'si',
  hy: 'am',
  ka: 'ge',
  sq: 'al',
  ku: 'iq', // Kurdish regional
};

// Flag dimensions in px (width × height, 3:2-ish like real flags)
const DIMENSIONS: Record<NonNullable<CountryFlagProps['size']>, [number, number]> = {
  xs: [21, 15],
  sm: [26, 18],
  md: [30, 22],
  lg: [36, 26],
  xl: [48, 32],
};

// Stable per-flag phase so neighbouring flags never wave in lockstep
function phaseFor(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

const WAVE_DURATION = 2.8; // seconds per wave cycle

export const CountryFlag: React.FC<CountryFlagProps> = ({
  flag,
  code,
  country = '',
  size = 'md',
  className = '',
  animate = true,
}) => {
  // 0 = FlagCDN raster, 1 = Twemoji SVG, 2 = emoji text fallback
  const [sourceIndex, setSourceIndex] = useState(0);

  // Reset the fallback chain whenever a different flag is shown in the same slot
  // (e.g. the header pill after a language change)
  useEffect(() => {
    setSourceIndex(0);
  }, [flag, code]);

  const derivedIso = flagEmojiToCountryCode(flag);
  const fallbackIso = code ? SPECIAL_CODE_MAP[code] || code.toLowerCase() : null;
  const iso = derivedIso || fallbackIso;

  const flagcdnUrl = iso ? `https://flagcdn.com/w160/${iso}.png` : null;
  const twemojiUrl = flagEmojiToTwemojiUrl(flag);
  const sources = [flagcdnUrl, twemojiUrl].filter(Boolean) as string[];
  const currentSrc = sources[sourceIndex];

  const [w, h] = DIMENSIONS[size];
  const label = country || flag;

  if (!currentSrc) {
    return (
      <span
        role="img"
        className={`inline-flex items-center justify-center font-normal select-none leading-none ${className}`}
        style={{ width: w, height: h, fontSize: h }}
        title={label}
        aria-label={label}
      >
        {flag}
      </span>
    );
  }

  const handleError = () => setSourceIndex((i) => i + 1);

  if (!animate) {
    return (
      <span
        role="img"
        className={`flag-static relative inline-block shrink-0 align-middle select-none ${className}`}
        style={{ width: w, height: h }}
        title={label}
        aria-label={label}
      >
        <img
          src={currentSrc}
          alt=""
          loading="lazy"
          onError={handleError}
          className="w-full h-full object-cover block pointer-events-none"
        />
      </span>
    );
  }

  // Cloth simulation: the flag is cut into thin vertical strips that ripple with a
  // phase delay, amplitude growing away from the hoist, each lit and shaded in sync.
  const slices = Math.max(10, Math.round(w / 1.8));
  const amplitude = Math.max(1, h * 0.085);
  const basePhase = phaseFor(iso || flag) * WAVE_DURATION;

  return (
    <span
      role="img"
      className={`flag-wave relative inline-flex shrink-0 align-middle select-none ${className}`}
      style={{ width: w, height: h }}
      title={label}
      aria-label={label}
    >
      {/* Invisible probe drives the CDN → Twemoji → emoji fallback chain */}
      <img src={currentSrc} alt="" hidden onError={handleError} />
      {Array.from({ length: slices }, (_, i) => {
        const t = i / (slices - 1); // 0 at the hoist, 1 at the fly end
        const style = {
          // +0.3px compensates the -0.3px overlap margin so the strips span the full flag width
          width: `calc(${100 / slices}% + 0.3px)`,
          backgroundImage: `url("${currentSrc}")`,
          backgroundSize: `${slices * 100}% 100%`,
          backgroundPosition: `${t * 100}% 0`,
          '--amp': `${(0.15 + 0.85 * t) * amplitude}px`,
          '--tilt': `${(0.2 + 0.8 * t) * 1.1}deg`,
          '--d': `${-(basePhase + t * WAVE_DURATION * 0.85)}s`,
          '--dur': `${WAVE_DURATION}s`,
        } as CSSProperties;
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed set of slices
            key={i}
            className={`flag-slice ${i === 0 ? 'flag-slice-first' : ''} ${i === slices - 1 ? 'flag-slice-last' : ''}`}
            style={style}
          />
        );
      })}
      {/* Fixed silk sheen across the whole cloth */}
      <span aria-hidden="true" className="flag-gloss" />
    </span>
  );
};

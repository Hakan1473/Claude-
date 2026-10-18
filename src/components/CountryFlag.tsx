import { useEffect, useState } from 'react';

interface CountryFlagProps {
  flag: string;
  code?: string;
  country?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
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

// Enlarged flag size classes for superior legibility and prominence (Pixel-perfect across all browsers)
const SIZE_CLASSES = {
  xs: 'w-[22px] h-[16px]',
  sm: 'w-[26px] h-[18px] text-xs',
  md: 'w-[30px] h-[22px] text-sm',
  lg: 'w-[36px] h-[26px] text-base',
  xl: 'w-[48px] h-[32px] text-lg',
};

export const CountryFlag: React.FC<CountryFlagProps> = ({
  flag,
  code,
  country = '',
  size = 'md',
  className = '',
  animate = true,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  // Reset the fallback chain whenever a different flag is shown in the same slot
  // (e.g. the header pill after a language change)
  useEffect(() => {
    setImgFailed(false);
    setUsedFallback(false);
  }, [flag, code]);

  // 1. Determine ISO 2-letter country code
  const derivedIso = flagEmojiToCountryCode(flag);
  const fallbackIso = code ? SPECIAL_CODE_MAP[code] || code.toLowerCase() : null;
  const iso = derivedIso || fallbackIso;

  // 2. Compute primary URL (FlagCDN vector/raster) and Twemoji URL
  const flagcdnUrl = iso ? `https://flagcdn.com/w80/${iso}.png` : null;
  const twemojiUrl = flagEmojiToTwemojiUrl(flag);

  // 3. Fallback when image fails completely
  if (imgFailed || (!flagcdnUrl && !twemojiUrl)) {
    return (
      <span
        role="img"
        className={`inline-flex items-center justify-center font-normal select-none ${className}`}
        title={country || flag}
        aria-label={country || flag}
      >
        {flag}
      </span>
    );
  }

  const currentSrc = usedFallback ? twemojiUrl : flagcdnUrl || twemojiUrl;

  return (
    <span
      role="img"
      className={`inline-flex items-center relative select-none align-middle shrink-0 ${className}`}
      style={{ perspective: '350px' }}
      title={country || flag}
      aria-label={country || flag}
    >
      {/* Fluttering Wind Cloth (Pure Flag, No Pole, Ultra-Realistic 3D Wave) */}
      <span
        className={`relative inline-block overflow-hidden rounded-[3px] shadow-[0_2px_5px_rgba(0,0,0,0.18)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)] border border-black/10 dark:border-white/15 ${
          animate ? 'flag-animated-cloth' : ''
        } ${SIZE_CLASSES[size]}`}
      >
        <img
          src={currentSrc}
          srcSet={!usedFallback && iso ? `https://flagcdn.com/w160/${iso}.png 2x` : undefined}
          alt={country || flag}
          loading="lazy"
          onError={() => {
            if (!usedFallback && flagcdnUrl) {
              setUsedFallback(true);
            } else {
              setImgFailed(true);
            }
          }}
          className="w-full h-full object-cover block select-none pointer-events-none"
        />

        {/* Dynamic 3D specular light & fold wave ripple across the silk fabric */}
        {animate && (
          <span
            className="flag-animated-sheen absolute inset-0 pointer-events-none mix-blend-overlay opacity-85"
            style={{
              background:
                'linear-gradient(105deg, transparent 15%, rgba(255,255,255,0.45) 30%, rgba(0,0,0,0.22) 50%, rgba(255,255,255,0.4) 70%, rgba(0,0,0,0.2) 85%, transparent 100%)',
              backgroundSize: '200% 100%',
            }}
          />
        )}
      </span>
    </span>
  );
};

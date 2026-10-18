import { useEffect, useState, useRef, useCallback, type FC } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

// Greetings shown one after another, Mac "hello" style: [greeting, language name in that language]
const GREETINGS: [string, string][] = [
  ['Merhaba', 'Türkçe'],
  ['Hello', 'English'],
  ['مرحبا', 'العربية'],
  ['Здравствуйте', 'Русский'],
  ['Hola', 'Español'],
  ['你好', '中文'],
  ['Bonjour', 'Français'],
  ['こんにちは', '日本語'],
  ['Hallo', 'Deutsch'],
];

const GREETING_INTERVAL = 1150;

export const SplashScreen: FC<SplashScreenProps> = ({ onFinish }) => {
  const [isFading, setIsFading] = useState(false);
  // -1 = nothing yet, so the first greeting also fades in
  const [index, setIndex] = useState(-1);
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
    // Long enough for three greetings, then a smooth 700 ms fade
    const timer = window.setTimeout(() => finish(700), 3300);
    return () => window.clearTimeout(timer);
  }, [finish]);

  useEffect(() => {
    let id = 0;
    const start = window.setTimeout(() => {
      setIndex(0);
      id = window.setInterval(() => setIndex((i) => i + 1), GREETING_INTERVAL);
    }, 350);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(id);
    };
  }, []);

  const handleInstantSkip = () => finish(300);
  const current = index < 0 ? -1 : index % GREETINGS.length;
  const previous = index > 0 ? (index - 1) % GREETINGS.length : -1;
  const language = current < 0 ? '' : GREETINGS[current][1];

  return (
    <button
      type="button"
      onClick={handleInstantSkip}
      aria-label="Uygulamaya geç"
      className={`fixed inset-0 z-[70] bg-bg select-none cursor-pointer overflow-hidden border-none transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        isFading ? 'opacity-0 scale-[1.02] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
        <img
          src="/logo.png"
          alt="Canlı Sesli Tercüman"
          className="anim-splash-logo w-[88px] h-[88px] sm:w-[104px] sm:h-[104px] rounded-[21px] sm:rounded-[24px] bg-white object-contain shadow-[0_0_0_0.5px_var(--hairline),0_18px_44px_-14px_rgba(0,40,120,0.35)]"
        />

        {/* Greetings cross-fade with a soft blur, one language at a time */}
        <div className="relative w-full h-[84px] sm:h-[112px] mt-9 sm:mt-11" aria-live="polite">
          {GREETINGS.map(([word], i) => (
            <span
              key={word}
              dir="auto"
              aria-hidden={i !== current}
              className={`splash-hello ${i === current ? 'on' : i === previous ? 'off' : ''}`}
            >
              {word}
            </span>
          ))}
        </div>

        <p
          key={language}
          className="splash-lang mt-2 h-5 text-[12px] sm:text-[13px] font-medium uppercase tracking-[0.12em] text-label-3"
        >
          {language}
        </p>

        <p
          className="anim-rise mt-7 text-[15px] sm:text-[17px] text-label-2 tracking-[-0.01em]"
          style={{ animationDelay: '0.5s' }}
        >
          Hastanızla aynı dili konuşun.
        </p>

        <div
          className="anim-rise mt-9 w-24 h-[3px] rounded-full bg-fill overflow-hidden"
          style={{ animationDelay: '0.6s' }}
        >
          <div className="splash-progress w-full h-full rounded-full bg-label" />
        </div>
      </div>

      <p
        className="anim-rise absolute left-0 right-0 text-center text-[11px] sm:text-[12px] text-label-3"
        style={{ animationDelay: '0.8s', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 28px)' }}
      >
        Canlı Sesli Tercüman · Hakan Karaarslan tarafından oluşturulmuştur
      </p>
    </button>
  );
};

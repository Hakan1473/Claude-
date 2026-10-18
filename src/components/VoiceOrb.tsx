import { useEffect, useRef, type FC, type ReactNode } from 'react';

export type OrbTone = 'idle' | 'muted' | 'connecting' | 'listening' | 'interpreting' | 'speaking' | 'error';

type RGB = [number, number, number];

interface Palette {
  base: RGB;
  colors: RGB[]; // always 5 liquid colours
  glow: string;
}

const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// Colour stories from the Figma spec ("Canlı Ses Küresi")
const PALETTES: Record<OrbTone, Palette> = {
  idle: {
    base: hex('#1677F2'),
    colors: ['#0A84FF', '#5E5CE6', '#64D2FF', '#0A84FF', '#409CFF'].map(hex),
    glow: 'rgba(10,132,255,0.55)',
  },
  connecting: {
    base: hex('#2A55C9'),
    colors: ['#0A84FF', '#5E5CE6', '#64D2FF', '#FF9F0A', '#5E5CE6'].map(hex),
    glow: 'rgba(94,92,230,0.5)',
  },
  listening: {
    base: hex('#1E5FD6'),
    colors: ['#0A84FF', '#30D158', '#64D2FF', '#5E5CE6', '#40C8E0'].map(hex),
    glow: 'rgba(48,209,88,0.5)',
  },
  interpreting: {
    base: hex('#5B2FC4'),
    colors: ['#BF5AF2', '#FF9F0A', '#5E5CE6', '#FF375F', '#BF5AF2'].map(hex),
    glow: 'rgba(191,90,242,0.55)',
  },
  speaking: {
    base: hex('#3A2AA8'),
    colors: ['#0A84FF', '#FF375F', '#FF9F0A', '#BF5AF2', '#30D158'].map(hex),
    glow: 'rgba(255,55,95,0.5)',
  },
  muted: {
    base: hex('#6E6E73'),
    colors: ['#636366', '#8E8E93', '#636366', '#AEAEB2', '#48484A'].map(hex),
    glow: 'rgba(142,142,147,0.4)',
  },
  error: {
    base: hex('#5C1A1A'),
    colors: ['#FF453A', '#FF9F0A', '#FF375F', '#BF5AF2', '#FF453A'].map(hex),
    glow: 'rgba(255,69,58,0.45)',
  },
};

// Per-blob orbit personality so the liquid never looks mechanical
const BLOBS = [
  { sx: 0.71, sy: 0.53, px: 0.0, py: 1.7, r: 0.62 },
  { sx: 0.47, sy: 0.83, px: 2.1, py: 0.4, r: 0.55 },
  { sx: 0.93, sy: 0.61, px: 4.2, py: 3.1, r: 0.5 },
  { sx: 0.59, sy: 0.97, px: 1.3, py: 5.0, r: 0.46 },
  { sx: 1.13, sy: 0.73, px: 3.4, py: 2.6, r: 0.4 },
];

interface VoiceOrbProps {
  tone: OrbTone;
  /** Returns the current voice loudness (0–1); polled every animation frame. */
  getLevel: () => number;
  className?: string;
  children?: ReactNode;
}

/**
 * Siri-style "liquid light" sphere. Colour fields and water waves flow inside the circle
 * (never outside it) and swell with the live voice level — yours while listening,
 * the interpreter's while it speaks.
 */
export const VoiceOrb: FC<VoiceOrbProps> = ({ tone, getLevel, className = '', children }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);
  const toneRef = useRef(tone);
  const getLevelRef = useRef(getLevel);
  toneRef.current = tone;
  getLevelRef.current = getLevel;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Live (animated) palette that eases towards the target tone's palette
    const start = PALETTES[toneRef.current];
    const live = { base: [...start.base] as RGB, colors: start.colors.map((c) => [...c] as RGB) };

    let size = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      size = Math.max(1, Math.round(rect.width * dpr));
      canvas.width = size;
      canvas.height = size;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();
    let t = Math.random() * 100;
    let level = 0;

    const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
    const mix = (a: RGB, b: RGB, k: number) => {
      a[0] += (b[0] - a[0]) * k;
      a[1] += (b[1] - a[1]) * k;
      a[2] += (b[2] - a[2]) * k;
    };

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const currentTone = toneRef.current;
      const target = PALETTES[currentTone];

      // Voice level with a fast attack and a soft, liquid release
      let raw = 0;
      try {
        raw = Math.min(1, Math.max(0, getLevelRef.current() || 0));
      } catch {
        raw = 0;
      }
      if (currentTone === 'interpreting') raw = Math.max(raw, 0.28 + 0.12 * Math.sin(now / 260));
      if (currentTone === 'connecting') raw = Math.max(raw, 0.12 + 0.08 * Math.sin(now / 400));
      level += (raw - level) * (raw > level ? 0.32 : 0.06);

      const calm = currentTone === 'idle' || currentTone === 'muted';
      // Reduced-motion users get a near-still, gently breathing sphere
      t += dt * (calm ? 0.35 : 0.55 + level * 2.4) * (reduceMotion ? 0.12 : 1);

      const k = Math.min(1, dt * 3.2);
      mix(live.base, target.base, k);
      live.colors.forEach((c, i) => mix(c, target.colors[i], k));

      const S = size;
      const R = S / 2;
      ctx.save();
      ctx.clearRect(0, 0, S, S);
      ctx.beginPath();
      ctx.arc(R, R, R, 0, Math.PI * 2);
      ctx.clip();

      // 1 — deep base
      const baseGrad = ctx.createRadialGradient(R * 0.8, R * 0.7, 0, R, R, R);
      baseGrad.addColorStop(0, rgba(live.base, 1));
      baseGrad.addColorStop(1, rgba([live.base[0] * 0.72, live.base[1] * 0.72, live.base[2] * 0.78], 1));
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, S, S);

      // 2 — drifting liquid colour fields
      ctx.globalCompositeOperation = 'screen';
      BLOBS.forEach((b, i) => {
        const orbit = R * (0.34 + 0.16 * level);
        const x = R + Math.cos(t * b.sx + b.px) * orbit * (0.75 + 0.25 * Math.sin(t * 0.37 + i));
        const y = R + Math.sin(t * b.sy + b.py) * orbit * (0.75 + 0.25 * Math.cos(t * 0.29 + i * 2));
        const rad = R * (b.r + 0.28 * level + 0.06 * Math.sin(t * 1.3 + i));
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        const c = live.colors[i];
        g.addColorStop(0, rgba(c, 1));
        g.addColorStop(0.5, rgba(c, 0.62));
        g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, S, S);
      });

      // 3 — water waves that rise and churn with the voice
      for (let w = 0; w < 3; w++) {
        const amp = R * (0.035 + 0.24 * level) * (1 - w * 0.22);
        const baseLine = S * (0.66 - 0.12 * level - w * 0.07);
        const freq = (1.6 + w * 0.7) / S;
        const speed = t * (1.4 + w * 0.6) * (w % 2 ? -1 : 1);
        ctx.beginPath();
        ctx.moveTo(0, S);
        for (let x = 0; x <= S; x += Math.max(2, S / 90)) {
          const y =
            baseLine +
            Math.sin(x * freq * Math.PI * 2 + speed) * amp +
            Math.sin(x * freq * Math.PI * 3.3 - speed * 0.7 + w) * amp * 0.35;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(S, S);
        ctx.closePath();
        const c = live.colors[(w + 1) % live.colors.length];
        const wg = ctx.createLinearGradient(0, baseLine - amp, 0, S);
        const light: RGB = [c[0] + (255 - c[0]) * 0.25, c[1] + (255 - c[1]) * 0.25, c[2] + (255 - c[2]) * 0.25];
        wg.addColorStop(0, rgba(light, 0.42 - w * 0.08));
        wg.addColorStop(1, rgba(c, 0.08));
        ctx.fillStyle = wg;
        ctx.fill();
      }

      // 4 — depth vignette so the sphere reads as a glass lens
      ctx.globalCompositeOperation = 'source-over';
      const vig = ctx.createRadialGradient(R, R * 0.85, R * 0.55, R, R, R);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.16)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, S, S);
      ctx.restore();

      if (glowRef.current) {
        glowRef.current.style.background = target.glow;
        glowRef.current.style.transform = `scale(${0.9 + level * 0.14})`;
        glowRef.current.style.opacity = String(0.3 + level * 0.35);
      }

      if (!document.hidden) raf = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      if (!document.hidden) {
        cancelAnimationFrame(raf);
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <span className={`relative block ${className}`}>
      {/* Soft coloured halo beneath the sphere (the liquid itself stays inside the circle) */}
      <span
        ref={glowRef}
        aria-hidden="true"
        className="absolute inset-[8%] top-[18%] rounded-full blur-2xl transition-[background] duration-700"
      />
      <span className="orb-shell absolute inset-0 rounded-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />
        {/* Glass: specular highlight + inner rim */}
        <span aria-hidden="true" className="orb-gloss absolute inset-0 rounded-full pointer-events-none" />
        <span className="absolute inset-0 flex items-center justify-center text-white">{children}</span>
      </span>
    </span>
  );
};

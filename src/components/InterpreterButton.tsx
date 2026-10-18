import { useCallback, useRef, type FC } from 'react';
import { VoiceOrb } from './VoiceOrb';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import type { SessionState } from '../types/interpreter';

interface InterpreterButtonProps {
  state: SessionState;
  onToggle: () => void;
  targetLanguageName?: string;
  audioLevel?: number;
  isMuted?: boolean;
  onToggleMute?: () => void;
  /** Loudness of the interpreter's spoken output (0–1), polled by the voice orb. */
  getOutputLevel?: () => number;
  /** Horizontal layout used on wide screens to leave room for the dual panes. */
  compact?: boolean;
}

type Tone = 'idle' | 'muted' | 'connecting' | 'listening' | 'interpreting' | 'speaking' | 'error';

// Text color, solid background and soft glow per state tone
const TONE: Record<Tone, { text: string; dot: string; glow: string; ring: string }> = {
  idle: { text: 'text-label-2', dot: 'bg-sys-green', glow: 'bg-accent', ring: 'border-accent/50' },
  muted: { text: 'text-sys-red', dot: 'bg-sys-red', glow: 'bg-sys-red', ring: 'border-sys-red/50' },
  connecting: { text: 'text-sys-orange', dot: 'bg-sys-orange', glow: 'bg-sys-orange', ring: 'border-sys-orange/50' },
  listening: { text: 'text-sys-green', dot: 'bg-sys-green', glow: 'bg-sys-green', ring: 'border-sys-green/50' },
  interpreting: { text: 'text-sys-orange', dot: 'bg-sys-orange', glow: 'bg-sys-orange', ring: 'border-sys-orange/50' },
  speaking: { text: 'text-accent', dot: 'bg-accent', glow: 'bg-accent', ring: 'border-accent/50' },
  error: { text: 'text-sys-red', dot: 'bg-sys-red', glow: 'bg-sys-red', ring: 'border-sys-red/50' },
};


export const InterpreterButton: FC<InterpreterButtonProps> = ({
  state,
  onToggle,
  targetLanguageName,
  audioLevel = 0,
  isMuted = false,
  onToggleMute,
  getOutputLevel,
  compact = false,
}) => {
  const isActive = state !== 'idle' && state !== 'error';
  const normLevel = Math.min(1, Math.max(0, audioLevel));

  const getStatusConfig = (): { title: string; subtitle: string; tone: Tone } => {
    if (isMuted && isActive) {
      return {
        title: 'Mikrofon Kapalı',
        subtitle: 'Sistem ses algılamıyor. Konuşmak için mikrofonu açın.',
        tone: 'muted',
      };
    }

    switch (state) {
      case 'connecting':
        return {
          title: 'Bağlanıyor…',
          subtitle: isMuted ? 'Canlı hat kuruluyor (mikrofon sessizde)' : 'Güvenli canlı ses hattı kuruluyor',
          tone: 'connecting',
        };
      case 'waiting_for_language':
        return {
          title: 'Hasta Dilini Belirtin',
          subtitle: 'Konuşarak veya yukarıdan seçebilirsiniz',
          tone: 'listening',
        };
      case 'ready':
      case 'listening':
        return {
          title: audioLevel > 0.04 ? 'Sesiniz İletiliyor' : 'Dinleniyor',
          subtitle: 'Konuşmanız bittiğinde otomatik çevrilir',
          tone: 'listening',
        };
      case 'interpreting':
        return {
          title: 'Çevriliyor…',
          subtitle: 'Cümle çevriliyor',
          tone: 'interpreting',
        };
      case 'speaking':
        return {
          title: 'Tercüme Seslendiriliyor',
          subtitle: `${targetLanguageName || 'Karşı taraf'} için okunuyor`,
          tone: 'speaking',
        };
      case 'error':
        return {
          title: 'Yeniden Başlat',
          subtitle: 'Bağlantı için butona dokunun',
          tone: 'error',
        };
      default:
        return {
          title: isMuted ? 'Sessiz Modda Başlat' : 'Tercümanı Başlat',
          subtitle: isMuted
            ? 'Mikrofon kapalı; sistem ses algılamayacak'
            : 'Dokunun, Türkçe veya hasta dilinde konuşun',
          tone: isMuted ? 'muted' : 'idle',
        };
    }
  };

  const status = getStatusConfig();
  const tone = TONE[status.tone];
  const isLive = isActive && !isMuted;

  const sizeClass = compact ? 'w-[84px] h-[84px]' : 'w-[96px] h-[96px] sm:w-[112px] sm:h-[112px]';

  // The orb follows your voice while listening and the interpreter's voice while it speaks
  const inputLevelRef = useRef(normLevel);
  inputLevelRef.current = isMuted ? 0 : normLevel;
  const outputGetterRef = useRef(getOutputLevel);
  outputGetterRef.current = getOutputLevel;
  const getOrbLevel = useCallback(() => {
    const out = outputGetterRef.current?.() ?? 0;
    return Math.max(inputLevelRef.current, out);
  }, []);

  const iconSize = compact ? 'w-7 h-7' : 'w-8 h-8 sm:w-9 sm:h-9';

  const button = (
    <button
      onClick={onToggle}
      type="button"
      aria-label={isActive ? 'Tercümanı Durdur' : 'Tercümanı Başlat'}
      title={isActive ? 'Tercümanı Durdur' : 'Tercümanı Başlat'}
      className={`relative shrink-0 ${sizeClass} rounded-full cursor-pointer transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.03] active:scale-[0.94]`}
    >
      <VoiceOrb tone={status.tone} getLevel={getOrbLevel} className="w-full h-full">
        {state === 'connecting' ? (
          <Loader2 className={`${iconSize} animate-spin drop-shadow`} strokeWidth={2} />
        ) : isActive ? (
          // Frosted stop glyph floating on the liquid
          <span
            className={`block bg-white/90 shadow-[0_2px_10px_rgba(0,0,0,0.2)] ${
              compact ? 'w-[22px] h-[22px] rounded-[6px]' : 'w-6 h-6 sm:w-7 sm:h-7 rounded-[7px]'
            }`}
          />
        ) : isMuted ? (
          <MicOff className={`${iconSize} drop-shadow`} strokeWidth={2} />
        ) : (
          <Mic className={`${iconSize} drop-shadow`} strokeWidth={2} />
        )}
      </VoiceOrb>
    </button>
  );

  const statusText = (
    <div className={`min-w-0 ${compact ? 'text-left' : 'text-center px-4 max-w-sm'}`}>
      <div className={`flex items-center gap-2 ${compact ? '' : 'justify-center'}`}>
        <span className="relative flex w-2 h-2 shrink-0">
          {isLive && <span className={`absolute inset-0 rounded-full animate-ping opacity-60 ${tone.dot}`} />}
          <span className={`relative w-2 h-2 rounded-full ${tone.dot}`} />
        </span>
        <p className="text-[15px] font-semibold tracking-[-0.016em] text-label truncate" aria-live="polite">
          {status.title}
        </p>
      </div>
      <p className="text-[13px] text-label-2 tracking-[-0.006em] mt-0.5 leading-snug">{status.subtitle}</p>
    </div>
  );

  const muteToggle = onToggleMute && (
    <button
      type="button"
      onClick={onToggleMute}
      title={isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
      aria-label={isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
      aria-pressed={isMuted}
      className={`pressable h-8 px-3.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-medium cursor-pointer select-none shrink-0 ${
        isMuted ? 'bg-sys-red/12 text-sys-red hover:bg-sys-red/18' : 'btn-gray'
      }`}
    >
      {isMuted ? <MicOff className="w-3.5 h-3.5" strokeWidth={2.25} /> : <Mic className="w-3.5 h-3.5 text-label-2" strokeWidth={2.25} />}
      <span>{isMuted ? 'Mikrofon Kapalı' : 'Mikrofon Açık'}</span>
    </button>
  );

  if (compact) {
    return (
      <div className="w-full flex items-center justify-center gap-6 pt-5 pb-4 select-none">
        {button}
        <div className="flex flex-col gap-1 min-w-[220px] max-w-[340px]">{statusText}</div>
        {muteToggle}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full select-none pt-5 pb-1">
      {button}
      <div className="mt-4 min-h-[40px] flex flex-col justify-center">{statusText}</div>
      {muteToggle && <div className="mt-2">{muteToggle}</div>}
    </div>
  );
};

import type { FC } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import type { SessionState } from '../types/interpreter';

interface InterpreterButtonProps {
  state: SessionState;
  onToggle: () => void;
  targetLanguageName?: string;
  audioLevel?: number;
  isMuted?: boolean;
  onToggleMute?: () => void;
  /** Horizontal layout used on wide screens to leave room for the dual panes. */
  compact?: boolean;
}

type Tone = 'idle' | 'muted' | 'connecting' | 'listening' | 'interpreting' | 'speaking' | 'error';

// Text color, solid background and soft glow per state tone
const TONE: Record<Tone, { text: string; dot: string; glow: string }> = {
  idle: { text: 'text-label-2', dot: 'bg-sys-green', glow: 'bg-accent' },
  muted: { text: 'text-sys-red', dot: 'bg-sys-red', glow: 'bg-sys-red' },
  connecting: { text: 'text-sys-orange', dot: 'bg-sys-orange', glow: 'bg-sys-orange' },
  listening: { text: 'text-sys-green', dot: 'bg-sys-green', glow: 'bg-sys-green' },
  interpreting: { text: 'text-sys-orange', dot: 'bg-sys-orange', glow: 'bg-sys-orange' },
  speaking: { text: 'text-accent', dot: 'bg-accent', glow: 'bg-accent' },
  error: { text: 'text-sys-red', dot: 'bg-sys-red', glow: 'bg-sys-red' },
};

// Symmetrical waveform (Apple Voice Memos style)
const SOUND_BARS = [0.3, 0.5, 0.75, 0.95, 1, 0.95, 0.75, 0.5, 0.3];

export const InterpreterButton: FC<InterpreterButtonProps> = ({
  state,
  onToggle,
  targetLanguageName,
  audioLevel = 0,
  isMuted = false,
  onToggleMute,
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

  const sizeClass = compact ? 'w-[76px] h-[76px]' : 'w-[84px] h-[84px] sm:w-[100px] sm:h-[100px]';

  const button = (
    <div className="relative flex items-center justify-center shrink-0">
      {/* Ambient glow that follows the voice level */}
      {isActive && (
        <span
          aria-hidden="true"
          style={{ transform: `scale(${1.05 + normLevel * 0.35})`, opacity: 0.18 + normLevel * 0.3 }}
          className={`absolute inset-0 rounded-full blur-2xl transition-transform duration-100 ease-out ${tone.glow}`}
        />
      )}

      {/* Calm ripples while the line is open */}
      {isLive && (
        <>
          <span aria-hidden="true" className={`absolute inset-0 rounded-full anim-ripple ${tone.glow}`} />
          <span
            aria-hidden="true"
            className={`absolute inset-0 rounded-full anim-ripple ${tone.glow}`}
            style={{ animationDelay: '1s' }}
          />
        </>
      )}

      {/* Idle invitation halo */}
      {!isActive && !isMuted && (
        <span aria-hidden="true" className="absolute -inset-2 rounded-full bg-accent/25 anim-breathe" />
      )}

      <button
        onClick={onToggle}
        type="button"
        aria-label={isActive ? 'Tercümanı Durdur' : 'Tercümanı Başlat'}
        title={isActive ? 'Tercümanı Durdur' : 'Tercümanı Başlat'}
        className={`relative z-10 ${sizeClass} rounded-full flex items-center justify-center cursor-pointer transition-[transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.94] ${
          isActive
            ? 'bg-surface shadow-[0_0_0_1px_var(--hairline),0_12px_32px_-10px_rgba(0,0,0,0.3)]'
            : isMuted
            ? 'bg-sys-gray text-white shadow-[0_12px_30px_-10px_rgba(0,0,0,0.35)]'
            : 'mic-hero text-white hover:brightness-[1.05]'
        }`}
      >
        {state === 'connecting' ? (
          <Loader2 className="w-8 h-8 animate-spin text-label-2" strokeWidth={2} />
        ) : isActive ? (
          // Stop glyph — a rounded red square, exactly like Voice Memos
          <span
            className={`block bg-sys-red transition-all duration-300 ${
              compact ? 'w-7 h-7 rounded-[8px]' : 'w-8 h-8 sm:w-9 sm:h-9 rounded-[9px]'
            }`}
          />
        ) : isMuted ? (
          <MicOff className={compact ? 'w-7 h-7' : 'w-8 h-8 sm:w-9 sm:h-9'} strokeWidth={2} />
        ) : (
          <Mic className={compact ? 'w-7 h-7' : 'w-8 h-8 sm:w-9 sm:h-9'} strokeWidth={2} />
        )}
      </button>
    </div>
  );

  const waveform = (
    <div
      aria-hidden="true"
      className={`h-6 flex items-center justify-center gap-[3px] transition-opacity duration-300 ${
        isLive ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {SOUND_BARS.map((mult, i) => {
        const h = isLive ? Math.min(22, Math.round(4 + mult * (normLevel * 16 + 2))) : 4;
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: static decorative bars
            key={i}
            style={{ height: `${h}px` }}
            className={`w-[3px] rounded-full transition-[height,background-color] duration-100 ease-out ${
              isLive ? tone.dot : 'bg-label-3'
            }`}
          />
        );
      })}
    </div>
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
        <div className="flex flex-col gap-1 min-w-[220px] max-w-[340px]">
          {statusText}
          <div className="flex justify-start">{waveform}</div>
        </div>
        {muteToggle}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full select-none pt-5 pb-1">
      {button}
      <div className="mt-2">{waveform}</div>
      <div className="min-h-[40px] flex flex-col justify-center">{statusText}</div>
      {muteToggle && <div className="mt-2">{muteToggle}</div>}
    </div>
  );
};

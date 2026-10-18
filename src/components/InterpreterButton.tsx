import type { FC } from 'react';
import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react';
import type { SessionState } from '../types/interpreter';

interface InterpreterButtonProps {
  state: SessionState;
  onToggle: () => void;
  targetLanguageName?: string;
  audioLevel?: number;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

export const InterpreterButton: FC<InterpreterButtonProps> = ({
  state,
  onToggle,
  targetLanguageName,
  audioLevel = 0,
  isMuted = false,
  onToggleMute,
}) => {
  const isActive = state !== 'idle' && state !== 'error';
  const normLevel = Math.min(1, Math.max(0, audioLevel));

  const getStatusConfig = () => {
    if (isMuted && isActive) {
      return {
        title: 'Mikrofon Kapalı (Sessizde)',
        subtitle: 'Sistem hiçbir şekilde ses algılamıyor. Konuşmak için mikrofonu açın.',
        dotColor: 'bg-rose-500 dark:bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse',
        textColor: 'text-rose-700 dark:text-rose-400 font-semibold',
      };
    }

    switch (state) {
      case 'connecting':
        return {
          title: 'Bağlanıyor...',
          subtitle: isMuted ? 'Canlı hat kuruluyor (Mikrofon Sessizde)' : 'Güvenli canlı ses hattı kuruluyor',
          dotColor: 'bg-amber-400 dark:bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
          textColor: 'text-amber-700 dark:text-amber-300',
        };
      case 'waiting_for_language':
        return {
          title: 'Hasta Dilini Belirtin',
          subtitle: 'Konuşarak veya yukarıdan seçebilirsiniz',
          dotColor: 'bg-teal-500 dark:bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]',
          textColor: 'text-teal-700 dark:text-teal-300',
        };
      case 'ready':
      case 'listening':
        return {
          title: audioLevel > 0.04 ? 'Sesiniz İletiliyor' : 'Sizi Dinliyor',
          subtitle: 'Konuşmanız bittiğinde otomatik çevrilir',
          dotColor: 'bg-emerald-500 dark:bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]',
          textColor: 'text-emerald-700 dark:text-emerald-300 font-semibold',
        };
      case 'interpreting':
        return {
          title: 'Çevriliyor...',
          subtitle: 'Cümle çevriliyor',
          dotColor: 'bg-amber-500 dark:bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]',
          textColor: 'text-amber-800 dark:text-amber-300 font-semibold',
        };
      case 'speaking':
        return {
          title: 'Tercüme Seslendiriliyor',
          subtitle: `${targetLanguageName || 'Karşı taraf'} için okunuyor`,
          dotColor: 'bg-teal-500 dark:bg-teal-400 animate-ping shadow-[0_0_10px_rgba(45,212,191,0.9)]',
          textColor: 'text-teal-700 dark:text-teal-300 font-semibold',
        };
      case 'error':
        return {
          title: 'Yeniden Başlat',
          subtitle: 'Bağlantı için butona dokunun',
          dotColor: 'bg-rose-500 dark:bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.7)]',
          textColor: 'text-rose-600 dark:text-rose-400 font-semibold',
        };
      default:
        return {
          title: isMuted ? 'Sessiz Modda Başlat' : 'Tercümanı Başlat',
          subtitle: isMuted
            ? 'Mikrofon kapalı; sistem hiçbir ses algılamayacak'
            : 'Dokunup Türkçe veya hasta dilinde konuşun',
          dotColor: isMuted ? 'bg-rose-400' : 'bg-emerald-500',
          textColor: isMuted
            ? 'text-rose-700 dark:text-rose-400 font-semibold'
            : 'text-slate-700 dark:text-slate-200 font-semibold',
        };
    }
  };

  const status = getStatusConfig();

  // Symmetrical 9-bar sound wave (Apple Voice Memos style)
  const soundBars = [
    { id: 'sb-0', multiplier: 0.25 },
    { id: 'sb-1', multiplier: 0.45 },
    { id: 'sb-2', multiplier: 0.7 },
    { id: 'sb-3', multiplier: 0.95 },
    { id: 'sb-4', multiplier: 1.0 },
    { id: 'sb-5', multiplier: 0.95 },
    { id: 'sb-6', multiplier: 0.7 },
    { id: 'sb-7', multiplier: 0.45 },
    { id: 'sb-8', multiplier: 0.25 },
  ];

  return (
    <div className="flex flex-col items-center justify-center w-full select-none py-0.5">
      {/* Central Action Button with Dynamic Halo */}
      <div className="relative flex items-center justify-center p-2">
        {/* Soft Ambient Dynamic Aura for both Light and Dark mode */}
        {isActive && (
          <div
            style={{
              transform: `scale(${1 + normLevel * 0.15})`,
              opacity: 0.35 + normLevel * 0.35,
            }}
            className={`absolute -inset-2 sm:-inset-4 rounded-full blur-xl transition-transform duration-100 ease-out pointer-events-none ${
              state === 'speaking'
                ? 'bg-teal-500/40 dark:bg-cyan-500/35'
                : state === 'interpreting'
                ? 'bg-amber-400/40 dark:bg-amber-500/35'
                : 'bg-emerald-500/40 dark:bg-emerald-400/35'
            }`}
          />
        )}

        {/* Dynamic Concentric Soundwave Rings */}
        {isActive && (
          <>
            <div
              style={{
                transform: `scale(${1 + normLevel * 0.12})`,
                opacity: 0.4 + normLevel * 0.4,
              }}
              className="absolute -inset-2 sm:-inset-3 rounded-full border border-emerald-500/40 dark:border-emerald-400/50 transition-transform duration-75 ease-out pointer-events-none"
            />
            <div
              style={{
                transform: `scale(${1 + normLevel * 0.06})`,
                opacity: 0.55 + normLevel * 0.3,
              }}
              className="absolute -inset-1 sm:-inset-1.5 rounded-full border border-emerald-400/60 dark:border-emerald-300/60 transition-transform duration-75 ease-out pointer-events-none"
            />
          </>
        )}

        {/* Tactile Push Button in Apple Liquid Glass Lens Style */}
        <button
          onClick={onToggle}
          type="button"
          aria-label={isActive ? 'Tercümanı Durdur' : 'Tercümanı Başlat'}
          className={`relative z-10 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 ease-out transform active:scale-[0.93] focus:outline-none cursor-pointer overflow-hidden ${
            isActive
              ? 'bg-gradient-to-b from-rose-500 via-rose-600 to-rose-700 text-white shadow-[0_14px_36px_-4px_rgba(244,63,94,0.5),inset_0_2px_2px_rgba(255,255,255,0.65),inset_0_-2px_4px_rgba(0,0,0,0.3)] ring-1 ring-white/40'
              : 'bg-gradient-to-b from-emerald-500 via-teal-500 to-teal-600 text-white shadow-[0_16px_38px_-4px_rgba(16,185,129,0.45),inset_0_2px_2px_rgba(255,255,255,0.65),inset_0_-2px_4px_rgba(0,0,0,0.22)] ring-1 ring-white/40 hover:brightness-105'
          }`}
        >
          {/* Top Liquid Glass Lens Refraction Dome */}
          <span className="absolute inset-0 rounded-full bg-gradient-to-b from-white/35 via-transparent to-black/15 pointer-events-none" />

          {state === 'connecting' ? (
            <Loader2 className="w-8 h-8 animate-spin text-white drop-shadow-md relative z-10" />
          ) : state === 'speaking' ? (
            <div className="flex flex-col items-center animate-in zoom-in-95 duration-200 relative z-10">
              <Volume2 className="w-7 h-7 sm:w-8 sm:h-8 animate-bounce text-white drop-shadow-md mb-1" />
              <span className="text-[10px] font-bold tracking-wider uppercase text-white drop-shadow-sm">
                Konuşuyor
              </span>
            </div>
          ) : isActive ? (
            <div className="flex flex-col items-center animate-in zoom-in-95 duration-200 relative z-10">
              <MicOff className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-md mb-1" />
              <span className="text-[10px] font-bold tracking-wider uppercase text-white drop-shadow-sm">
                Durdur
              </span>
            </div>
          ) : isMuted ? (
            <div className="flex flex-col items-center animate-in zoom-in-95 duration-200 relative z-10">
              <MicOff className="w-8 h-8 sm:w-9 sm:h-9 text-white drop-shadow-md mb-1" />
              <span className="text-[10px] font-bold tracking-wider uppercase text-white drop-shadow-sm">
                Başlat (Sessiz)
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center animate-in zoom-in-95 duration-200 relative z-10">
              <Mic className="w-8 h-8 sm:w-9 sm:h-9 text-white drop-shadow-md mb-1" />
              <span className="text-[10px] font-bold tracking-wider uppercase text-white drop-shadow-sm">
                Başlat
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Voice Waveform Equalizer Pod (Apple Liquid Glass Pill) */}
      <div className="w-full h-8 flex items-center justify-center my-1 shrink-0 overflow-hidden">
        {isActive ? (
          isMuted ? (
            <div className="h-7 sm:h-7.5 flex items-center gap-1.5 px-3.5 rounded-full liquid-glass-rose text-white text-[11px] font-semibold animate-in fade-in duration-150 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
              <span>Mikrofon Sessizde</span>
            </div>
          ) : (
            <div className="h-7 sm:h-7.5 flex items-center gap-1.5 px-4 rounded-full liquid-glass-pill shadow-xs animate-in fade-in duration-150">
              {soundBars.map((bar) => {
                const baseHeight = 3;
                const dynamicHeight = Math.min(18, Math.round(baseHeight + bar.multiplier * (normLevel * 14 + 1)));
                return (
                  <span
                    key={bar.id}
                    style={{
                      height: `${dynamicHeight}px`,
                      transform: state === 'speaking' ? 'scaleY(1.15)' : undefined,
                    }}
                    className={`w-1 rounded-full transition-all duration-75 ease-out shadow-2xs ${
                      state === 'speaking'
                        ? 'bg-teal-500 dark:bg-cyan-400'
                        : state === 'interpreting'
                        ? 'bg-amber-500 dark:bg-amber-400'
                        : 'bg-emerald-500 dark:bg-emerald-400'
                    }`}
                  />
                );
              })}
            </div>
          )
        ) : (
          /* Resting Liquid Glass Pill Placeholder */
          <div className="h-7 flex items-center gap-1.5 px-3 rounded-full opacity-40">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
          </div>
        )}
      </div>

      {/* Minimalist Liquid Glass Status Indicator */}
      <div className="text-center px-4 max-w-sm mt-0.5 min-h-[36px] flex flex-col justify-center shrink-0">
        <div className="inline-flex items-center justify-center gap-1.5 mb-0.5">
          <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
          <p className={`text-xs font-semibold tracking-tight ${status.textColor}`}>
            {status.title}
          </p>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-tight">
          {status.subtitle}
        </p>
      </div>

      {/* Tactile Liquid Glass Microphone Toggle */}
      {onToggleMute && (
        <div className="mt-1.5 sm:mt-2 flex items-center justify-center">
          <button
            type="button"
            onClick={onToggleMute}
            title={isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
            aria-label={isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold select-none cursor-pointer transition-all duration-200 active:scale-95 ${
              isMuted
                ? 'liquid-glass-rose text-white shadow-sm'
                : 'liquid-glass-pill text-slate-800 dark:text-slate-100 hover:brightness-105'
            }`}
          >
            {isMuted ? (
              <>
                <MicOff className="w-3.5 h-3.5 text-white" />
                <span>Mikrofon Kapalı</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Mikrofon Açık</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

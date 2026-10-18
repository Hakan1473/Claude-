import type { FC, ReactNode } from 'react';
import { WifiOff, MicOff, AlertCircle, X } from 'lucide-react';

interface NoticeProps {
  onDismiss?: () => void;
}

/** Floating capsule toast anchored under the status bar. */
const Toast: FC<{ icon: ReactNode; tint: string; children: ReactNode; onDismiss?: () => void }> = ({
  icon,
  tint,
  children,
  onDismiss,
}) => (
  <div
    role="alert"
    className="anim-toast fixed left-1/2 z-[60] w-[calc(100%-24px)] max-w-md"
    style={{ top: 'calc(env(safe-area-inset-top, 0px) + 10px)', transform: 'translateX(-50%)' }}
  >
    <div className="flex items-center gap-3 pl-3 pr-2 py-2 rounded-[18px] bg-elevated/90 backdrop-blur-xl shadow-float">
      <span className={`glyph w-8 h-8 rounded-full ${tint}`}>{icon}</span>
      <p className="flex-1 text-[13px] leading-snug font-medium text-label">{children}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Kapat"
          className="pressable w-7 h-7 rounded-full bg-fill text-label-2 flex items-center justify-center shrink-0 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>
      )}
    </div>
  </div>
);

export const OfflineNotice: FC<NoticeProps> = () => {
  return (
    <Toast tint="bg-sys-orange" icon={<WifiOff className="w-4 h-4" strokeWidth={2.25} />}>
      İnternet bağlantısı gerekli.
    </Toast>
  );
};

export const PermissionNotice: FC<NoticeProps> = ({ onDismiss }) => {
  return (
    <Toast tint="bg-sys-red" icon={<MicOff className="w-4 h-4" strokeWidth={2.25} />} onDismiss={onDismiss}>
      Sesli tercüman için mikrofon izni gerekiyor. Lütfen tarayıcı ayarlarından mikrofon iznini etkinleştirin.
    </Toast>
  );
};

export const ErrorNotice: FC<{ message: string; onDismiss?: () => void }> = ({ message, onDismiss }) => {
  return (
    <Toast tint="bg-sys-red" icon={<AlertCircle className="w-4 h-4" strokeWidth={2.25} />} onDismiss={onDismiss}>
      {message}
    </Toast>
  );
};

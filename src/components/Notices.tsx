import type { FC } from 'react';
import { WifiOff, MicOff, AlertCircle } from 'lucide-react';

interface NoticeProps {
  onDismiss?: () => void;
}

export const OfflineNotice: FC<NoticeProps> = () => {
  return (
    <div className="bg-amber-500 dark:bg-amber-600 text-white text-xs font-semibold py-2 px-4 flex items-center justify-center gap-2 shadow-sm animate-in slide-in-from-top duration-300">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>İnternet bağlantısı gerekli.</span>
    </div>
  );
};

export const PermissionNotice: FC<NoticeProps> = ({ onDismiss }) => {
  return (
    <div className="bg-rose-600 dark:bg-rose-700 text-white text-xs font-semibold py-2.5 px-4 flex items-center justify-between gap-2 shadow-sm animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2">
        <MicOff className="w-4 h-4 shrink-0" />
        <span>Sesli tercüman için mikrofon izni gerekiyor. Lütfen tarayıcı ayarlarından mikrofon iznini etkinleştirin.</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-white/80 hover:text-white text-xs underline uppercase ml-2 shrink-0 cursor-pointer"
        >
          Kapat
        </button>
      )}
    </div>
  );
};

export const ErrorNotice: FC<{ message: string; onDismiss?: () => void }> = ({
  message,
  onDismiss,
}) => {
  return (
    <div className="bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold py-2.5 px-4 flex items-center justify-between gap-2 shadow-sm border-b border-slate-700/50">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
        <span>{message}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-white/80 hover:text-white text-xs underline ml-2 shrink-0 cursor-pointer"
        >
          Kapat
        </button>
      )}
    </div>
  );
};


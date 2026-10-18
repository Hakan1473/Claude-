import { useEffect, type FC, type ReactNode, type CSSProperties } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Element rendered before the title (e.g. a back button). */
  leading?: ReactNode;
  /** Actions rendered before the close button. */
  trailing?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** Tailwind max-width class for the panel on tablet/desktop. */
  widthClass?: string;
  /** Fixed panel height (used by list-heavy sheets so they don't jump while filtering). */
  fixedHeight?: boolean;
  /** Extra inline styles for the overlay (e.g. visual viewport height). */
  overlayStyle?: CSSProperties;
  panelStyle?: CSSProperties;
  bodyClassName?: string;
  labelledBy?: string;
}

/**
 * Apple-style modal sheet: slides up from the bottom on phones,
 * floats as a centered card on tablets and desktops.
 */
export const Sheet: FC<SheetProps> = ({
  onClose,
  title,
  subtitle,
  leading,
  trailing,
  footer,
  children,
  widthClass = 'sm:max-w-lg',
  fixedHeight = false,
  overlayStyle,
  panelStyle,
  bodyClassName = 'px-4 sm:px-6 py-4 sm:py-5',
  labelledBy,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6"
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-[2px] anim-fade cursor-default"
      />

      <div
        style={panelStyle}
        className={`sheet relative w-full ${widthClass} flex flex-col overflow-hidden rounded-t-[20px] sm:rounded-[22px] shadow-float pb-safe sm:pb-0 ${
          fixedHeight ? 'h-[94dvh] sm:h-[82vh] sm:max-h-[820px]' : 'max-h-[94dvh] sm:max-h-[86vh]'
        }`}
      >
        {/* Grabber */}
        <div className="sm:hidden pt-1.5 pb-0.5 flex justify-center shrink-0">
          <span className="w-9 h-[5px] rounded-full bg-label-3/50" />
        </div>

        {/* Navigation bar */}
        <div className="flex items-center gap-3 px-4 sm:px-6 pt-2 sm:pt-5 pb-3 shrink-0">
          {leading}
          <div className="min-w-0 flex-1">
            <h2 id={labelledBy} className="text-[17px] sm:text-[19px] font-semibold tracking-[-0.022em] text-label truncate">
              {title}
            </h2>
            {subtitle && <div className="text-[13px] text-label-2 truncate mt-0.5">{subtitle}</div>}
          </div>
          {trailing}
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            title="Kapat"
            className="pressable w-[30px] h-[30px] rounded-full bg-fill text-label-2 hover:text-label flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className={`modal-body flex-1 min-h-0 overflow-y-auto overscroll-contain ${bodyClassName}`}>{children}</div>

        {footer && <div className="hairline-t px-4 sm:px-6 py-3 shrink-0 flex items-center gap-2">{footer}</div>}
      </div>
    </div>
  );
};

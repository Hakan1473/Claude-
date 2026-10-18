import { useState, useEffect, useRef, type FC } from 'react';
import { Search, X, Check, Keyboard } from 'lucide-react';
import { POPULAR_LANGUAGES } from '../services/languageCatalog';
import type { LanguageOption } from '../types/interpreter';
import { CountryFlag } from './CountryFlag';
import { Sheet } from './ui/Sheet';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: LanguageOption | null;
  onSelect: (lang: LanguageOption) => void;
}

export const LanguageSelectorModal: FC<LanguageSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedLanguage,
  onSelect,
}) => {
  const [search, setSearch] = useState('');
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dynamic Visual Viewport tracking for mobile keyboards (iOS Safari & Android Chrome)
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setIsInputFocused(false);
      return;
    }

    const handleResize = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      } else {
        setViewportHeight(window.innerHeight);
      }
    };

    handleResize();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = POPULAR_LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(search.toLowerCase()) ||
      lang.nameTr.toLowerCase().includes(search.toLowerCase()) ||
      lang.country.toLowerCase().includes(search.toLowerCase())
  );

  const handleDismissKeyboard = () => {
    inputRef.current?.blur();
    setIsInputFocused(false);
  };

  const handleLanguagePick = (lang: LanguageOption) => {
    handleDismissKeyboard();
    onSelect(lang);
    onClose();
  };

  const modalMaxHeight = viewportHeight ? `${Math.floor(viewportHeight * 0.96)}px` : undefined;

  return (
    <Sheet
      onClose={onClose}
      title="Hasta Dili"
      subtitle={`${filtered.length} dil · Arayın veya dokunun`}
      widthClass="sm:max-w-md"
      fixedHeight
      bodyClassName="px-4 sm:px-5 pb-4"
      overlayStyle={{ height: viewportHeight ? `${viewportHeight}px` : '100dvh' }}
      panelStyle={{
        maxHeight: modalMaxHeight,
        height: viewportHeight && isInputFocused ? `${viewportHeight}px` : undefined,
      }}
      trailing={
        isInputFocused ? (
          <button
            type="button"
            onClick={handleDismissKeyboard}
            className="pressable btn-tinted h-[30px] px-3 rounded-full inline-flex items-center gap-1.5 text-[13px] font-medium cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5" strokeWidth={2.25} />
            <span>Bitti</span>
          </button>
        ) : undefined
      }
    >
      {/* Search */}
      <div className="sheet-sticky sticky top-0 z-10 pb-3">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-label-2 pointer-events-none" strokeWidth={2.25} />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="done"
            placeholder="Ülke veya dil ara"
            value={search}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleDismissKeyboard();
              }
            }}
            className="field w-full h-10 pl-9 pr-9 text-[16px] sm:text-[15px]"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                inputRef.current?.focus();
              }}
              className="absolute right-2.5 w-5 h-5 rounded-full bg-label-3 text-bg flex items-center justify-center cursor-pointer"
              aria-label="Aramayı temizle"
            >
              <X className="w-3 h-3" strokeWidth={3} />
            </button>
          )}
        </div>
      </div>

      {/* Language list */}
      <div
        onTouchMove={() => {
          if (isInputFocused) handleDismissKeyboard();
        }}
      >
        {filtered.length > 0 ? (
          <div className="group-list">
            {filtered.map((lang) => {
              const isSelected = selectedLanguage?.code === lang.code;

              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLanguagePick(lang)}
                  aria-pressed={isSelected}
                  className="w-full flex items-center gap-3 pl-4 pr-4 py-2.5 text-left cursor-pointer transition-colors hover:bg-fill-2 active:bg-fill"
                >
                  <CountryFlag flag={lang.flag} code={lang.code} country={lang.country} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[16px] tracking-[-0.016em] text-label truncate">{lang.nameTr}</div>
                    <div className="text-[13px] text-label-2 truncate">
                      {lang.name} · {lang.country}
                    </div>
                  </div>
                  {isSelected && <Check className="w-5 h-5 text-accent shrink-0" strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-12 px-4 text-center">
            <p className="text-[17px] font-semibold text-label mb-1">Sonuç Yok</p>
            <p className="text-[14px] text-label-2 max-w-xs mx-auto">
              Mikrofon butonuna basarak dilediğiniz dili sesli olarak da belirtebilirsiniz.
            </p>
          </div>
        )}
      </div>
    </Sheet>
  );
};

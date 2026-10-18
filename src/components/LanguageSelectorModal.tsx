import { useState, useEffect, useRef, type FC } from 'react';
import { Search, X, Check, Keyboard, ArrowLeft } from 'lucide-react';
import { POPULAR_LANGUAGES } from '../services/languageCatalog';
import type { LanguageOption } from '../types/interpreter';
import { CountryFlag } from './CountryFlag';

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

  const modalMaxHeight = viewportHeight ? `${Math.floor(viewportHeight * 0.96)}px` : '90vh';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200"
      style={{
        height: viewportHeight ? `${viewportHeight}px` : '100dvh',
      }}
    >
      <div
        style={{
          maxHeight: modalMaxHeight,
          height: viewportHeight && isInputFocused ? `${viewportHeight}px` : undefined,
        }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-b-[24px] sm:rounded-[28px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800 shadow-2xl"
      >
        {/* Mobile grab indicator */}
        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg active:bg-slate-100 dark:active:bg-slate-800"
              aria-label="Geri"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Hedef Hasta Dili
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {filtered.length} dil listeleniyor · Arayın veya dokunun
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isInputFocused && (
              <button
                type="button"
                onClick={handleDismissKeyboard}
                className="px-2.5 py-1 text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-teal-700 dark:text-teal-300 rounded-lg transition-colors flex items-center gap-1 active:scale-95"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Kapat</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 rounded-full transition-all active:scale-95 cursor-pointer"
              aria-label="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inset Search Bar */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              inputMode="search"
              enterKeyHint="done"
              placeholder="Ülke veya dil ara (Örn: İspanya, İtalya, Çin)..."
              value={search}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleDismissKeyboard();
                }
              }}
              className="w-full pl-9 pr-9 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  inputRef.current?.focus();
                }}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
                aria-label="Aramayı temizle"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Language List */}
        <div
          onTouchMove={() => {
            if (isInputFocused) handleDismissKeyboard();
          }}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 space-y-1 divide-y divide-slate-100 dark:divide-slate-800"
        >
          {filtered.map((lang) => {
            const isSelected = selectedLanguage?.code === lang.code;

            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguagePick(lang)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-150 cursor-pointer active:scale-[0.99] ${
                  isSelected
                    ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-950 dark:text-teal-200 font-medium border border-teal-300 dark:border-teal-700 shadow-xs'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CountryFlag flag={lang.flag} code={lang.code} country={lang.country} size="lg" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate text-slate-900 dark:text-slate-100 tracking-tight">
                      {lang.nameTr}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-400 truncate">
                      {lang.name} · {lang.country}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <span className="shrink-0 ml-2 w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-8 px-4 text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Eşleşen dil bulunamadı</p>
              <p className="text-xs text-slate-400 dark:text-slate-400">
                Mikrofon butonuna basarak sesli olarak da dilediğiniz dili belirtebilirsiniz.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

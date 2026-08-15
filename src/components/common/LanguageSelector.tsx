import React, { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocale, useTranslation } from "../../context/LocaleContext";
import type { LocaleCode } from "../../i18n/types";

interface LanguageSelectorProps {
  compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ compact = false }) => {
  const {
    locale,
    setLocale,
    languageMode,
    setLanguageMode,
    t,
    suggestedLocale,
    localeOptions,
  } = useTranslation();

  const { suggestFromFarmLocation } = useLocale();
  const { activeFarm } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const current = localeOptions.find((o) => o.code === locale);

  const handleSelect = (code: LocaleCode) => {
    setLocale(code);
    setOpen(false);
  };

  const handleAutoSelect = () => {
    setLanguageMode("auto");
    suggestFromFarmLocation(activeFarm.location);
    setOpen(false);
  };

  return (
    <div className={`language-selector ${compact ? "compact" : ""}`} ref={ref}>
      <button
        type="button"
        className="language-selector-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("nav.language")}
        aria-expanded={open}
      >
        <Globe size={16} />
        <span className="language-selector-label">{current?.nativeLabel ?? t("language.english")}</span>
        {!compact && <ChevronDown size={14} className={`lang-chevron ${open ? "open" : ""}`} />}
      </button>

      {open && (
        <div className="language-selector-menu" role="listbox">
          <button
            type="button"
            role="option"
            aria-selected={languageMode === "auto"}
            className={`language-option ${languageMode === "auto" ? "active" : ""}`}
            onClick={handleAutoSelect}
          >
            <span className="language-native">
              {t("language.auto")}
            </span>

            {languageMode === "auto" && suggestedLocale && (
              <span className="language-english">
                {localeOptions.find((o) => o.code === suggestedLocale)?.nativeLabel}
              </span>
            )}

            {languageMode === "auto" && (
              <Check size={14} className="language-check" />
            )}
          </button>
          {suggestedLocale && suggestedLocale !== locale && (
            <div className="language-suggestion-banner">
              {t("language.suggested")}:{" "}
              <button
                type="button"
                className="language-suggestion-link"
                onClick={() => handleSelect(suggestedLocale)}
              >
                {localeOptions.find((o) => o.code === suggestedLocale)?.nativeLabel}
              </button>
            </div>
          )}
          {localeOptions.map((option) => (
            <button
              key={option.code}
              type="button"
              role="option"
              aria-selected={locale === option.code}
              className={`language-option ${locale === option.code ? "active" : ""}`}
              onClick={() => handleSelect(option.code)}
            >
              <span className="language-native">{option.nativeLabel}</span>
              {option.code !== option.nativeLabel.toLowerCase() && (
                <span className="language-english">{option.label}</span>
              )}
              {locale === option.code && <Check size={14} className="language-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

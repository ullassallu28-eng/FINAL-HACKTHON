export type LocaleCode = "en" | "hi" | "kn" | "ml" | "ta" | "te";

export interface LocaleOption {
  code: LocaleCode;
  label: string;
  nativeLabel: string;
}

export const LOCALE_OPTIONS: LocaleOption[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
  { code: "ml", label: "Malayalam", nativeLabel: "മലയാളം" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు" },
];

export type TranslationDictionary = Record<string, string>;

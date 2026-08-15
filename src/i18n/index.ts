import type { LocaleCode, TranslationDictionary } from "./types";
import en from "./locales/en";

export type { LocaleCode } from "./types";

export const STORAGE_KEY = "agrisentinel_locale";

const LOCALE_CODES: LocaleCode[] = ["en", "hi", "kn", "ml", "ta", "te"];

const localeLoaders: Record<
  Exclude<LocaleCode, "en">,
  () => Promise<{ default: TranslationDictionary }>
> = {
  hi: () => import("./locales/hi"),
  kn: () => import("./locales/kn"),
  ml: () => import("./locales/ml"),
  ta: () => import("./locales/ta"),
  te: () => import("./locales/te"),
};

const loadedDictionaries: Partial<Record<LocaleCode, TranslationDictionary>> = {
  en,
};

const loadingPromises = new Map<LocaleCode, Promise<TranslationDictionary>>();

export function isLocaleCode(value: string): value is LocaleCode {
  return LOCALE_CODES.includes(value as LocaleCode);
}

export async function loadLocale(locale: LocaleCode): Promise<TranslationDictionary> {
  if (loadedDictionaries[locale]) {
    return loadedDictionaries[locale]!;
  }

  const pending = loadingPromises.get(locale);
  if (pending) return pending;

  const promise =
    locale === "en"
      ? Promise.resolve(en)
      : localeLoaders[locale]().then((mod) => {
          loadedDictionaries[locale] = mod.default;
          return mod.default;
        });

  loadingPromises.set(locale, promise);
  try {
    return await promise;
  } finally {
    loadingPromises.delete(locale);
  }
}

export function getDictionary(locale: LocaleCode): TranslationDictionary {
  return loadedDictionaries[locale] ?? en;
}

export function translate(
  locale: LocaleCode,
  key: string,
  params?: Record<string, string | number>
): string {
  const dict = getDictionary(locale);
  let text = dict[key] ?? en[key] ?? key;

  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      text = text.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, "g"), String(paramValue));
    });
  }

  return text;
}

export function suggestLocaleFromLocation(location: string): LocaleCode | null {
  const loc = location.toLowerCase();
  if (loc.includes("karnataka") || loc.includes("bengaluru") || loc.includes("bangalore")) return "kn";
  if (loc.includes("kerala") || loc.includes("kochi") || loc.includes("thiruvananthapuram")) return "ml";
  if (loc.includes("tamil") || loc.includes("chennai") || loc.includes("coimbatore")) return "ta";
  if (loc.includes("andhra") || loc.includes("telangana") || loc.includes("hyderabad")) return "te";
  if (loc.includes("jharkhand") || loc.includes("ranchi") || loc.includes("bokaro")) return "hi";
  return null;
}

export { en };

import en from "./en";
import zhCN from "./zh-CN";

export const SUPPORTED_LOCALES = ["en", "zh-CN"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  "zh-CN": "简体中文"
};

export const DICTIONARIES = {
  en,
  "zh-CN": zhCN
} as const;

export type DictionaryKey = keyof typeof en;

export function detectDefaultLocale(): Locale {
  if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("zh")) {
    return "zh-CN";
  }
  return "en";
}

export function normalizeLocale(input: string | null | undefined): Locale {
  return input === "zh-CN" ? "zh-CN" : "en";
}

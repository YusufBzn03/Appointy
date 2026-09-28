import type { LocaleCode } from "./types";

export type LocaleMeta = {
  code: LocaleCode;
  nativeName: string;
  englishName: string;
  dir: "ltr" | "rtl";
};

export const locales: LocaleMeta[] = [
  { code: "de", nativeName: "Deutsch", englishName: "German", dir: "ltr" },
  { code: "en", nativeName: "English", englishName: "English", dir: "ltr" },
  { code: "tr", nativeName: "Türkçe", englishName: "Turkish", dir: "ltr" },
  { code: "ar", nativeName: "العربية", englishName: "Arabic", dir: "rtl" },
  { code: "fr", nativeName: "Français", englishName: "French", dir: "ltr" },
  { code: "sr", nativeName: "Srpski", englishName: "Serbian", dir: "ltr" },
  { code: "ru", nativeName: "Русский", englishName: "Russian", dir: "ltr" },
];

export const defaultLocale: LocaleCode = "de";

export function getLocaleMeta(code: LocaleCode): LocaleMeta {
  return locales.find((l) => l.code === code) ?? locales[0];
}

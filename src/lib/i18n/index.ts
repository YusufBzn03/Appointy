import type { Dictionary, LocaleCode } from "./types";
import de from "./dictionaries/de";
import en from "./dictionaries/en";
import tr from "./dictionaries/tr";
import ar from "./dictionaries/ar";
import fr from "./dictionaries/fr";
import sr from "./dictionaries/sr";
import ru from "./dictionaries/ru";

export const dictionaries: Record<LocaleCode, Dictionary> = { de, en, tr, ar, fr, sr, ru };

export type { Dictionary, LocaleCode };
export { locales, defaultLocale, getLocaleMeta } from "./locales";
export type { LocaleMeta } from "./locales";

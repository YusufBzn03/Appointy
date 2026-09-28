"use client";

import * as React from "react";
import { dictionaries, defaultLocale, getLocaleMeta, type LocaleCode, type Dictionary } from "@/lib/i18n";

const STORAGE_KEY = "appointy-locale";

type LocaleContextValue = {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  t: Dictionary;
  dir: "ltr" | "rtl";
};

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

const emptySubscribe = () => () => {};

function readStoredLocale(): LocaleCode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) as LocaleCode | null;
    if (stored && stored in dictionaries) return stored;
  } catch {
    // localStorage unavailable — fall through to default
  }
  return defaultLocale;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const persistedLocale = React.useSyncExternalStore(
    emptySubscribe,
    readStoredLocale,
    () => defaultLocale
  );
  const [overrideLocale, setOverrideLocale] = React.useState<LocaleCode | null>(null);
  const locale = overrideLocale ?? persistedLocale;

  const setLocale = React.useCallback((next: LocaleCode) => {
    setOverrideLocale(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore write failures (private browsing, etc.)
    }
  }, []);

  const meta = getLocaleMeta(locale);

  React.useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = meta.dir;
  }, [locale, meta.dir]);

  const value = React.useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: dictionaries[locale], dir: meta.dir }),
    [locale, setLocale, meta.dir]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = React.useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}

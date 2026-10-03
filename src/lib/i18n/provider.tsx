"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { dictionary, type Lang, type TranslationKey } from "./dictionary";

interface I18nValue {
  lang: Lang;
  dir: "ltr" | "rtl";
  locale: string;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

// initialLang comes from the "lang" cookie (read in the server layout) so SSR output has the right dir.
export function I18nProvider({ initialLang, children }: { initialLang: Lang; children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => {
    document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
    setLangState(l);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      dir,
      locale: lang === "ar" ? "ar-EG" : "en-US",
      setLang,
      t: (key) => dictionary[lang][key],
    }),
    [lang, dir, setLang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

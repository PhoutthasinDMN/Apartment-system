'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import en from './locales/en.json';
import lo from './locales/lo.json';

export type Language = 'lo' | 'en';
export type TranslationKey = keyof typeof lo;

interface I18nValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const dictionaries = { lo, en } as const;
const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'lo';
    const saved = window.localStorage.getItem('apartment-language');
    return saved === 'en' ? 'en' : 'lo';
  });

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    window.localStorage.setItem('apartment-language', next);
    document.documentElement.lang = next;
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ language, setLanguage, t: (key) => dictionaries[language][key] }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}

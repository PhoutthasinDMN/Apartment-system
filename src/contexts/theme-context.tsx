'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface ThemeValue { dark: boolean; toggleTheme: () => void; }
const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem('apartment-theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    window.localStorage.setItem('apartment-theme', dark ? 'dark' : 'light');
  }, [dark]);
  const value = useMemo(() => ({ dark, toggleTheme: () => setDark((current) => !current) }), [dark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}

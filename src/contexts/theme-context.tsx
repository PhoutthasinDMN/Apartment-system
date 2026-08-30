'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';

interface ThemeValue { dark: boolean; toggleTheme: () => void; }
const ThemeContext = createContext<ThemeValue | null>(null);
const themeListeners = new Set<() => void>();

function getThemeSnapshot() {
  return window.localStorage.getItem('apartment-theme') === 'dark';
}

function subscribeToTheme(listener: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === 'apartment-theme') listener();
  };
  themeListeners.add(listener);
  window.addEventListener('storage', handleStorage);
  return () => {
    themeListeners.delete(listener);
    window.removeEventListener('storage', handleStorage);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const dark = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const toggleTheme = useCallback(() => {
    window.localStorage.setItem('apartment-theme', dark ? 'light' : 'dark');
    themeListeners.forEach((listener) => listener());
  }, [dark]);

  const value = useMemo(() => ({ dark, toggleTheme }), [dark, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}

'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface ThemeValue { dark: boolean; toggleTheme: () => void; }
const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const toggleTheme = useCallback(() => setDark((current) => !current), []);

  const value = useMemo(() => ({ dark, toggleTheme }), [dark, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}

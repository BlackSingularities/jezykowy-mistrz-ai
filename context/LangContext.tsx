import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Lang = 'it' | 'pl';
export type Theme = 'light' | 'dark';

export interface LangContextValue {
  globalLang: Lang;
  toggleGlobal: () => void;
  syncKey: number;
}

// ─── LangContext ──────────────────────────────────────────────────────────────

const LangContext = createContext<LangContextValue>({
  globalLang: 'pl',
  toggleGlobal: () => {},
  syncKey: 0,
});

export const useLang = (): LangContextValue => useContext(LangContext);

// ─── ThemeContext ─────────────────────────────────────────────────────────────

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
});

export const useTheme = (): ThemeContextValue => useContext(ThemeContext);

// ─── Providers ────────────────────────────────────────────────────────────────

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('app_theme') as Theme | null;
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => (t === 'light' ? 'dark' : 'light'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const LangProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [globalLang, setGlobalLang] = useState<Lang>('pl');
  const [syncKey, setSyncKey] = useState(0);

  const toggleGlobal = useCallback(() => {
    setGlobalLang(l => (l === 'it' ? 'pl' : 'it'));
    setSyncKey(k => k + 1);
  }, []);

  return (
    <ThemeProvider>
      <LangContext.Provider value={{ globalLang, toggleGlobal, syncKey }}>
        {children}
      </LangContext.Provider>
    </ThemeProvider>
  );
};

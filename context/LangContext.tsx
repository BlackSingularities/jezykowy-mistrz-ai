import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { TargetLang } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Lang = 'it' | 'pl' | 'en' | 'fr' | 'es' | 'de' | 'cs' | 'ru';
export type Theme = 'light' | 'dark';

export interface LangContextValue {
  globalLang: Lang;
  toggleGlobal: () => void;
  syncKey: number;
  targetLang: TargetLang;
}

// ─── LangContext ──────────────────────────────────────────────────────────────

const LangContext = createContext<LangContextValue>({
  globalLang: 'pl',
  toggleGlobal: () => {},
  syncKey: 0,
  targetLang: 'it',
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

// ─── FontSizeContext ──────────────────────────────────────────────────────────

// Base HTML font-size values — Tailwind uses rem, so scaling html font-size
// scales ALL text including Tailwind utility classes (text-sm, text-xs, etc.)
const FONT_SIZES = [13, 15, 17, 19, 22] as const;
type FontSizeIndex = 0 | 1 | 2 | 3 | 4;

interface FontSizeContextValue {
  fontSizeIndex: FontSizeIndex;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
}

const FontSizeContext = createContext<FontSizeContextValue>({
  fontSizeIndex: 1,
  increaseFontSize: () => {},
  decreaseFontSize: () => {},
});

export const useFontSize = (): FontSizeContextValue => useContext(FontSizeContext);

// ─── Providers ────────────────────────────────────────────────────────────────

const FontSizeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [index, setIndex] = useState<FontSizeIndex>(() => {
    const saved = localStorage.getItem('app_fontsize');
    const n = saved ? parseInt(saved, 10) : 1;
    return (n >= 0 && n <= 4 ? n : 1) as FontSizeIndex;
  });

  useEffect(() => {
    const size = FONT_SIZES[index];
    // Set html font-size — all Tailwind rem-based utilities scale with it
    document.documentElement.style.fontSize = `${size}px`;
    // Also update CSS custom properties for elements that use them directly
    document.documentElement.style.setProperty('--font-base', `${size}px`);
    document.documentElement.style.setProperty('--font-sm', `${size - 2}px`);
    document.documentElement.style.setProperty('--font-xs', `${size - 4}px`);
    document.documentElement.style.setProperty('--font-label', `${Math.max(size - 5, 9)}px`);
    localStorage.setItem('app_fontsize', String(index));
  }, [index]);

  const increaseFontSize = useCallback(() => {
    setIndex(i => (i < 4 ? (i + 1) as FontSizeIndex : i));
  }, []);

  const decreaseFontSize = useCallback(() => {
    setIndex(i => (i > 0 ? (i - 1) as FontSizeIndex : i));
  }, []);

  return (
    <FontSizeContext.Provider value={{ fontSizeIndex: index, increaseFontSize, decreaseFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
};

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

export const LangProvider: React.FC<{ children: React.ReactNode; targetLang: TargetLang }> = ({ children, targetLang }) => {
  const [globalLang, setGlobalLang] = useState<Lang>('pl');
  const [syncKey, setSyncKey] = useState(0);

  const toggleGlobal = useCallback(() => {
    setGlobalLang(l => (l === targetLang ? 'pl' : targetLang));
    setSyncKey(k => k + 1);
  }, [targetLang]);

  return (
    <ThemeProvider>
      <FontSizeProvider>
        <LangContext.Provider value={{ globalLang, toggleGlobal, syncKey, targetLang }}>
          {children}
        </LangContext.Provider>
      </FontSizeProvider>
    </ThemeProvider>
  );
};

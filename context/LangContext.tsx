import React, { createContext, useContext, useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Lang = 'it' | 'pl';

export interface LangContextValue {
  /** The language all BilingualBlocks follow by default. */
  globalLang: Lang;
  /** Toggle all blocks simultaneously and sync any desynced blocks. */
  toggleGlobal: () => void;
  /**
   * Monotonically-increasing counter.
   * BilingualBlock children watch this via useEffect to snap back to globalLang
   * whenever a global toggle fires — even if the block was individually overridden.
   */
  syncKey: number;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const LangContext = createContext<LangContextValue>({
  globalLang: 'pl',
  toggleGlobal: () => {},
  syncKey: 0,
});

export const useLang = (): LangContextValue => useContext(LangContext);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const LangProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [globalLang, setGlobalLang] = useState<Lang>('pl');
  const [syncKey, setSyncKey] = useState(0);

  const toggleGlobal = useCallback(() => {
    setGlobalLang(l => (l === 'it' ? 'pl' : 'it'));
    setSyncKey(k => k + 1);
  }, []);

  return (
    <LangContext.Provider value={{ globalLang, toggleGlobal, syncKey }}>
      {children}
    </LangContext.Provider>
  );
};

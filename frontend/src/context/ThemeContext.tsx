import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from '@/lib/storage';

const THEME_KEY = 'floa_theme';

interface Palette {
  isDark: boolean;
  screen: string;
  card: string;
  input: string;
  border: string;
  modal: string;
  active: string;
  text: string;
  muted: string;
  subtle: string;
  hex: {
    screen: string;
    card: string;
    input: string;
    border: string;
    text: string;
    muted: string;
    primary: string;
  };
}

const dark: Palette = {
  isDark: true,
  screen: 'bg-ink-bg',
  card: 'bg-ink-card',
  input: 'bg-ink-input',
  border: 'border-ink-border',
  modal: 'bg-ink-modal',
  active: 'bg-ink-active',
  text: 'text-white',
  muted: 'text-gray-400',
  subtle: 'text-gray-500',
  hex: {
    screen: '#131316',
    card: '#1b1b1f',
    input: '#232329',
    border: '#33343c',
    text: '#ffffff',
    muted: '#9ca3af',
    primary: '#f87203',
  },
};

const light: Palette = {
  isDark: false,
  screen: 'bg-paper-bg',
  card: 'bg-paper-card',
  input: 'bg-paper-bg',
  border: 'border-paper-border',
  modal: 'bg-paper-card',
  active: 'bg-paper-bg',
  text: 'text-[#1d1d1f]',
  muted: 'text-gray-500',
  subtle: 'text-gray-400',
  hex: {
    screen: '#f5f5f7',
    card: '#ffffff',
    input: '#f5f5f7',
    border: '#e5e5e5',
    text: '#1d1d1f',
    muted: '#6b7280',
    primary: '#032347',
  },
};

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  t: Palette;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    storage.get(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') setPreferenceState(saved);
    });
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    storage.set(THEME_KEY, pref);
  }, []);

  const isDark = preference === 'system' ? system === 'dark' : preference === 'dark';
  const toggle = useCallback(() => setPreference(isDark ? 'light' : 'dark'), [isDark, setPreference]);

  const value = useMemo(
    () => ({ t: isDark ? dark : light, preference, setPreference, toggle }),
    [isDark, preference, setPreference, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function OnNavyTheme({ children }: { children: React.ReactNode }) {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('OnNavyTheme must be used within ThemeProvider');
  const value = useMemo(() => ({ ...ctx, t: dark }), [ctx]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

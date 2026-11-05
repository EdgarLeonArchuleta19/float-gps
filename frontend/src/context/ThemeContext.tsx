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
  tonal: string;
  selected: string;
  press: string;
  brandText: string;
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
    tonal: string;
    selected: string;
    onSelected: string;
    brand: string;
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
  tonal: 'bg-ink-tonal',
  selected: 'bg-ink-selected',
  press: 'active:bg-white/5',
  brandText: 'text-[#8fb3e0]',
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
    tonal: '#26262c',
    selected: '#1b2c42',
    onSelected: '#f87203',
    brand: '#8fb3e0',
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
  tonal: 'bg-paper-tonal',
  selected: 'bg-paper-selected',
  press: 'active:bg-black/5',
  brandText: 'text-navy',
  text: 'text-[#1d1d1f]',
  muted: 'text-gray-500',
  subtle: 'text-gray-400',
  hex: {
    screen: '#f3f3f6',
    card: '#ffffff',
    input: '#f3f3f6',
    border: '#ececef',
    text: '#1d1d1f',
    muted: '#6b7280',
    primary: '#f87203',
    tonal: '#eff1f5',
    selected: '#e2e8f0',
    onSelected: '#f87203',
    brand: '#032347',
  },
};

const navy: Palette = {
  isDark: true,
  screen: 'bg-navy',
  card: 'bg-white/10',
  input: 'bg-white/10',
  border: 'border-white/15',
  modal: 'bg-navy',
  active: 'bg-white/15',
  tonal: 'bg-white/10',
  selected: 'bg-white/15',
  press: 'active:bg-white/5',
  brandText: 'text-white',
  text: 'text-white',
  muted: 'text-white/60',
  subtle: 'text-white/45',
  hex: {
    screen: '#032347',
    card: '#1c3a5a',
    input: '#1c3a5a',
    border: 'rgba(255,255,255,0.15)',
    text: '#ffffff',
    muted: 'rgba(255,255,255,0.6)',
    primary: '#f87203',
    tonal: 'rgba(255,255,255,0.1)',
    selected: 'rgba(255,255,255,0.15)',
    onSelected: '#f87203',
    brand: '#ffffff',
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
  const value = useMemo(() => ({ ...ctx, t: navy }), [ctx]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

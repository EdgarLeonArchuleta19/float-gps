import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LayoutContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  toggleDarkMode: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('gps_darkmode') === 'true';
  });

  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), []);
  const toggleDarkMode = useCallback(() => {
    setDarkMode((p) => {
      localStorage.setItem('gps_darkmode', String(!p));
      return !p;
    });
  }, []);

  return (
    <LayoutContext.Provider value={{ sidebarOpen, setSidebarOpen, toggleSidebar, darkMode, setDarkMode, toggleDarkMode }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used within LayoutProvider');
  return ctx;
}

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateName: (name: string) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('gps_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [password, setPassword] = useState<string>(() => {
    return localStorage.getItem('gps_pass') || 'demo123';
  });

  const login = useCallback(async (email: string, inputPassword: string) => {
    if (email === 'admin@demo.com' && inputPassword === password) {
      const u: User = { id: '1', email, name: 'Administrador', role: 'admin' };
      setUser(u);
      localStorage.setItem('gps_user', JSON.stringify(u));
      return true;
    }
    return false;
  }, [password]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('gps_user');
  }, []);

  const updateName = useCallback((name: string) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, name };
      localStorage.setItem('gps_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (currentPassword !== password) return false;
    setPassword(newPassword);
    localStorage.setItem('gps_pass', newPassword);
    return true;
  }, [password]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, updateName, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

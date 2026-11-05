import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { api, onUnauthorized, setSessionToken, setSupportCompanyId } from '@/lib/api';
import { storage } from '@/lib/storage';
import { forgetEngineCredential } from '@/lib/engineCredential';
import type { User } from '@/lib/types';

const TOKEN_KEY = 'floa_mobile_token';
const USER_KEY = 'floa_mobile_user';
const SUPPORT_KEY = 'floa_support_company';

const USER_REFRESH_MS = 120000;

const OWNER_BLOCKED_MESSAGE = 'Esta app es solo para empresas cliente. El acceso de dueño se realiza desde el portal web.';

interface LoginResult {
  ok: boolean;
  error?: string;
}

interface SupportCompany {
  id: string;
  name: string;
}

interface AuthContextValue {
  user: User | null;
  restoring: boolean;
  isOwner: boolean;
  supportCompany: SupportCompany | null;
  login: (email: string, password: string, companySlug?: string | null) => Promise<LoginResult>;
  startSession: (token: string, user: User) => Promise<void>;
  logout: () => void;
  enterSupport: (company: SupportCompany) => void;
  exitSupport: () => void;
  renameCompany: (name: string) => void;
  replaceToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isOwnerAccount(user: User | null | undefined) {
  return user?.role === 'superadmin';
}

function ownerAllowedHere() {
  return Platform.OS === 'web';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supportCompany, setSupportCompany] = useState<SupportCompany | null>(null);
  const [restoring, setRestoring] = useState(true);

  const clearSession = useCallback(() => {
    setSessionToken(null);
    setSupportCompanyId(null);
    setUser(null);
    setSupportCompany(null);
    storage.remove(TOKEN_KEY);
    storage.remove(USER_KEY);
    storage.remove(SUPPORT_KEY);
    forgetEngineCredential();
  }, []);

  useEffect(() => {
    onUnauthorized(clearSession);
    return () => onUnauthorized(null);
  }, [clearSession]);

  useEffect(() => {
    (async () => {
      const [token, savedUser, savedSupport] = await Promise.all([
        storage.get(TOKEN_KEY),
        storage.get(USER_KEY),
        storage.get(SUPPORT_KEY),
      ]);
      let parsed: User | null = null;
      let support: SupportCompany | null = null;
      try {
        parsed = savedUser ? JSON.parse(savedUser) : null;
        support = savedSupport ? JSON.parse(savedSupport) : null;
      } catch {
        parsed = null;
      }
      const allowed = parsed && (!isOwnerAccount(parsed) || ownerAllowedHere());
      if (token && parsed && allowed) {
        setSessionToken(token);
        setUser(parsed);
        if (support && isOwnerAccount(parsed)) {
          setSupportCompanyId(support.id);
          setSupportCompany(support);
        }
      } else if (token || savedUser) {
        clearSession();
      }
      setRestoring(false);
    })();
  }, [clearSession]);

  const loggedIn = !!user;
  useEffect(() => {
    if (!loggedIn) return;
    const refreshUser = () =>
      api.auth
        .me()
        .then((fresh) => {
          setUser((prev) => {
            if (!prev || prev.id !== fresh.id) return prev;
            const next = { ...prev, ...fresh };
            storage.set(USER_KEY, JSON.stringify(next));
            return next;
          });
        })
        .catch(() => {});
    refreshUser();
    const id = setInterval(refreshUser, USER_REFRESH_MS);
    return () => clearInterval(id);
  }, [loggedIn]);

  const startSession = useCallback(async (token: string, next: User) => {
    setSessionToken(token);
    setSupportCompanyId(null);
    setSupportCompany(null);
    await Promise.all([storage.set(TOKEN_KEY, token), storage.set(USER_KEY, JSON.stringify(next)), storage.remove(SUPPORT_KEY)]);
    setUser(next);
  }, []);

  const login = useCallback(
    async (email: string, password: string, companySlug?: string | null): Promise<LoginResult> => {
      try {
        const res = await api.auth.login(email.trim(), password);
        if (isOwnerAccount(res.user)) {
          return { ok: false, error: OWNER_BLOCKED_MESSAGE };
        }
        if (companySlug && res.user.companySlug && res.user.companySlug !== companySlug) {
          return { ok: false, error: `Esta cuenta no pertenece a la empresa "${companySlug}".` };
        }
        await startSession(res.token, res.user);
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.message || 'Credenciales incorrectas' };
      }
    },
    [startSession]
  );

  const enterSupport = useCallback((company: SupportCompany) => {
    setSupportCompanyId(company.id);
    setSupportCompany(company);
    storage.set(SUPPORT_KEY, JSON.stringify(company));
  }, []);

  const exitSupport = useCallback(() => {
    setSupportCompanyId(null);
    setSupportCompany(null);
    storage.remove(SUPPORT_KEY);
  }, []);

  const renameCompany = useCallback((name: string) => {
    setUser((prev) => {
      if (!prev?.companyId) return prev;
      const next = { ...prev, companyName: name };
      storage.set(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const replaceToken = useCallback((token: string) => {
    setSessionToken(token);
    storage.set(TOKEN_KEY, token);
  }, []);

  const value = useMemo(
    () => ({
      user,
      restoring,
      isOwner: isOwnerAccount(user),
      supportCompany,
      login,
      startSession,
      logout: clearSession,
      enterSupport,
      exitSupport,
      renameCompany,
      replaceToken,
    }),
    [user, restoring, supportCompany, login, startSession, clearSession, enterSupport, exitSupport, renameCompany, replaceToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

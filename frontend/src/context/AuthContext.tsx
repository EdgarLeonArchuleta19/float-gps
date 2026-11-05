import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { api, onSupportEnded, onUnauthorized, setSessionToken, setSupportSessionId } from '@/lib/api';
import { storage } from '@/lib/storage';
import { loadServerUrl } from '@/lib/apiUrl';
import { forgetEngineCredential } from '@/lib/engineCredential';
import { forgetPush, refreshPush } from '@/lib/push';
import type { User } from '@/lib/types';
import type { StaffMember, SupportSession } from '@/lib/staff';
import { consoleApi } from '@/components/console/consoleApi';

const TOKEN_KEY = 'floa_mobile_token';
const USER_KEY = 'floa_mobile_user';
const STAFF_KEY = 'floa_staff';
const SUPPORT_KEY = 'floa_support_session';

const USER_REFRESH_MS = 120000;

interface LoginResult {
  ok: boolean;
  error?: string;
}

interface AuthContextValue {
  user: User | null;
  staff: StaffMember | null;
  support: SupportSession | null;
  restoring: boolean;
  login: (email: string, password: string, companySlug?: string | null) => Promise<LoginResult>;
  startStaffSession: (token: string, staff: StaffMember) => Promise<void>;
  logout: () => void;
  enterSupport: (session: SupportSession) => Promise<void>;
  exitSupport: () => Promise<void>;
  renameCompany: (name: string) => void;
  replaceToken: (token: string) => void;
  passwordChanged: (token: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function consoleAllowedHere() {
  return Platform.OS === 'web';
}

function parse<T>(raw: string | null): T | null {
  try {
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function stillOpen(session: SupportSession | null) {
  return !!session && new Date(session.expiresAt).getTime() > Date.now();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [support, setSupport] = useState<SupportSession | null>(null);
  const [restoring, setRestoring] = useState(true);

  const clearSession = useCallback(() => {
    forgetPush();
    setSessionToken(null);
    setSupportSessionId(null);
    setUser(null);
    setStaff(null);
    setSupport(null);
    storage.remove(TOKEN_KEY);
    storage.remove(USER_KEY);
    storage.remove(STAFF_KEY);
    storage.remove(SUPPORT_KEY);
    forgetEngineCredential();
  }, []);

  const leaveSupportLocally = useCallback(() => {
    setSupportSessionId(null);
    setSupport(null);
    setUser(null);
    storage.remove(SUPPORT_KEY);
    storage.remove(USER_KEY);
  }, []);

  useEffect(() => {
    onUnauthorized(clearSession);
    onSupportEnded(() => {
      leaveSupportLocally();
      router.replace('/console');
    });
    return () => {
      onUnauthorized(null);
      onSupportEnded(null);
    };
  }, [clearSession, leaveSupportLocally]);

  useEffect(() => {
    (async () => {
      await loadServerUrl();
      const [token, savedUser, savedStaff, savedSupport] = await Promise.all([
        storage.get(TOKEN_KEY),
        storage.get(USER_KEY),
        storage.get(STAFF_KEY),
        storage.get(SUPPORT_KEY),
      ]);
      const parsedUser = parse<User>(savedUser);
      const parsedStaff = parse<StaffMember>(savedStaff);
      const parsedSupport = parse<SupportSession>(savedSupport);
      if (token && parsedStaff && consoleAllowedHere()) {
        setSessionToken(token);
        setStaff(parsedStaff);
        if (stillOpen(parsedSupport) && parsedUser) {
          setSupportSessionId(parsedSupport!.id);
          setSupport(parsedSupport);
          setUser(parsedUser);
        } else if (parsedSupport) {
          storage.remove(SUPPORT_KEY);
          storage.remove(USER_KEY);
        }
      } else if (token && parsedUser && !parsedStaff) {
        setSessionToken(token);
        setUser(parsedUser);
      } else if (token || savedUser || savedStaff) {
        clearSession();
      }
      setRestoring(false);
    })();
  }, [clearSession]);

  useEffect(() => {
    if (!support) return;
    const left = new Date(support.expiresAt).getTime() - Date.now();
    const id = setTimeout(() => {
      leaveSupportLocally();
      router.replace('/console');
    }, Math.max(left, 0));
    return () => clearTimeout(id);
  }, [support, leaveSupportLocally]);

  const customerId = user && !staff ? user.id : null;
  useEffect(() => {
    if (customerId) refreshPush();
  }, [customerId]);

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

  const login = useCallback(async (email: string, password: string, companySlug?: string | null): Promise<LoginResult> => {
    try {
      const res = await api.auth.login(email.trim(), password);
      if (companySlug && res.user.companySlug && res.user.companySlug !== companySlug) {
        return { ok: false, error: `Esta cuenta no pertenece a la empresa "${companySlug}".` };
      }
      setSessionToken(res.token);
      setSupportSessionId(null);
      await Promise.all([storage.set(TOKEN_KEY, res.token), storage.set(USER_KEY, JSON.stringify(res.user)), storage.remove(STAFF_KEY), storage.remove(SUPPORT_KEY)]);
      setStaff(null);
      setSupport(null);
      setUser(res.user);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Credenciales incorrectas' };
    }
  }, []);

  const startStaffSession = useCallback(async (token: string, member: StaffMember) => {
    setSessionToken(token);
    setSupportSessionId(null);
    await Promise.all([storage.set(TOKEN_KEY, token), storage.set(STAFF_KEY, JSON.stringify(member)), storage.remove(USER_KEY), storage.remove(SUPPORT_KEY)]);
    setUser(null);
    setSupport(null);
    setStaff(member);
  }, []);

  const enterSupport = useCallback(async (session: SupportSession) => {
    setSupportSessionId(session.id);
    try {
      const companyUser = await api.auth.me();
      await Promise.all([storage.set(SUPPORT_KEY, JSON.stringify(session)), storage.set(USER_KEY, JSON.stringify(companyUser))]);
      setSupport(session);
      setUser(companyUser);
    } catch (err) {
      setSupportSessionId(null);
      throw err;
    }
  }, []);

  const exitSupport = useCallback(async () => {
    const current = support;
    leaveSupportLocally();
    if (current) await consoleApi.endSupport(current.id).catch(() => {});
  }, [support, leaveSupportLocally]);

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

  const passwordChanged = useCallback(
    (token: string) => {
      replaceToken(token);
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, mustChangePassword: false };
        storage.set(USER_KEY, JSON.stringify(next));
        return next;
      });
    },
    [replaceToken]
  );

  const value = useMemo(
    () => ({
      user,
      staff,
      support,
      restoring,
      login,
      startStaffSession,
      logout: clearSession,
      enterSupport,
      exitSupport,
      renameCompany,
      replaceToken,
      passwordChanged,
    }),
    [user, staff, support, restoring, login, startStaffSession, clearSession, enterSupport, exitSupport, renameCompany, replaceToken, passwordChanged]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

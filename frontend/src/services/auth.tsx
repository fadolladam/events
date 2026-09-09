import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from './api';
import { apiLogout, cacheUser, ensureCsrf, fetchMe, getStoredUser } from './api';

interface AuthValue {
  user: User | null;
  /** true until the initial GET /auth/me has resolved */
  loading: boolean;
  /** persist the signed-in user after a successful login call */
  setSession: (user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Paint from the cached profile immediately, then confirm with the server.
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Prime the CSRF cookie so the first mutating request (login, public
      // registration) succeeds, then check for an existing session.
      await ensureCsrf().catch(() => undefined);
      const me = await fetchMe();
      if (cancelled) return;
      setUser(me);
      cacheUser(me);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setSession = useCallback((nextUser: User) => {
    cacheUser(nextUser);
    setUser(nextUser);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    cacheUser(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, setSession, logout }), [user, loading, setSession, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};

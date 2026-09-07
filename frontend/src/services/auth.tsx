import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { User } from './api';

const TOKEN_KEY = 'rhb_events_token';
const USER_KEY = 'rhb_events_user';

const readUser = (): User | null => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
};

interface AuthValue {
  user: User | null;
  /** persist the signed-in user (token is stored by the login call itself) */
  setSession: (user: User, token?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => readUser());

  const setSession = useCallback((nextUser: User, token?: string) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, setSession, logout }), [user, setSession, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};

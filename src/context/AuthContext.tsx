'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initializeDB, db } from '../data/mockData';
import { dataService } from '../data/dataService';
import { isDemoMode } from '../lib/demoMode';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  phone?: string;
  branch?: string | null;
  [key: string]: unknown;
}

interface AuthContextValue {
  currentUser: CurrentUser | null;
  login: (userOrEmail: CurrentUser | string, password?: string) => Promise<CurrentUser | null | undefined>;
  updateCurrentUser: (user: CurrentUser) => void;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeDB();
    const savedUser = db.getCurrentUser();
    if (savedUser) setCurrentUserState(savedUser);
    setLoading(false);
  }, []);

  // In demo mode this is the existing "role switcher" behavior (pass a mock
  // user object). In live mode, pass (email, password) and it POSTs to
  // /auth/login/, stores JWT tokens, and stores the returned user.
  const login = async (userOrEmail: CurrentUser | string, password?: string) => {
    if (isDemoMode()) {
      const user = userOrEmail as CurrentUser;
      db.setCurrentUser(user);
      setCurrentUserState(user);
      return user;
    }
    const user = await dataService.login(userOrEmail as string, password) as CurrentUser | null;
    if (user) setCurrentUserState(user);
    return user;
  };

  // Updates the in-memory/session user without the "session switched" audit semantics
  // (e.g. after a user edits their own profile in Settings)
  const updateCurrentUser = (user: CurrentUser) => {
    localStorage.setItem('beacon_current_user', JSON.stringify(user));
    setCurrentUserState(user);
  };

  const logout = async () => {
    try {
      await dataService.logout();
    } catch {
      // best-effort
    } finally {
      localStorage.removeItem('beacon_current_user');
      setCurrentUserState(null);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, updateCurrentUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

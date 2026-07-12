'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initializeDB, db } from '../data/mockData';

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
  login: (user: CurrentUser) => void;
  updateCurrentUser: (user: CurrentUser) => void;
  logout: () => void;
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

  // Persists as the active session (also logs an audit "session switched" entry)
  const login = (user: CurrentUser) => {
    db.setCurrentUser(user);
    setCurrentUserState(user);
  };

  // Updates the in-memory/session user without the "session switched" audit semantics
  // (e.g. after a user edits their own profile in Settings)
  const updateCurrentUser = (user: CurrentUser) => {
    localStorage.setItem('beacon_current_user', JSON.stringify(user));
    setCurrentUserState(user);
  };

  const logout = () => {
    localStorage.removeItem('beacon_current_user');
    setCurrentUserState(null);
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

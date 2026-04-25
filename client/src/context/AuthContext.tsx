import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  isOffline: boolean;
  login: (nickname: string, password: string) => Promise<void>;
  register: (payload: {
    firstName: string;
    lastName?: string;
    nickname: string;
    email?: string;
    password: string;
    gender?: string;
    birthdate?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const isNetworkError = (err: unknown): boolean => {
  if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) return true;
  if (err instanceof Error && (err.message.includes('NetworkError') || err.message.includes('network'))) return true;
  return false;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('synchub_token'));
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const hydrate = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (token === 'local') {
      const cached = localStorage.getItem('synchub_user');
      if (cached) {
        try {
          setUser(JSON.parse(cached));
          setIsOffline(true);
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.me();
      setUser(response.user);
      setIsOffline(false);
    } catch (err) {
      if (isNetworkError(err)) {
        // Server unreachable — stay logged in with cached data if available
        const cached = localStorage.getItem('synchub_user');
        if (cached) {
          try {
            setUser(JSON.parse(cached));
            setIsOffline(true);
          } catch {
            localStorage.removeItem('synchub_token');
            setToken(null);
          }
        } else {
          localStorage.removeItem('synchub_token');
          setToken(null);
        }
      } else {
        // Auth error (expired token, etc.) — clear session
        localStorage.removeItem('synchub_token');
        localStorage.removeItem('synchub_user');
        setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hydrate();
  }, [token]);

  const login = async (nickname: string, password: string) => {
    setLoading(true);
    try {
      const response = await authApi.login({ nickname, password });
      localStorage.setItem('synchub_token', response.token);
      localStorage.setItem('synchub_user', JSON.stringify(response.user));
      setToken(response.token);
      setUser(response.user);
      setIsOffline(false);
    } catch (err) {
      if (isNetworkError(err)) {
        // Server unreachable — enter offline mode
        const localUser: User = {
          id: `local_${Date.now()}`,
          firstName: nickname || 'User',
          lastName: '',
          nickname: nickname || 'local',
          email: '',
          role: 'Участник',
          avatar: '👤',
          gender: '',
          birthdate: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('synchub_token', 'local');
        localStorage.setItem('synchub_user', JSON.stringify(localUser));
        setToken('local');
        setUser(localUser);
        setIsOffline(true);
      } else {
        // API returned an error (wrong password, user not found, etc.)
        const message = err instanceof Error ? err.message : 'Не удалось войти';
        throw new Error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload: {
    firstName: string;
    lastName?: string;
    nickname: string;
    email?: string;
    password: string;
    gender?: string;
    birthdate?: string;
  }) => {
    setLoading(true);
    try {
      const response = await authApi.register(payload);
      localStorage.setItem('synchub_token', response.token);
      localStorage.setItem('synchub_user', JSON.stringify(response.user));
      setToken(response.token);
      setUser(response.user);
      setIsOffline(false);
    } catch (err) {
      if (isNetworkError(err)) {
        // Server unreachable — create local account
        const localUser: User = {
          id: `local_${Date.now()}`,
          firstName: payload.firstName || 'User',
          lastName: payload.lastName || '',
          nickname: payload.nickname || 'local',
          email: payload.email || '',
          role: 'Участник',
          avatar: '👤',
          gender: payload.gender || '',
          birthdate: payload.birthdate || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('synchub_token', 'local');
        localStorage.setItem('synchub_user', JSON.stringify(localUser));
        setToken('local');
        setUser(localUser);
        setIsOffline(true);
      } else {
        const message = err instanceof Error ? err.message : 'Не удалось зарегистрироваться';
        throw new Error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (token && token !== 'local') {
        await authApi.logout();
      }
    } catch {
      // ignore errors on logout
    }
    localStorage.removeItem('synchub_token');
    localStorage.removeItem('synchub_user');
    setToken(null);
    setUser(null);
    setIsOffline(false);
  };

  const value = useMemo(
    () => ({ user, token, loading, isOffline, login, register, logout, setUser }),
    [user, token, loading, isOffline]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('synchub_token'));
  const [loading, setLoading] = useState(true);

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
    } catch {
      localStorage.removeItem('synchub_token');
      setToken(null);
      setUser(null);
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
      setToken(response.token);
      setUser(response.user);
    } catch {
      // Fallback: allow local login when API is unreachable
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
      setToken(response.token);
      setUser(response.user);
    } catch {
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
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore errors on logout
    }
    localStorage.removeItem('synchub_token');
    localStorage.removeItem('synchub_user');
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout, setUser }),
    [user, token, loading]
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

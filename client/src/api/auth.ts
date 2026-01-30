import { apiRequest } from './client';
import type { User } from '../types';

interface AuthResponse {
  success: boolean;
  user: User;
  token: string;
}

export const authApi = {
  async register(payload: {
    firstName: string;
    lastName?: string;
    nickname: string;
    email?: string;
    password: string;
    gender?: string;
    birthdate?: string;
  }) {
    return apiRequest<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async login(payload: { nickname: string; password: string }) {
    return apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async me() {
    return apiRequest<{ success: boolean; user: User }>('/api/auth/me');
  },

  async logout() {
    return apiRequest<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
  }
};

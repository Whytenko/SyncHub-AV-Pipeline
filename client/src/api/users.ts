import { apiRequest } from './client';
import type { User, UserSummary } from '../types';

export const usersApi = {
  async getMe() {
    return apiRequest<{ success: boolean; user: User }>('/api/users/me');
  },

  async updateMe(payload: Partial<User>) {
    return apiRequest<{ success: boolean; user: User }>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async changePassword(payload: { currentPassword: string; newPassword: string }) {
    return apiRequest<{ success: boolean }>('/api/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async search(query: string) {
    if (!query || query.trim().length < 2) return { success: true, users: [] as UserSummary[] };
    return apiRequest<{ success: boolean; users: UserSummary[] }>(
      `/api/users/search?q=${encodeURIComponent(query.trim())}`
    );
  }
};

import { apiRequest } from './client';
import type { User } from '../types';

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
  }
};

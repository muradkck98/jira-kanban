import client from './client';
import type { APIResponse } from '../types';

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  fullName: string;
  displayName: string;
  avatarUrl?: string;
  department?: string;
  authProvider: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export const usersAPI = {
  list: (search?: string) =>
    client.get<APIResponse<UserProfile[]>>('/users', {
      params: search ? { search } : undefined,
    }),

  getById: (id: string) =>
    client.get<APIResponse<UserProfile>>(`/users/${id}`),

  update: (id: string, data: {
    displayName?: string;
    email?: string;
    avatarUrl?: string;
    department?: string;
  }) =>
    client.patch<APIResponse<UserProfile>>(`/users/${id}`, data),

  // LDAP - şimdilik devre dışı
  // searchLdap: (query: string) =>
  //   client.get('/auth/ldap/search', { params: { q: query } }),
};

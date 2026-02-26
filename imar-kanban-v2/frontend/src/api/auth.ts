import client from './client';
import type { APIResponse, LoginResponse, User } from '../types';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  fullName: string;
  email?: string;
  password: string;
}

export const authAPI = {
  login: (data: LoginRequest) =>
    client.post<APIResponse<LoginResponse>>('/auth/login', data),

  register: (data: RegisterRequest) =>
    client.post<APIResponse<LoginResponse>>('/auth/register', data),

  me: () =>
    client.get<APIResponse<User>>('/auth/me'),

  // LDAP - şimdilik devre dışı
  // ldapSync: () =>
  //   client.post<APIResponse<{ total: number; created: number; updated: number }>>('/auth/ldap/sync'),
  //
  // ldapSearch: (query: string) =>
  //   client.get<APIResponse<any[]>>('/auth/ldap/search', { params: { q: query } }),
};

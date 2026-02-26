import { create } from 'zustand';
import type { User } from '../types';
import { authAPI } from '../api';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;

  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, fullName: string, email?: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  initialized: false,

  login: async (username: string, password: string) => {
    set({ loading: true });
    try {
      const res = await authAPI.login({ username, password });
      const { token, user } = res.data.data!;
      localStorage.setItem('token', token);
      set({ user, token, loading: false });
    } catch (err: unknown) {
      set({ loading: false });
      const error = err as { response?: { data?: { error?: string } } };
      throw new Error(error.response?.data?.error || 'Giriş başarısız');
    }
  },

  register: async (username: string, password: string, fullName: string, email?: string) => {
    set({ loading: true });
    try {
      const res = await authAPI.register({ username, password, fullName, email });
      const { token, user } = res.data.data!;
      localStorage.setItem('token', token);
      set({ user, token, loading: false });
    } catch (err: unknown) {
      set({ loading: false });
      const error = err as { response?: { data?: { error?: string } } };
      throw new Error(error.response?.data?.error || 'Kayıt başarısız');
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
    // GEÇİCİ: login sayfasına yönlendirme devre dışı
    // window.location.href = '/giris';
  },

  loadUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ initialized: true });
      return;
    }
    try {
      const res = await authAPI.me();
      set({ user: res.data.data!, token, initialized: true });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, initialized: true });
    }
  },
}));

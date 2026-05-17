import { create } from 'zustand';
import { authApi } from '@/lib/api';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (password: string) => {
    const { data } = await authApi.login({ username: 'admin', password });
    // Response interceptor unwraps {success, data} envelope
    const token = data.token;
    localStorage.setItem('sofa_token', token);
    set({ token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('sofa_token');
    authApi.logout().catch(() => {});
    set({ token: null, isAuthenticated: false });
  },

  init: async () => {
    const token = localStorage.getItem('sofa_token');
    if (!token) {
      set({ token: null, isAuthenticated: false, isLoading: false });
      return;
    }
    // Validate the token by calling /auth/profile
    try {
      await authApi.getProfile();
      set({ token, isAuthenticated: true, isLoading: false });
    } catch {
      // Token is invalid/expired
      localStorage.removeItem('sofa_token');
      set({ token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

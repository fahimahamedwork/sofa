import { create } from 'zustand';
import { authApi } from '@/lib/api';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (password: string) => {
    const { data } = await authApi.login({ password });
    localStorage.setItem('sofa_token', data.token);
    set({ token: data.token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('sofa_token');
    authApi.logout().catch(() => {});
    set({ token: null, isAuthenticated: false });
  },

  init: () => {
    const token = localStorage.getItem('sofa_token');
    if (token) {
      set({ token, isAuthenticated: true, isLoading: false });
    } else {
      set({ token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

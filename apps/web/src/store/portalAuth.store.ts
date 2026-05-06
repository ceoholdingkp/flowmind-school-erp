import { create } from 'zustand';
import portalApi from '../api/portalClient';

interface PortalUser {
  id: string;
  nombres: string;
  apellidos: string;
  run: string;
  email?: string;
}

interface PortalAuthState {
  user: PortalUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (run: string, password: string) => Promise<void>;
  activarCuenta: (run: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  init: () => void;
}

export const usePortalAuthStore = create<PortalAuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('portal_token'),
  isLoading: false,

  init: () => {
    const token = localStorage.getItem('portal_token');
    const userStr = localStorage.getItem('portal_user');
    if (token && userStr) {
      try {
        set({ accessToken: token, user: JSON.parse(userStr) });
      } catch {}
    }
  },

  login: async (run, password) => {
    set({ isLoading: true });
    try {
      const { data } = await portalApi.post('/portal/auth/login', { run, password });
      const { accessToken, apoderado } = data;
      localStorage.setItem('portal_token', accessToken);
      localStorage.setItem('portal_user', JSON.stringify(apoderado));
      set({ accessToken, user: apoderado, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  activarCuenta: async (run, email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await portalApi.post('/portal/auth/activar', { run, email, password });
      const { accessToken, apoderado } = data;
      localStorage.setItem('portal_token', accessToken);
      localStorage.setItem('portal_user', JSON.stringify(apoderado));
      set({ accessToken, user: apoderado, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_user');
    set({ user: null, accessToken: null });
  },
}));

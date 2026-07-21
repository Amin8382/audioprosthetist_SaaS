import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login as apiLogin, logout as apiLogout, getMe } from '../api/frappe';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (usr, pwd) => {
        set({ isLoading: true, error: null });
        try {
          await apiLogin(usr, pwd);
          const { data } = await getMe();
          set({
            user: data.message,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (err) {
          const msg = err.response?.data?.message || 'Erreur de connexion';
          set({ error: msg, isLoading: false });
          return false;
        }
      },

      logout: async () => {
        try {
          await apiLogout();
        } finally {
          set({ user: null, isAuthenticated: false, error: null });
        }
      },

      checkAuth: async () => {
        try {
          const { data } = await getMe();
          set({ user: data.message, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'odyio-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export default useAuthStore;

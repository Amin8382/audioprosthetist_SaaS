import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      login: (authResponse) =>
        set({
          user: {
            id: authResponse.userId,
            email: authResponse.email,
            role: authResponse.role,
          },
          accessToken: authResponse.accessToken,
          refreshToken: authResponse.refreshToken,
          isAuthenticated: true,
        }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
      setAccessToken: (token) => set({ accessToken: token }),
    }),
    { name: 'audiosoin-auth' }
  )
);

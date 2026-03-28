import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: { id: string; name: string; email: string; role: string } | null;
  login: (token: string, refreshToken: string | null, user: AuthState['user']) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      login: (token, refreshToken, user) => set({ token, refreshToken, user }),
      setToken: (token) => set({ token }),
      logout: () => set({ token: null, refreshToken: null, user: null }),
    }),
    { name: 'cinevault-admin-auth' },
  ),
);

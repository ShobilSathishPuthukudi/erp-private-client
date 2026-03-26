import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: { uid: string; email: string; role: string; deptId?: number; name?: string; avatar?: string; subDepartment?: string } | null;
  token: string | null;
  login: (user: any, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<AuthState['user']>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      updateUser: (updates) => set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),
    }),
    {
      name: 'auth-storage',
    }
  )
);

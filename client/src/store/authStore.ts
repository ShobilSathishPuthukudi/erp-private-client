import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: { uid: string; email: string; role: string; deptId?: number; departmentName?: string; name?: string; avatar?: string; subDepartment?: string; phone?: string; dateOfBirth?: string; bio?: string; address?: string; themePreferences?: { panelThemes?: Record<string, string>; pageThemes?: Record<string, string> } } | null;
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
      login: (user, token) => {
        set({ user, token });
      },
      logout: () => set({ user: null, token: null }),
      updateUser: (updates) => set((state) => {
        if (!state.user || !updates) return { user: state.user };
        return { user: { ...state.user, ...updates } };
      }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

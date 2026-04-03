import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: { uid: string; email: string; role: string; deptId?: number; departmentName?: string; name?: string; avatar?: string; subDepartment?: string; phone?: string; dateOfBirth?: string; bio?: string; address?: string } | null;
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
        const normalizedRole = user?.role?.toLowerCase().trim() === 'center' ? 'study-center' : user?.role;
        set({ user: user ? { ...user, role: normalizedRole } : null, token });
      },
      logout: () => set({ user: null, token: null }),
      updateUser: (updates) => set((state) => {
        if (!state.user || !updates) return { user: state.user };
        const newRole = updates.role?.toLowerCase().trim() === 'center' ? 'study-center' : (updates.role || state.user.role);
        return { user: { ...state.user, ...updates, role: newRole } };
      }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

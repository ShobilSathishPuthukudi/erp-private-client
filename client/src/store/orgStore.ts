import { create } from 'zustand';
import { api } from '@/lib/api';

interface OrgState {
  orgName: string;
  orgLogo: string;
  fetchConfig: () => Promise<void>;
  updateConfig: (updates: Partial<{ orgName: string; orgLogo: string }>) => void;
}

export const useOrgStore = create<OrgState>((set) => ({
  orgName: 'ERP',
  orgLogo: '',
  fetchConfig: async () => {
    try {
      const { data } = await api.get('/org-admin/config');
      const updates: any = {};
      data.forEach((item: any) => {
        if (item.key === 'ORG_NAME') updates.orgName = item.value;
        if (item.key === 'ORG_LOGO') updates.orgLogo = item.value;
      });
      set(updates);
    } catch (error) {
      console.error('Failed to fetch org config:', error);
    }
  },
  updateConfig: (updates) => set((state) => ({ ...state, ...updates })),
}));

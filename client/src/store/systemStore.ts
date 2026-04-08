import { create } from 'zustand';

interface SystemState {
  isSystemOffline: boolean;
  setSystemOffline: (status: boolean) => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  isSystemOffline: false,
  setSystemOffline: (status) => set({ isSystemOffline: status }),
}));

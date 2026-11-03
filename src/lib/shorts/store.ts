'use client';
import { create } from 'zustand';

export type TabKey = 'dashboard' | 'campaigns' | 'create' | 'library' | 'schedule' | 'settings';

interface AppState {
  activeTab: TabKey;
  setActiveTab: (t: TabKey) => void;
  lastUpdate: number; // bump to trigger refetch
  bump: () => void;
  ytConnected: boolean | null; // null = unknown
  setYtConnected: (v: boolean) => void;
}

export const useApp = create<AppState>((set) => ({
  activeTab: 'dashboard',
  setActiveTab: (t) => set({ activeTab: t }),
  lastUpdate: 0,
  bump: () => set({ lastUpdate: Date.now() }),
  ytConnected: null,
  setYtConnected: (v) => set({ ytConnected: v }),
}));

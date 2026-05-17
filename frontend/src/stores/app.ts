import { create } from 'zustand';

interface AppState {
  selectedAppSlug: string | null;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  setSelectedApp: (slug: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedAppSlug: null,
  sidebarOpen: false,
  sidebarCollapsed: false,

  setSelectedApp: (slug) => set({ selectedAppSlug: slug }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));

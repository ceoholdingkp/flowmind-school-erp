import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  expandedGroups: Set<string>;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  toggleGroup: (group: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  expandedGroups: new Set(['alumnos', 'academico', 'finanzas', 'rrhh', 'complementarios']),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),

  toggleGroup: (group) => {
    const groups = new Set(get().expandedGroups);
    if (groups.has(group)) groups.delete(group);
    else groups.add(group);
    set({ expandedGroups: groups });
  },
}));

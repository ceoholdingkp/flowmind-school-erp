import { create } from 'zustand';

export type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

function apply(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

const saved = (localStorage.getItem('theme') as Theme) ?? 'dark';

export const useThemeStore = create<ThemeState>((set, get) => {
  apply(saved);
  return {
    theme: saved,
    toggle() {
      const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
      apply(next);
      set({ theme: next });
    },
  };
});

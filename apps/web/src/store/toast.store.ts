import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  add: (type: ToastType, message: string, duration?: number) => void;
  remove: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  add: (type, message, duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, type, message, duration };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    setTimeout(() => get().remove(id), duration);
  },

  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  success: (message) => get().add('success', message),
  error: (message) => get().add('error', message),
  warning: (message) => get().add('warning', message),
  info: (message) => get().add('info', message),
}));

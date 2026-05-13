import { create } from 'zustand';

export type ModalType = 'entry-form' | 'delete-confirm' | 'settings' | 'change-password' | null;

interface UIState {
  modalType: ModalType;
  sidebarOpen: boolean;
  toasts: Toast[];

  // 操作
  openModal: (type: ModalType) => void;
  closeModal: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

let toastId = 0;

export const useUIStore = create<UIState>((set) => ({
  modalType: null,
  sidebarOpen: true,
  toasts: [],

  openModal: (type) => set({ modalType: type }),
  closeModal: () => set({ modalType: null }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  addToast: (toast) => {
    const id = String(++toastId);
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    // 3秒后自动移除
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

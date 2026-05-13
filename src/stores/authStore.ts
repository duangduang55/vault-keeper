import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { LockState } from '../types/common';
import type { SetupResult, UnlockResult, LockResult, GetLockStateResult } from '../types/auth';

interface AuthState {
  lockState: LockState;
  isLoading: boolean;
  error: string | null;

  // 操作
  checkLockState: () => Promise<void>;
  setup: (password: string) => Promise<boolean>;
  unlock: (password: string) => Promise<boolean>;
  lock: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  lockState: 'uninitialized',
  isLoading: true,
  error: null,

  checkLockState: async () => {
    try {
      set({ isLoading: true, error: null });
      const result = await invoke<GetLockStateResult>('get_lock_state');
      set({
        lockState: result.lock_state as LockState,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: String(err),
      });
    }
  },

  setup: async (password: string) => {
    try {
      set({ isLoading: true, error: null });
      const result = await invoke<SetupResult>('setup', { password });
      set({
        lockState: result.lock_state as LockState,
        isLoading: false,
      });
      return true;
    } catch (err) {
      set({ isLoading: false, error: String(err) });
      return false;
    }
  },

  unlock: async (password: string) => {
    try {
      set({ isLoading: true, error: null });
      const result = await invoke<UnlockResult>('unlock', { password });
      set({
        lockState: result.lock_state as LockState,
        isLoading: false,
      });
      return true;
    } catch (err) {
      set({ isLoading: false, error: String(err) });
      return false;
    }
  },

  lock: async () => {
    try {
      set({ error: null });
      await invoke<LockResult>('lock');
      set({ lockState: 'locked' });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  changePassword: async (oldPassword: string, newPassword: string) => {
    try {
      set({ isLoading: true, error: null });
      await invoke('change_master_password', {
        oldPassword,
        newPassword,
      });
      set({ isLoading: false });
      return true;
    } catch (err) {
      set({ isLoading: false, error: String(err) });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { Entry, CreateEntryParams, UpdateEntryParams } from '../types/entry';
import { useAuthStore } from './authStore';

/** 检测锁定错误并自动跳转到解锁界面 */
function checkLockError(err: unknown) {
  const msg = String(err);
  if (msg.includes('锁定') || msg.includes('密钥未加载')) {
    useAuthStore.getState().checkLockState();
  }
}

interface EntryState {
  entries: Entry[];
  selectedEntry: Entry | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filterType: string | null;

  // 操作
  loadEntries: () => Promise<void>;
  selectEntry: (entry: Entry | null) => void;
  createEntry: (params: CreateEntryParams) => Promise<Entry | null>;
  updateEntry: (id: string, params: UpdateEntryParams) => Promise<Entry | null>;
  deleteEntry: (id: string) => Promise<boolean>;
  searchEntries: (query: string) => Promise<void>;
  filterByType: (entryType: string | null) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setFilterType: (entryType: string | null) => void;
  clearError: () => void;
  clearFilters: () => Promise<void>;
}

export const useEntryStore = create<EntryState>((set, get) => ({
  entries: [],
  selectedEntry: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  filterType: null,

  loadEntries: async () => {
    try {
      set({ isLoading: true, error: null });
      const entries = await invoke<Entry[]>('list_entries');
      set({ entries, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: String(err) });
      checkLockError(err);
    }
  },

  selectEntry: (entry) => set({ selectedEntry: entry }),

  createEntry: async (params) => {
    try {
      set({ isLoading: true, error: null });
      const entry = await invoke<Entry>('create_entry', { params });
      set((state) => ({
        entries: [entry, ...state.entries],
        isLoading: false,
      }));
      return entry;
    } catch (err) {
      set({ isLoading: false, error: String(err) });
      checkLockError(err);
      return null;
    }
  },

  updateEntry: async (id, params) => {
    try {
      set({ isLoading: true, error: null });
      const updated = await invoke<Entry>('update_entry', { id, params });
      set((state) => ({
        entries: state.entries.map((e) => (e.id === id ? updated : e)),
        selectedEntry: state.selectedEntry?.id === id ? updated : state.selectedEntry,
        isLoading: false,
      }));
      return updated;
    } catch (err) {
      set({ isLoading: false, error: String(err) });
      checkLockError(err);
      return null;
    }
  },

  deleteEntry: async (id) => {
    try {
      set({ isLoading: true, error: null });
      await invoke('delete_entry', { id });
      set((state) => ({
        entries: state.entries.filter((e) => e.id !== id),
        selectedEntry: state.selectedEntry?.id === id ? null : state.selectedEntry,
        isLoading: false,
      }));
      return true;
    } catch (err) {
      set({ isLoading: false, error: String(err) });
      checkLockError(err);
      return false;
    }
  },

  searchEntries: async (query) => {
    try {
      set({ isLoading: true, error: null, searchQuery: query });
      if (!query.trim()) {
        await get().loadEntries();
        return;
      }
      const entries = await invoke<Entry[]>('search_entries', { query });
      set({ entries, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: String(err) });
      checkLockError(err);
    }
  },

  filterByType: async (entryType) => {
    try {
      set({ isLoading: true, error: null, filterType: entryType });
      if (!entryType) {
        await get().loadEntries();
        return;
      }
      const entries = await invoke<Entry[]>('list_entries_by_type', { entryType });
      set({ entries, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: String(err) });
      checkLockError(err);
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterType: (entryType) => set({ filterType: entryType }),

  clearError: () => set({ error: null }),

  clearFilters: async () => {
    set({ searchQuery: '', filterType: null });
    await get().loadEntries();
  },
}));

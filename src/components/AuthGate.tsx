import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useAuthStore } from '../stores/authStore';
import { SetupView } from './SetupView';
import { UnlockView } from './UnlockView';
import { AppShell } from './layout/AppShell';

export function AuthGate() {
  const { lockState, isLoading, checkLockState } = useAuthStore();

  useEffect(() => {
    checkLockState();

    // 监听托盘/Dock 菜单的锁定事件
    const unlisten = listen('vault-locked', () => {
      checkLockState();
    });
    return () => { unlisten.then((f) => f()) };
  }, [checkLockState]);

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-surface-400 text-sm">正在加载...</p>
        </div>
      </div>
    );
  }

  switch (lockState) {
    case 'uninitialized':
      return <SetupView />;
    case 'locked':
      return <UnlockView />;
    case 'unlocked':
      return <AppShell />;
    default:
      return null;
  }
}

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { AppLogo } from './common/AppLogo';
import { APP_NAME } from '../lib/appConfig';

/** 装饰性保险柜环形 SVG — 与图标风格一致 */
function VaultRingDecoration() {
  return (
    <svg
      width="280"
      height="280"
      viewBox="0 0 280 280"
      className="absolute -top-20 -right-20 opacity-[0.03] dark:opacity-[0.06] pointer-events-none"
    >
      <rect x="4" y="4" width="272" height="272" rx="60" fill="currentColor" className="text-surface-200" />
      <circle cx="180" cy="140" r="50" fill="currentColor" className="text-surface-400" />
      <circle cx="180" cy="140" r="57" fill="none" stroke="currentColor" strokeWidth="14" className="text-surface-200" />
    </svg>
  )
}

export function UnlockView() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { unlock, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const ok = await unlock(password);
    if (!ok) {
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 p-6 relative overflow-hidden">
      <VaultRingDecoration />
      <div className="w-full max-w-sm animate-scale-in relative">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="mb-6 mx-auto">
            <AppLogo size={72} className="rounded-lg shadow-lg shadow-primary-500/5" />
          </div>
          <h1 className="text-[28px] font-semibold text-surface-100 tracking-tight">{APP_NAME}</h1>
          <p className="text-sm text-surface-500 mt-2">输入主密码解锁保险箱</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded bg-red-500/10 border border-red-500/20 backdrop-blur-sm">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded bg-surface-800/60 border border-surface-600/50 text-surface-100 text-[15px]
                placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-transparent
                transition-all duration-200 pr-11"
              placeholder="输入主密码"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full inline-flex items-center justify-center px-4 py-3 rounded bg-primary-500 text-white text-[15px] font-semibold
              hover:bg-primary-400 active:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-primary-500/50
              transition-all duration-200 active:scale-[0.98] shadow-sm shadow-primary-500/20"
          >
            {isLoading ? '正在解锁...' : '解锁'}
          </button>
        </form>
      </div>
    </div>
  );
}

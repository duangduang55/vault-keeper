import { useState } from 'react';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { PasswordStrength } from './PasswordStrength';
import { AppLogo } from './common/AppLogo';
import { APP_NAME } from '../lib/appConfig';

/** 装饰性保险柜环形 SVG */
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

export function SetupView() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const { setup, isLoading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (password.length < 8) {
      setLocalError('主密码至少需要 8 个字符');
      return;
    }
    if (password !== confirm) {
      setLocalError('两次输入的密码不一致');
      return;
    }

    const ok = await setup(password);
    if (!ok) {
      setPassword('');
      setConfirm('');
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 p-6 relative overflow-hidden">
      <VaultRingDecoration />
      <div className="w-full max-w-sm animate-scale-in relative">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="mb-6 mx-auto">
            <AppLogo size={72} className="rounded-lg shadow-lg shadow-primary-500/5" />
          </div>
          <h1 className="text-[28px] font-semibold text-surface-100 tracking-tight">设置主密码</h1>
          <p className="text-sm text-surface-500 mt-2 leading-relaxed">
            首次使用{APP_NAME}。<br />设置一个强密码来保护您的敏感信息。
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {displayError && (
            <div className="flex items-center gap-2 p-3 rounded bg-red-500/10 border border-red-500/20 backdrop-blur-sm">
              <AlertTriangle size={14} className="text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{displayError}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-surface-400 mb-1.5">
              主密码
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded bg-surface-800/60 border border-surface-600/50 text-surface-100 text-[15px]
                  placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-transparent
                  transition-all duration-200 pr-11"
                placeholder="至少 8 个字符"
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
          </div>

          <PasswordStrength password={password} />

          <div>
            <label className="block text-sm font-medium text-surface-400 mb-1.5">
              确认密码
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3 rounded bg-surface-800/60 border border-surface-600/50 text-surface-100 text-[15px]
                placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-transparent
                transition-all duration-200"
              placeholder="再次输入主密码"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !password || !confirm}
            className="w-full inline-flex items-center justify-center px-4 py-3 rounded bg-primary-500 text-white text-[15px] font-semibold
              hover:bg-primary-400 active:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-primary-500/50
              transition-all duration-200 active:scale-[0.98] shadow-sm shadow-primary-500/20"
          >
            {isLoading ? '正在创建...' : '创建保险箱'}
          </button>
        </form>

        {/* Warning */}
        <div className="mt-8 p-4 rounded bg-orange-500/8 border border-orange-500/15">
          <p className="text-orange-400/80 text-xs leading-relaxed">
            请务必牢记您的主密码。由于数据在本地加密存储，密码一旦丢失将无法找回。
          </p>
        </div>
      </div>
    </div>
  );
}

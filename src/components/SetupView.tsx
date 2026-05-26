import { useState } from 'react';
import { Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { PasswordStrength } from './PasswordStrength';

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
    <div className="min-h-screen flex items-center justify-center bg-surface-950 p-6">
      <div className="w-full max-w-sm animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[14px] bg-primary-500/10 mb-5 mx-auto">
            <Shield className="w-8 h-8 text-primary-500" />
          </div>
          <h1 className="text-2xl font-semibold text-surface-100 tracking-tight">设置主密码</h1>
          <p className="text-sm text-surface-400 mt-2 leading-relaxed">
            首次使用 Vault Keeper。<br />请设置一个强密码来保护您的敏感信息。
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {displayError && (
            <div className="flex items-center gap-2 p-3 rounded-[10px] bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={14} className="text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{displayError}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">
              主密码
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-[10px] bg-surface-800 border border-surface-600 text-surface-100 text-sm
                  placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-transparent
                  transition-all duration-200 pr-10"
                placeholder="至少 8 个字符"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <PasswordStrength password={password} />

          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">
              确认密码
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[10px] bg-surface-800 border border-surface-600 text-surface-100 text-sm
                placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-transparent
                transition-all duration-200"
              placeholder="再次输入主密码"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !password || !confirm}
            className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-[10px] bg-primary-500 text-white text-sm font-medium
              hover:bg-primary-400 active:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-primary-500/50
              transition-all duration-200 active:scale-[0.98]"
          >
            {isLoading ? '正在创建...' : '创建保险箱'}
          </button>
        </form>

        {/* Warning */}
        <div className="mt-6 p-3.5 rounded-[10px] bg-orange-500/10 border border-orange-500/20">
          <p className="text-orange-400 text-xs leading-relaxed">
            请务必牢记您的主密码。由于数据在本地加密存储，密码一旦丢失将无法找回。
          </p>
        </div>
      </div>
    </div>
  );
}

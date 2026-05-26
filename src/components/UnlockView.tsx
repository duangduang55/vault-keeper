import { useState } from 'react';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

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
    <div className="min-h-screen flex items-center justify-center bg-surface-950 p-6">
      <div className="w-full max-w-sm animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[14px] bg-primary-500/10 mb-5 mx-auto">
            <Shield className="w-8 h-8 text-primary-500" />
          </div>
          <h1 className="text-2xl font-semibold text-surface-100 tracking-tight">Vault Keeper</h1>
          <p className="text-sm text-surface-400 mt-2">输入主密码解锁保险箱</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-[10px] bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[10px] bg-surface-800 border border-surface-600 text-surface-100 text-sm
                placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-transparent
                transition-all duration-200 pr-10"
              placeholder="输入主密码"
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

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-[10px] bg-primary-500 text-white text-sm font-medium
              hover:bg-primary-400 active:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-primary-500/50
              transition-all duration-200 active:scale-[0.98]"
          >
            {isLoading ? '正在解锁...' : '解锁'}
          </button>
        </form>
      </div>
    </div>
  );
}

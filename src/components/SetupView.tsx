import { useState } from 'react';
import { Shield, Eye, EyeOff } from 'lucide-react';
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
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600/20 mb-4">
            <Shield className="w-8 h-8 text-primary-500" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100">设置主密码</h1>
          <p className="text-surface-400 text-sm mt-2">
            这是您首次使用 Vault Keeper。请设置一个强密码来保护您的敏感信息。
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {displayError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
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
                className="input-field pr-10"
                placeholder="至少 8 个字符"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
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
              className="input-field"
              placeholder="再次输入主密码"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !password || !confirm}
            className="btn-primary w-full"
          >
            {isLoading ? '正在创建...' : '创建保险箱'}
          </button>
        </form>

        {/* Warning */}
        <div className="mt-8 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-amber-400 text-xs leading-relaxed">
            请务必牢记您的主密码。由于数据在本地加密存储，密码一旦丢失将无法找回。
          </p>
        </div>
      </div>
    </div>
  );
}

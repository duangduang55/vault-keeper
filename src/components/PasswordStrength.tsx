import { useMemo } from 'react';

interface Props {
  password: string;
}

/** 计算密码强度 */
function evaluateStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) return { score: 1, label: '弱', color: 'bg-red-500' };
  if (score <= 3) return { score: 2, label: '一般', color: 'bg-amber-500' };
  if (score <= 4) return { score: 3, label: '强', color: 'bg-lime-500' };
  return { score: 4, label: '非常强', color: 'bg-green-500' };
}

export function PasswordStrength({ password }: Props) {
  const strength = useMemo(() => evaluateStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-colors ${
              level <= strength.score ? strength.color : 'bg-surface-700'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-surface-500">
        密码强度: <span className="font-medium">{strength.label}</span>
      </p>
    </div>
  );
}

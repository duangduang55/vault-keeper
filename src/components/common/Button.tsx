import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'danger' | 'secondary'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary-500 text-white hover:bg-primary-400 active:bg-primary-600',
  secondary:
    'bg-surface-800 text-surface-100 hover:bg-surface-700 active:bg-surface-600 border border-surface-600',
  ghost:
    'text-surface-300 hover:text-surface-100 hover:bg-surface-800 active:bg-surface-700',
  danger:
    'bg-red-500 text-white hover:bg-red-400 active:bg-red-600',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[10px] font-medium
        focus:outline-none focus:ring-2 focus:ring-primary-500/50
        disabled:opacity-40 disabled:cursor-not-allowed
        transition-all duration-200 ease-out active:scale-[0.97]
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

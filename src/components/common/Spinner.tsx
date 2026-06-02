interface SpinnerProps {
  size?: number
  className?: string
}

export function Spinner({ size = 20, className = '' }: SpinnerProps) {
  return (
    <div
      className={`border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

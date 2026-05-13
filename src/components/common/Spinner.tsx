interface SpinnerProps {
  size?: number
  className?: string
}

export function Spinner({ size = 24, className = '' }: SpinnerProps) {
  return (
    <div
      className={`border-2 border-primary-500 border-t-transparent rounded-full animate-spin ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

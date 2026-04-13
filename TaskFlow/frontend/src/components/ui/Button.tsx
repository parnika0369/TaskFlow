import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  loading?: boolean
}

export default function Button({
  variant = 'primary',
  size,
  loading,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-400 disabled:opacity-50 ${variant === 'danger' ? 'text-red-600' : ''} ${className}`}
      {...props}
    >
      {loading && <span>...</span>}
      {children}
    </button>
  )
}

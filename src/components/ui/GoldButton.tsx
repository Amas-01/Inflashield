'use client'

import { ReactNode } from 'react'

interface GoldButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

export default function GoldButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  size = 'md',
  className = '',
  type = 'button',
}: GoldButtonProps) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-8 py-4 text-base',
    lg: 'px-10 py-5 text-lg',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      data-cursor="gold"
      className={`
        relative overflow-hidden
        bg-gradient-to-br from-gold-500 to-gold-400
        text-[#080F1C] font-urbanist font-semibold
        rounded-xl
        transition-all duration-150
        ${!disabled && !loading ? 'hover:brightness-110 hover:scale-[1.01] active:scale-[0.98]' : ''}
        ${disabled || loading ? 'opacity-40 pointer-events-none' : ''}
        ${sizeClasses[size]}
        focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1
        ${className}
      `}
    >
      {/* Shimmer effect */}
      {!loading && !disabled && (
        <span className="absolute inset-0 overflow-hidden rounded-xl">
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent shimmer-animation" />
        </span>
      )}

      {/* Content */}
      <span className="relative z-10">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </span>
        ) : (
          children
        )}
      </span>

      <style jsx>{`
        .shimmer-animation {
          animation: shimmer 3s linear infinite;
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </button>
  )
}

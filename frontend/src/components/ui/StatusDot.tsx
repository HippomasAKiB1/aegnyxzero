import React from 'react'

interface StatusDotProps {
  live?: boolean
  className?: string
}

export const StatusDot: React.FC<StatusDotProps> = ({
  live = true,
  className = '',
}) => {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
        live
          ? 'bg-[var(--text-primary)] animate-pulse-dot shadow-[0_0_6px_rgba(245,245,247,0.6)]'
          : 'bg-[var(--text-disabled)]'
      } ${className}`}
      aria-hidden="true"
    />
  )
}

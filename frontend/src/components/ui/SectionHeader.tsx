import React from 'react'

interface SectionHeaderProps {
  title: string
  action?: React.ReactNode
  className?: string
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex items-center justify-between pb-2 mb-3 border-b border-[var(--border-subtle)] ${className}`}
    >
      <span className="text-[11px] uppercase tracking-[0.08em] font-medium text-[var(--text-tertiary)] select-none">
        {title}
      </span>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}

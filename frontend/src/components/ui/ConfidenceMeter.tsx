import React from 'react'

interface ConfidenceMeterProps {
  level?: string
  score?: number
  showLabel?: boolean
  className?: string
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({
  level,
  score,
  showLabel = true,
  className = '',
}) => {
  let filledBars = 1
  let labelText = 'Low'

  const normalized = (level || '').trim().toLowerCase()

  if (normalized === 'high' || (score !== undefined && score >= 0.75)) {
    filledBars = 3
    labelText = 'High'
  } else if (normalized === 'medium' || normalized === 'med' || (score !== undefined && score >= 0.4)) {
    filledBars = 2
    labelText = 'Med'
  } else {
    filledBars = 1
    labelText = 'Low'
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={`Confidence: ${labelText}`}
    >
      <div className="flex items-center gap-[2px] h-3" aria-hidden="true">
        <span
          className={`w-1 rounded-[1px] transition-colors ${
            filledBars >= 1 ? 'h-2.5 bg-[var(--text-primary)]' : 'h-2 bg-white/[0.12]'
          }`}
        />
        <span
          className={`w-1 rounded-[1px] transition-colors ${
            filledBars >= 2 ? 'h-2.5 bg-[var(--text-primary)]' : 'h-2 bg-white/[0.12]'
          }`}
        />
        <span
          className={`w-1 rounded-[1px] transition-colors ${
            filledBars >= 3 ? 'h-2.5 bg-[var(--text-primary)]' : 'h-2 bg-white/[0.12]'
          }`}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-[var(--text-secondary)] select-none">
          {labelText}
        </span>
      )}
    </div>
  )
}

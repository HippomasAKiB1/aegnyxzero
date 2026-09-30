import React from 'react'

interface BandBadgeProps {
  band: string | null
  className?: string
}

export const BandBadge: React.FC<BandBadgeProps> = ({ band, className = '' }) => {
  if (!band) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-[var(--text-tertiary)] italic ${className}`}>
        No Band
      </span>
    )
  }

  const normalized = band.trim().toLowerCase()

  if (normalized === 'severe') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}
        style={{
          backgroundColor: 'rgba(240, 82, 74, 0.12)',
          borderColor: 'rgba(240, 82, 74, 0.35)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Square glyph */}
        <span
          className="inline-block w-2 h-2 shrink-0 rounded-[1px]"
          style={{ backgroundColor: 'var(--risk-severe)' }}
        />
        <span>Severe</span>
      </span>
    )
  }

  if (normalized === 'high') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}
        style={{
          backgroundColor: 'rgba(255, 107, 26, 0.12)',
          borderColor: 'rgba(255, 107, 26, 0.35)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Triangle glyph */}
        <svg width="8" height="8" viewBox="0 0 8 8" className="shrink-0" fill="none">
          <polygon points="4,1 7.5,7 0.5,7" fill="var(--risk-high)" />
        </svg>
        <span>High</span>
      </span>
    )
  }

  if (normalized === 'moderate') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}
        style={{
          backgroundColor: 'rgba(232, 193, 74, 0.12)',
          borderColor: 'rgba(232, 193, 74, 0.35)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Diamond glyph */}
        <svg width="8" height="8" viewBox="0 0 8 8" className="shrink-0" fill="none">
          <polygon points="4,0.5 7.5,4 4,7.5 0.5,4" fill="var(--risk-mod)" />
        </svg>
        <span>Moderate</span>
      </span>
    )
  }

  if (normalized === 'low') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}
        style={{
          backgroundColor: 'rgba(92, 200, 232, 0.12)',
          borderColor: 'rgba(92, 200, 232, 0.35)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Circle glyph */}
        <span
          className="inline-block w-2 h-2 shrink-0 rounded-full"
          style={{ backgroundColor: 'var(--risk-low)' }}
        />
        <span>Low</span>
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border border-[var(--border-default)] text-[var(--text-secondary)] ${className}`}>
      {band}
    </span>
  )
}

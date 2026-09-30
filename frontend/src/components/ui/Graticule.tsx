import React from 'react'

interface GraticuleProps {
  min?: number
  max?: number
  step?: number
  ticks?: number
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export const Graticule: React.FC<GraticuleProps> = ({
  min = 0,
  max = 100,
  step = 1,
  ticks,
  className = '',
  orientation = 'horizontal',
}) => {
  const totalTicks = ticks ?? Math.min(50, Math.max(5, Math.round((max - min) / step)))

  if (orientation === 'vertical') {
    return (
      <div className={`relative w-2 flex flex-col justify-between select-none pointer-events-none ${className}`}>
        {Array.from({ length: totalTicks + 1 }).map((_, i) => {
          const isMajor = i % 5 === 0
          return (
            <div
              key={i}
              className={`h-[1px] ${
                isMajor
                  ? 'w-2 bg-[var(--border-strong)]'
                  : 'w-1 bg-[var(--border-default)]'
              }`}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className={`relative h-2 w-full flex justify-between items-start select-none pointer-events-none ${className}`}>
      {Array.from({ length: totalTicks + 1 }).map((_, i) => {
        const isMajor = i % 5 === 0
        return (
          <div
            key={i}
            className={`w-[1px] ${
              isMajor
                ? 'h-2 bg-[var(--border-strong)]'
                : 'h-1 bg-[var(--border-default)]'
            }`}
          />
        )
      })}
    </div>
  )
}

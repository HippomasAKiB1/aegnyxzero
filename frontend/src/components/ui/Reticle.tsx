import React from 'react'

interface ReticleProps {
  size?: number
  className?: string
  pulse?: boolean
}

export const Reticle: React.FC<ReticleProps> = ({
  size = 18,
  className = '',
  pulse = true,
}) => {
  const center = size / 2
  const circleRadius = size * 0.28
  const crosshairLen = size * 0.18

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${pulse ? 'animate-pulse-sphere' : ''} ${className}`}
      aria-hidden="true"
    >
      {/* Center circle */}
      <circle
        cx={center}
        cy={center}
        r={circleRadius}
        stroke="var(--ember)"
        strokeWidth="1.25"
        fill="var(--ember-muted)"
      />
      {/* Top tick */}
      <line
        x1={center}
        y1={center - circleRadius - crosshairLen}
        x2={center}
        y2={center - circleRadius}
        stroke="var(--ember)"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      {/* Bottom tick */}
      <line
        x1={center}
        y1={center + circleRadius}
        x2={center}
        y2={center + circleRadius + crosshairLen}
        stroke="var(--ember)"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      {/* Left tick */}
      <line
        x1={center - circleRadius - crosshairLen}
        y1={center}
        x2={center - circleRadius}
        y2={center}
        stroke="var(--ember)"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      {/* Right tick */}
      <line
        x1={center + circleRadius}
        y1={center}
        x2={center + circleRadius + crosshairLen}
        y2={center}
        stroke="var(--ember)"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  )
}

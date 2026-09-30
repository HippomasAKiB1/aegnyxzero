import React from 'react'
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

export interface ValidationRowProps {
  id: string
  name?: string
  status: 'pass' | 'warn' | 'fail' | string
  message?: string
  className?: string
}

export const ValidationRow: React.FC<ValidationRowProps> = ({
  id,
  name,
  status,
  message,
  className = '',
}) => {
  const norm = status.toLowerCase()
  const isPass = norm === 'pass' || norm === 'passed'
  const isWarn = norm === 'warn' || norm === 'warning'

  const icon = isPass ? (
    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[var(--check-pass)]" />
  ) : isWarn ? (
    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[var(--check-warn)]" />
  ) : (
    <XCircle className="w-3.5 h-3.5 shrink-0 text-[var(--check-fail)]" />
  )

  return (
    <div
      className={`flex items-start justify-between gap-3 p-2 rounded-[4px] bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-xs ${className}`}
    >
      <div className="flex items-start gap-2 min-w-0">
        <span className="mt-0.5">{icon}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="font-semibold text-[var(--text-primary)]">{id}</span>
            {name && <span className="text-[var(--text-secondary)] font-sans">· {name}</span>}
          </div>
          {message && (
            <p className="text-[var(--text-secondary)] text-[12px] mt-0.5 leading-snug">
              {message}
            </p>
          )}
        </div>
      </div>
      <span
        className={`font-mono text-[11px] uppercase tracking-wide px-1.5 py-0.5 rounded-[3px] shrink-0 ${
          isPass
            ? 'text-[var(--check-pass)] bg-[var(--check-pass)]/10'
            : isWarn
            ? 'text-[var(--check-warn)] bg-[var(--check-warn)]/10'
            : 'text-[var(--check-fail)] bg-[var(--check-fail)]/10'
        }`}
      >
        {status}
      </span>
    </div>
  )
}

export interface ValidationPillProps {
  id: string
  status: 'pass' | 'warn' | 'fail' | string
  message?: string
  className?: string
}

export const ValidationPill: React.FC<ValidationPillProps> = ({
  id,
  status,
  message,
  className = '',
}) => {
  const norm = status.toLowerCase()
  const isPass = norm === 'pass' || norm === 'passed'
  const isWarn = norm === 'warn' || norm === 'warning'

  const icon = isPass ? (
    <CheckCircle2 className="w-3 h-3 text-[var(--check-pass)]" />
  ) : isWarn ? (
    <AlertTriangle className="w-3 h-3 text-[var(--check-warn)]" />
  ) : (
    <XCircle className="w-3 h-3 text-[var(--check-fail)]" />
  )

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-inset)] text-xs font-mono ${className}`}
      title={message || `${id}: ${status}`}
    >
      {icon}
      <span className="text-[var(--text-primary)] font-medium">{id}</span>
    </div>
  )
}

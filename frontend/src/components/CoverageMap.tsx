import React from 'react'
import { Reticle, SectionHeader } from './ui'
import type { CoverageData, UserConditions } from '../types'

interface CoverageMapProps {
  coverage: CoverageData | null
  conditions?: UserConditions
}

export const CoverageMap: React.FC<CoverageMapProps> = ({ coverage }) => {
  if (!coverage) {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] p-6 text-center text-xs text-[var(--text-tertiary)] flex items-center justify-center gap-2">
        <Reticle size={14} />
        <span>Loading coverage matrix...</span>
      </div>
    )
  }

  const {
    grid,
    o2_labels,
    p_labels,
    gap_percentage,
    closeness_statement,
  } = coverage

  const maxCount = Math.max(1, ...grid.map((c) => c.count))

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] p-3.5 space-y-3">
      {/* Panel Header */}
      <SectionHeader
        title="Parameter Space Coverage Map"
        action={
          <span className="font-mono text-xs text-[var(--text-secondary)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-[4px] bg-[var(--bg-inset)]">
            {gap_percentage}% Untested Gap
          </span>
        }
      />

      {/* Closeness statement */}
      <div className="p-2.5 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-inset)] text-xs flex items-center gap-2">
        <Reticle size={14} pulse={false} />
        <p className="text-[var(--text-secondary)] leading-snug truncate">
          {closeness_statement}
        </p>
      </div>

      {/* 5x5 Grid Table */}
      <div className="overflow-x-auto pt-1">
        <table className="w-full text-center text-xs border-collapse select-none">
          <thead>
            <tr>
              <th className="p-1.5 text-left font-mono text-xs text-[var(--text-tertiary)] font-medium border-b border-[var(--border-default)]">
                P \ O₂
              </th>
              {o2_labels.map((o2) => (
                <th
                  key={o2}
                  className="p-1.5 font-mono text-xs font-medium text-[var(--text-tertiary)] border-b border-[var(--border-default)]"
                >
                  {o2}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p_labels.map((p) => {
              return (
                <tr key={p}>
                  <td className="p-1.5 text-left font-mono text-xs text-[var(--text-tertiary)] whitespace-nowrap border-r border-[var(--border-subtle)]">
                    {p}
                  </td>
                  {o2_labels.map((o2) => {
                    const cell = grid.find((c) => c.p_bin === p && c.o2_bin === o2)
                    const count = cell ? cell.count : 0
                    const isUserCell = cell ? cell.has_user_condition : false

                    // Scaled alpha by sqrt(count / maxCount), clamped to floor 0.25
                    const alpha =
                      count > 0
                        ? Math.max(0.25, Math.min(1.0, Math.sqrt(count / maxCount)))
                        : 0

                    const isHighDensity = alpha >= 0.55

                    return (
                      <td key={o2} className="p-[2px]">
                        <div
                          className="relative h-10 w-full rounded-none border border-[var(--border-subtle)] flex flex-col items-center justify-center transition-colors"
                          style={{
                            backgroundColor:
                              count > 0
                                ? `rgba(var(--density), ${alpha})`
                                : 'rgba(255, 255, 255, 0.02)',
                            color:
                              count === 0
                                ? 'var(--text-disabled)'
                                : isHighDensity
                                ? '#0B0B0D'
                                : 'var(--text-primary)',
                          }}
                          title={`${o2} O₂ at ${p}: ${count} experiments ${
                            isUserCell ? '(Active Condition)' : ''
                          }`}
                        >
                          {/* Reticle for active condition: the only orange object */}
                          {isUserCell && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <Reticle size={24} />
                            </div>
                          )}

                          <span className="font-mono text-xs font-semibold z-10">
                            {count > 0 ? count : '—'}
                          </span>
                          <span
                            className="text-[10px] font-mono leading-none z-10"
                            style={{
                              opacity: count > 0 ? (isHighDensity ? 0.8 : 0.6) : 0.4,
                            }}
                          >
                            {count === 1 ? 'run' : count > 1 ? 'runs' : 'gap'}
                          </span>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Grid Legend: ramp from 0 runs to max */}
      <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between text-xs font-mono text-[var(--text-tertiary)] gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-none bg-white/[0.02] border border-[var(--border-subtle)]" />
            <span>0</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-none border border-[var(--border-subtle)]"
              style={{ backgroundColor: 'rgba(var(--density), 0.25)' }}
            />
            <span>low</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-none border border-[var(--border-subtle)]"
              style={{ backgroundColor: 'rgba(var(--density), 0.60)' }}
            />
            <span>med</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-none border border-[var(--border-subtle)]"
              style={{ backgroundColor: 'rgba(var(--density), 0.95)' }}
            />
            <span>max ({maxCount})</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[var(--text-secondary)] font-medium">
          <Reticle size={12} pulse={false} />
          <span>Active Condition</span>
        </div>
      </div>
    </div>
  )
}

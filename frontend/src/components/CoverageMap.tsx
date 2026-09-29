import React from 'react'
import { Grid, AlertTriangle, Crosshair } from 'lucide-react'
import type { CoverageData, UserConditions } from '../types'

interface CoverageMapProps {
  coverage: CoverageData | null
  conditions?: UserConditions
}

export const CoverageMap: React.FC<CoverageMapProps> = ({ coverage }) => {
  if (!coverage) {
    return (
      <div className="bg-card/70 border border-border rounded-xl p-5 text-center text-xs text-muted-foreground">
        Loading coverage matrix...
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

  const getCellBg = (count: number) => {
    if (count === 0) {
      return 'bg-secondary/20 border-border/40 text-muted-foreground/40'
    }
    if (count <= 2) {
      return 'bg-cyan-950/40 border-cyan-800/50 text-cyan-300 font-medium'
    }
    if (count <= 5) {
      return 'bg-cyan-600/20 border-cyan-500/60 text-cyan-200 font-semibold'
    }
    return 'bg-amber-500/25 border-amber-500/70 text-amber-200 font-bold'
  }

  return (
    <div className="bg-card/70 border border-border rounded-xl backdrop-blur-sm shadow-sm overflow-hidden flex flex-col p-4 lg:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/80">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Grid className="h-4 w-4 text-cyan-400" />
            <span>Parameter Space Coverage Map</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Identify untested experimental regimes where microgravity fire risk is unmeasured.
          </p>
        </div>

        {/* Gap Statistics Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-mono">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span>{gap_percentage}% Untested Gap</span>
          </div>
        </div>
      </div>

      {/* Closeness Alert Banner (US-5 AC2) */}
      <div className="mt-3 p-3 rounded-lg border border-border/70 bg-secondary/30 text-xs flex items-start gap-2.5">
        <Crosshair className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-semibold text-foreground">Regime Assessment: </span>
          <span className="text-muted-foreground">{closeness_statement}</span>
        </div>
      </div>

      {/* 5x5 Grid Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-center text-xs border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left font-mono text-[10px] text-muted-foreground uppercase border-b border-border/50">
                Pressure \ O₂
              </th>
              {o2_labels.map((o2) => (
                <th
                  key={o2}
                  className="p-2 font-mono text-[11px] font-semibold text-foreground border-b border-border/50"
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
                  <td className="p-2 text-left font-mono text-[11px] font-semibold text-muted-foreground whitespace-nowrap border-r border-border/40">
                    {p}
                  </td>
                  {o2_labels.map((o2) => {
                    const cell = grid.find((c) => c.p_bin === p && c.o2_bin === o2)
                    const count = cell ? cell.count : 0
                    const isUserCell = cell ? cell.has_user_condition : false

                    return (
                      <td key={o2} className="p-1">
                        <div
                          className={`relative h-11 rounded-lg border flex flex-col items-center justify-center transition-all ${getCellBg(
                            count
                          )} ${
                            isUserCell
                              ? 'ring-2 ring-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.4)] z-10 scale-105'
                              : ''
                          }`}
                          title={`${o2} O2 at ${p}: ${count} experiments ${
                            isUserCell ? '(Active Condition)' : ''
                          }`}
                        >
                          {isUserCell && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
                            </span>
                          )}

                          <span className="font-mono text-xs">
                            {count > 0 ? count : '—'}
                          </span>
                          <span className="text-[9px] opacity-75 font-mono">
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

      {/* Grid Legend */}
      <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-secondary/20 border border-border/40" />
            <span>0 runs (Data Gap)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-cyan-950/40 border border-cyan-800/50" />
            <span>1–2 runs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-cyan-600/20 border border-cyan-500/60" />
            <span>3–5 runs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-amber-500/25 border border-amber-500/70" />
            <span>6+ runs</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-orange-400 font-medium">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          <span>Active Habitat Condition</span>
        </div>
      </div>
    </div>
  )
}

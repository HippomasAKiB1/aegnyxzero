import React, { useState } from 'react'
import {
  ShieldAlert,
  Flame,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  Info,
  CheckSquare,
  Square,
} from 'lucide-react'
import type { MaterialRanking } from '../types'

interface RankedTableProps {
  rankings: MaterialRanking[]
  selectedMaterial: string | null
  onSelectMaterial: (name: string) => void
  chartMaterials: string[]
  onToggleChartMaterial: (name: string) => void
  onOpenFormula: () => void
}

export const RankedTable: React.FC<RankedTableProps> = ({
  rankings,
  selectedMaterial,
  onSelectMaterial,
  chartMaterials,
  onToggleChartMaterial,
  onOpenFormula,
}) => {
  const [sortField, setSortField] = useState<'rank' | 'score' | 'name' | 'confidence'>('rank')
  const [sortAsc, setSortAsc] = useState(true)

  const sufficient = rankings.filter((r) => !r.insufficient_evidence)
  const insufficient = rankings.filter((r) => r.insufficient_evidence)

  const sortedSufficient = [...sufficient].sort((a, b) => {
    if (sortField === 'rank') {
      return sortAsc ? a.rank - b.rank : b.rank - a.rank
    }
    if (sortField === 'score') {
      const sA = a.score ?? -1
      const sB = b.score ?? -1
      return sortAsc ? sB - sA : sA - sB // default high score first
    }
    if (sortField === 'name') {
      return sortAsc
        ? a.material_name.localeCompare(b.material_name)
        : b.material_name.localeCompare(a.material_name)
    }
    if (sortField === 'confidence') {
      const order: Record<string, number> = { High: 3, Medium: 2, Low: 1, None: 0 }
      const cA = order[a.confidence] ?? 0
      const cB = order[b.confidence] ?? 0
      return sortAsc ? cB - cA : cA - cB
    }
    return 0
  })

  const handleSort = (field: 'rank' | 'score' | 'name' | 'confidence') => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const getBandBadge = (band: string | null) => {
    switch (band) {
      case 'Severe':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
            <Flame className="h-3 w-3 text-red-400 animate-pulse" />
            <span>Severe</span>
          </span>
        )
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/30">
            <ShieldAlert className="h-3 w-3 text-orange-400" />
            <span>High</span>
          </span>
        )
      case 'Moderate':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="h-3 w-3 text-amber-300" />
            <span>Moderate</span>
          </span>
        )
      case 'Low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="h-3 w-3 text-emerald-400" />
            <span>Low</span>
          </span>
        )
      default:
        return (
          <span className="text-xs text-muted-foreground italic">N/A</span>
        )
    }
  }

  const getConfidenceBadge = (conf: string) => {
    switch (conf) {
      case 'High':
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
            title="≥ 3 distinct NASA investigations verify this regime"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span>High Conf</span>
          </span>
        )
      case 'Medium':
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30"
            title="2 distinct investigations support this result"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            <span>Med Conf</span>
          </span>
        )
      case 'Low':
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30"
            title="1 investigation only — corroboration required"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
            <span>Low Conf</span>
          </span>
        )
      default:
        return (
          <span className="text-[11px] text-muted-foreground">None</span>
        )
    }
  }

  return (
    <div className="bg-card/70 border border-border rounded-xl backdrop-blur-sm shadow-sm overflow-hidden flex flex-col">
      {/* Table Title and Controls */}
      <div className="p-4 lg:p-5 border-b border-border/80 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
              <span>Flammability Risk Ranking</span>
              <span className="text-xs font-mono font-normal text-muted-foreground">
                ({sufficient.length} ranked materials)
              </span>
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Transparent relative scoring computed by deterministic pure-Python engine.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenFormula}
            className="text-xs text-orange-400/90 hover:text-orange-300 flex items-center gap-1 font-medium transition underline-offset-2 hover:underline"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>How is this calculated?</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-xs">
          <thead className="bg-secondary/40 text-muted-foreground border-b border-border text-[11px] uppercase tracking-wider select-none font-semibold">
            <tr>
              <th className="py-3 px-3 w-10 text-center">Plot</th>
              <th
                onClick={() => handleSort('rank')}
                className="py-3 px-3 cursor-pointer hover:text-foreground transition w-14"
              >
                #
              </th>
              <th
                onClick={() => handleSort('name')}
                className="py-3 px-4 cursor-pointer hover:text-foreground transition"
              >
                Material
              </th>
              <th
                onClick={() => handleSort('score')}
                className="py-3 px-4 cursor-pointer hover:text-foreground transition w-44"
              >
                Risk Score
              </th>
              <th className="py-3 px-3">Band</th>
              <th
                onClick={() => handleSort('confidence')}
                className="py-3 px-3 cursor-pointer hover:text-foreground transition"
              >
                Confidence
              </th>
              <th className="py-3 px-3 text-center">Runs</th>
              <th className="py-3 px-3 text-center">Sources</th>
              <th className="py-3 px-4 text-right">Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {sortedSufficient.map((mat) => {
              const isSelected = selectedMaterial === mat.material_name
              const isCharted = chartMaterials.includes(mat.material_name)
              const scoreVal = mat.score ?? 0

              return (
                <tr
                  key={mat.material_name}
                  onClick={() => onSelectMaterial(mat.material_name)}
                  className={`group cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-orange-500/10 hover:bg-orange-500/15'
                      : 'hover:bg-secondary/30'
                  }`}
                >
                  {/* Chart Checkbox */}
                  <td
                    className="py-3 px-3 text-center"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleChartMaterial(mat.material_name)
                    }}
                  >
                    <button
                      className="text-muted-foreground hover:text-orange-400 transition"
                      title={isCharted ? 'Remove from charts' : 'Compare on charts'}
                    >
                      {isCharted ? (
                        <CheckSquare className="h-4 w-4 text-orange-400" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground/60" />
                      )}
                    </button>
                  </td>

                  {/* Rank */}
                  <td className="py-3 px-3 font-mono font-bold text-muted-foreground group-hover:text-foreground">
                    #{mat.rank}
                  </td>

                  {/* Material Name */}
                  <td className="py-3 px-4 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <span className="group-hover:text-orange-400 transition">
                        {mat.material_name}
                      </span>
                    </div>
                  </td>

                  {/* Score bar */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-xs w-8 text-foreground">
                        {scoreVal.toFixed(1)}
                      </span>
                      <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            scoreVal >= 75
                              ? 'bg-gradient-to-r from-red-600 to-red-500'
                              : scoreVal >= 50
                              ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                              : scoreVal >= 25
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          }`}
                          style={{ width: `${scoreVal}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Band */}
                  <td className="py-3 px-3">{getBandBadge(mat.band)}</td>

                  {/* Confidence */}
                  <td className="py-3 px-3">{getConfidenceBadge(mat.confidence)}</td>

                  {/* Supporting Experiments count */}
                  <td className="py-3 px-3 text-center font-mono text-muted-foreground">
                    {mat.num_experiments}
                  </td>

                  {/* Distinct Sources count */}
                  <td className="py-3 px-3 text-center font-mono text-muted-foreground">
                    {mat.num_sources}
                  </td>

                  {/* Action / Inspect */}
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectMaterial(mat.material_name)
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-400 group-hover:text-orange-300 transition"
                    >
                      <span>Inspect</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Insufficient Evidence Section (US-2 AC3, FR-4) */}
      {insufficient.length > 0 && (
        <div className="p-4 bg-muted/20 border-t border-border/80 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Insufficient Evidence (Σ w_i &lt; 1.0)</span>
            <span className="text-[10px] text-muted-foreground/75 font-normal">
              — Zero hallucination rule: no score assigned when data is too sparse
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {insufficient.map((m) => (
              <div
                key={m.material_name}
                onClick={() => onSelectMaterial(m.material_name)}
                className="cursor-pointer border border-dashed border-border p-2.5 rounded-lg bg-card/40 hover:bg-card hover:border-border/80 transition"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{m.material_name}</span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                    No Score
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                  {m.confidence_reasons[0] || 'No experiments within proximity tolerance'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

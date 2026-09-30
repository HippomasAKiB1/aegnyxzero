import React, { useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  HelpCircle,
  Check,
} from 'lucide-react'
import { BandBadge, ConfidenceMeter, SectionHeader, Reticle } from './ui'
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

  const renderSortChevron = (field: 'rank' | 'score' | 'name' | 'confidence') => {
    if (sortField !== field) {
      return <span className="w-3 h-3 inline-block opacity-0 group-hover:opacity-40">↓</span>
    }
    return sortAsc ? (
      <ChevronUp className="w-3 h-3 text-[var(--text-primary)]" />
    ) : (
      <ChevronDown className="w-3 h-3 text-[var(--text-primary)]" />
    )
  }

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] p-3.5 space-y-3">
      {/* Panel Header */}
      <SectionHeader
        title={`Flammability Risk Ranking (${sufficient.length} materials)`}
        action={
          <button
            onClick={onOpenFormula}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Score Formula</span>
          </button>
        }
      />

      {/* Table Canvas */}
      <div className="overflow-x-auto border-t border-[var(--border-subtle)]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-default)] select-none">
              <th className="py-2 px-2.5 w-8 text-center text-xs font-medium text-[var(--text-tertiary)]">
                Plot
              </th>
              <th className="py-2 px-2.5 w-12">
                <button
                  onClick={() => handleSort('rank')}
                  className={`group flex items-center gap-1 text-xs font-medium focus-visible:outline-none ${
                    sortField === 'rank' ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <span>#</span>
                  {renderSortChevron('rank')}
                </button>
              </th>
              <th className="py-2 px-3">
                <button
                  onClick={() => handleSort('name')}
                  className={`group flex items-center gap-1 text-xs font-medium focus-visible:outline-none ${
                    sortField === 'name' ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <span>Material</span>
                  {renderSortChevron('name')}
                </button>
              </th>
              <th className="py-2 px-3 w-40 text-right">
                <button
                  onClick={() => handleSort('score')}
                  className={`group inline-flex items-center gap-1 text-xs font-medium focus-visible:outline-none ${
                    sortField === 'score' ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <span>Risk Score</span>
                  {renderSortChevron('score')}
                </button>
              </th>
              <th className="py-2 px-3 text-xs font-medium text-[var(--text-tertiary)]">Band</th>
              <th className="py-2 px-3">
                <button
                  onClick={() => handleSort('confidence')}
                  className={`group flex items-center gap-1 text-xs font-medium focus-visible:outline-none ${
                    sortField === 'confidence' ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <span>Confidence</span>
                  {renderSortChevron('confidence')}
                </button>
              </th>
              <th className="py-2 px-2.5 text-right font-mono text-xs font-medium text-[var(--text-tertiary)]">
                Runs
              </th>
              <th className="py-2 px-2.5 text-right font-mono text-xs font-medium text-[var(--text-tertiary)]">
                Sources
              </th>
              <th className="py-2 px-3 text-right text-xs font-medium text-[var(--text-tertiary)]">
                Inspect
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedSufficient.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-xs text-[var(--text-tertiary)]">
                  <div className="flex items-center justify-center gap-2">
                    <Reticle size={16} pulse={false} />
                    <span>No ranked materials match current criteria.</span>
                  </div>
                </td>
              </tr>
            ) : (
              sortedSufficient.map((mat) => {
              const isSelected = selectedMaterial === mat.material_name
              const isCharted = chartMaterials.includes(mat.material_name)
              const scoreVal = mat.score ?? 0

              return (
                <tr
                  key={mat.material_name}
                  onClick={() => onSelectMaterial(mat.material_name)}
                  className={`group h-9 cursor-pointer border-b border-[rgba(255,255,255,0.05)] text-[13px] transition-all duration-150 select-none ${
                    isSelected
                      ? 'bg-[var(--chrome-active-bg)] shadow-[inset_2px_0_0_var(--text-primary)]'
                      : 'hover:bg-[var(--bg-elevated)] hover:shadow-[inset_2px_0_0_var(--border-strong)]'
                  }`}
                >
                  {/* Plot checkbox */}
                  <td
                    className="py-1 px-2.5 text-center"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleChartMaterial(mat.material_name)
                    }}
                  >
                    <button
                      className={`w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center transition-colors ${
                        isCharted
                          ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-canvas)]'
                          : 'border-[var(--border-default)] hover:border-[var(--text-secondary)] bg-transparent'
                      }`}
                      title={isCharted ? 'Remove from chart comparison' : 'Compare on charts'}
                    >
                      {isCharted && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  </td>

                  {/* Rank */}
                  <td className="py-1 px-2.5 font-mono text-xs text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]">
                    #{mat.rank}
                  </td>

                  {/* Material Name */}
                  <td className="py-1 px-3 font-medium text-[var(--text-primary)]">
                    <span>{mat.material_name}</span>
                  </td>

                  {/* Risk Score: mono 14px/600 right-aligned + 3px bar on fixed 0-100 scale */}
                  <td className="py-1 px-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-sm font-semibold w-8 text-right text-[var(--text-primary)]">
                        {scoreVal.toFixed(1)}
                      </span>
                      <div className="relative flex-1 h-[3px] bg-white/[0.08] rounded-none overflow-hidden">
                        {/* Hairline threshold marks at 25%, 50%, 75% */}
                        <span className="absolute top-0 bottom-0 left-[25%] w-[1px] bg-[var(--border-strong)] z-10" />
                        <span className="absolute top-0 bottom-0 left-[50%] w-[1px] bg-[var(--border-strong)] z-10" />
                        <span className="absolute top-0 bottom-0 left-[75%] w-[1px] bg-[var(--border-strong)] z-10" />
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(0, scoreVal))}%`,
                            backgroundColor:
                              scoreVal >= 75
                                ? 'var(--risk-severe)'
                                : scoreVal >= 50
                                ? 'var(--risk-high)'
                                : scoreVal >= 25
                                ? 'var(--risk-mod)'
                                : 'var(--risk-low)',
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Band */}
                  <td className="py-1 px-3">
                    <BandBadge band={mat.band} />
                  </td>

                  {/* Confidence */}
                  <td className="py-1 px-3">
                    <ConfidenceMeter level={mat.confidence} />
                  </td>

                  {/* Supporting Experiments count */}
                  <td className="py-1 px-2.5 text-right font-mono text-xs text-[var(--text-secondary)]">
                    {mat.num_experiments}
                  </td>

                  {/* Distinct Sources count */}
                  <td className="py-1 px-2.5 text-right font-mono text-xs text-[var(--text-secondary)]">
                    {mat.num_sources}
                  </td>

                  {/* Action / Inspect */}
                  <td className="py-1 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectMaterial(mat.material_name)
                      }}
                      className="inline-flex items-center gap-0.5 text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors"
                    >
                      <span>Inspect</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              )
            })
          )}
          </tbody>
        </table>
      </div>

      {/* Insufficient Evidence Section (FR-4) */}
      {insufficient.length > 0 && (
        <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2 opacity-60">
          <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-tertiary)]">
            <AlertTriangle className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            <span>Insufficient Evidence (Σ w_i &lt; 1.0)</span>
            <span className="text-[var(--text-disabled)] italic font-sans">
              — Zero hallucination rule: no score assigned
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {insufficient.map((m) => (
              <div
                key={m.material_name}
                onClick={() => onSelectMaterial(m.material_name)}
                className="cursor-pointer border border-[var(--border-subtle)] p-2 rounded-[4px] bg-[var(--bg-inset)] hover:border-[var(--border-default)] transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--text-primary)]">{m.material_name}</span>
                  <span className="text-[11px] font-mono text-[var(--text-disabled)] uppercase">
                    No Score
                  </span>
                </div>
                <p className="text-[12px] text-[var(--text-tertiary)] italic mt-1 line-clamp-1">
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

import React, { useState } from 'react'
import { Info } from 'lucide-react'
import { SectionHeader } from './ui'
import type { Experiment } from '../types'

interface ComparisonChartsProps {
  experiments: Experiment[]
  selectedMaterials: string[]
}

const MATERIAL_COLORS: Record<string, { color: string; glyph: 'circle' | 'diamond' | 'triangle' | 'square' }> = {
  'PMMA (cast acrylic)': { color: 'var(--risk-severe)', glyph: 'square' },
  'SIBAL fabric': { color: 'var(--risk-severe)', glyph: 'square' },
  'Delrin (POM)': { color: 'var(--risk-severe)', glyph: 'square' },
  'Nomex HT90-40': { color: 'var(--risk-high)', glyph: 'triangle' },
  'Cellulose Kimwipes': { color: 'var(--risk-mod)', glyph: 'diamond' },
  'Polycarbonate (Lexan)': { color: 'var(--risk-mod)', glyph: 'diamond' },
  'Kapton (Polyimide)': { color: 'var(--risk-low)', glyph: 'circle' },
  'Silicone Elastomer (RTV)': { color: 'var(--risk-low)', glyph: 'circle' },
}

export const ComparisonCharts: React.FC<ComparisonChartsProps> = ({
  experiments,
  selectedMaterials,
}) => {
  const [activeTab, setActiveTab] = useState<'o2' | 'flow'>('o2')
  const [hoveredPoint, setHoveredPoint] = useState<{
    exp: Experiment
    x: number
    y: number
  } | null>(null)

  // Filter experiments matching selected materials with valid spread rate
  const validExps = experiments.filter(
    (e) =>
      selectedMaterials.includes(e.material_name) &&
      e.spread_rate_mm_s !== undefined &&
      e.spread_rate_mm_s !== null
  )

  // Chart dimensions
  const width = 800
  const height = 240
  const padding = { top: 24, right: 32, bottom: 44, left: 52 }
  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom

  // Axis ranges
  const maxSpread = Math.max(8.0, ...validExps.map((e) => e.spread_rate_mm_s || 0))

  // For O2 tab: x in [15, 40]
  // For Flow tab: x in [0, 25]
  const xMin = activeTab === 'o2' ? 15 : 0
  const xMax = activeTab === 'o2' ? 40 : 25

  const getX = (val: number) => padding.left + ((val - xMin) / (xMax - xMin)) * plotW
  const getY = (val: number) => padding.top + plotH - (val / maxSpread) * plotH

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] p-3.5 space-y-3">
      {/* Chart Header */}
      <SectionHeader
        title="Empirical Microgravity Combustion Trends"
        action={
          <div className="inline-flex rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-inset)] p-0.5 text-xs font-medium select-none">
            <button
              onClick={() => setActiveTab('o2')}
              className={`px-2.5 py-1 rounded-[4px] transition-colors ${
                activeTab === 'o2'
                  ? 'bg-[var(--chrome-active-bg)] text-[var(--text-primary)] border border-[var(--border-strong)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Spread vs O₂ (%)
            </button>
            <button
              onClick={() => setActiveTab('flow')}
              className={`px-2.5 py-1 rounded-[4px] transition-colors ${
                activeTab === 'flow'
                  ? 'bg-[var(--chrome-active-bg)] text-[var(--text-primary)] border border-[var(--border-strong)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Spread vs Airflow (cm/s)
            </button>
          </div>
        }
      />

      {/* Active Materials Legend */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs select-none">
        <span className="text-[11px] uppercase tracking-[0.08em] font-medium text-[var(--text-tertiary)]">
          Active Series:
        </span>
        {selectedMaterials.length === 0 ? (
          <span className="text-xs text-[var(--text-tertiary)] italic">
            Select materials from the table to plot them
          </span>
        ) : (
          selectedMaterials.map((mat) => {
            const config = MATERIAL_COLORS[mat] || { color: 'var(--text-primary)', glyph: 'circle' }
            return (
              <div
                key={mat}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
              >
                <span
                  className="w-2 h-2 shrink-0 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-[12px]">{mat}</span>
              </div>
            )
          })
        )}
      </div>

      {/* SVG Canvas Area */}
      <div className="relative mt-2 w-full overflow-x-auto flex justify-center">
        {validExps.length === 0 ? (
          <div className="h-56 w-full flex flex-col items-center justify-center text-xs text-[var(--text-tertiary)] border border-[var(--border-subtle)] rounded-[6px] bg-[var(--bg-inset)]">
            <Info className="h-4 w-4 mb-1 text-[var(--text-disabled)]" />
            <span>No plottable experiments for currently selected materials.</span>
            <span className="text-[11px] text-[var(--text-disabled)] mt-0.5">
              Ensure materials like PMMA, SIBAL, or Nomex are selected.
            </span>
          </div>
        ) : (
          <div className="relative w-full">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto select-none overflow-visible"
            >
              {/* Horizontal Grid lines only */}
              {[0, 2, 4, 6, 8].map((val) => {
                const y = getY(val)
                return (
                  <g key={val}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      stroke="var(--border-subtle)"
                      strokeWidth="1"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      className="fill-[var(--text-tertiary)] text-[11px] font-mono"
                    >
                      {val}
                    </text>
                  </g>
                )
              })}

              {/* X Axis ticks */}
              {activeTab === 'o2'
                ? [15, 20, 25, 30, 35, 40].map((val) => {
                    const x = getX(val)
                    return (
                      <g key={val}>
                        <line
                          x1={x}
                          y1={padding.top + plotH}
                          x2={x}
                          y2={padding.top + plotH + 5}
                          stroke="var(--border-default)"
                          strokeWidth="1"
                        />
                        <text
                          x={x}
                          y={padding.top + plotH + 18}
                          textAnchor="middle"
                          className="fill-[var(--text-tertiary)] text-[11px] font-mono"
                        >
                          {val}%
                        </text>
                      </g>
                    )
                  })
                : [0, 5, 10, 15, 20, 25].map((val) => {
                    const x = getX(val)
                    return (
                      <g key={val}>
                        <line
                          x1={x}
                          y1={padding.top + plotH}
                          x2={x}
                          y2={padding.top + plotH + 5}
                          stroke="var(--border-default)"
                          strokeWidth="1"
                        />
                        <text
                          x={x}
                          y={padding.top + plotH + 18}
                          textAnchor="middle"
                          className="fill-[var(--text-tertiary)] text-[11px] font-mono"
                        >
                          {val}
                        </text>
                      </g>
                    )
                  })}

              {/* Baseline Axis lines */}
              <line
                x1={padding.left}
                y1={padding.top + plotH}
                x2={width - padding.right}
                y2={padding.top + plotH}
                stroke="var(--border-default)"
                strokeWidth="1"
              />
              <line
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={padding.top + plotH}
                stroke="var(--border-default)"
                strokeWidth="1"
              />

              {/* Axis Titles */}
              <text
                x={padding.left + plotW / 2}
                y={height - 8}
                textAnchor="middle"
                className="fill-[var(--text-tertiary)] text-[11px] font-sans"
              >
                {activeTab === 'o2'
                  ? 'Oxygen Concentration (%)'
                  : 'Ventilation Flow Velocity (cm/s)'}
              </text>

              <text
                x={-padding.top - plotH / 2}
                y={14}
                transform="rotate(-90)"
                textAnchor="middle"
                className="fill-[var(--text-tertiary)] text-[11px] font-sans"
              >
                Spread Rate (mm/s)
              </text>

              {/* Data points */}
              {validExps.map((exp) => {
                const xVal =
                  activeTab === 'o2'
                    ? exp.o2_percent ?? 21
                    : exp.flow_velocity_cm_s ?? 0
                const yVal = exp.spread_rate_mm_s ?? 0
                const cx = getX(xVal)
                const cy = getY(yVal)
                const config = MATERIAL_COLORS[exp.material_name] || {
                  color: 'var(--text-primary)',
                  glyph: 'circle',
                }
                const isHovered = hoveredPoint?.exp.id === exp.id

                return (
                  <g
                    key={exp.id}
                    onMouseEnter={() => setHoveredPoint({ exp, x: cx, y: cy })}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="cursor-pointer"
                  >
                    {/* Hover glow ring: 3px without transform */}
                    {isHovered && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={9}
                        fill="none"
                        stroke={config.color}
                        strokeWidth="2"
                        strokeOpacity="0.4"
                      />
                    )}
                    {/* Data circle: 6px */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4.5}
                      fill={config.color}
                      stroke="var(--bg-canvas)"
                      strokeWidth="1.5"
                    />
                  </g>
                )
              })}
            </svg>

            {/* Hover Tooltip: --bg-elevated, 1px --border-default, 6px radius, --shadow-md, 12px mono */}
            {hoveredPoint && (
              <div
                className="absolute z-30 pointer-events-none bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-[var(--shadow-md)] rounded-[6px] p-2.5 text-xs font-mono text-[var(--text-primary)] -translate-x-1/2 -translate-y-full mb-3"
                style={{
                  left: `${(hoveredPoint.x / width) * 100}%`,
                  top: `${hoveredPoint.y}px`,
                }}
              >
                <div className="font-sans font-semibold text-[var(--text-primary)]">
                  {hoveredPoint.exp.material_name}
                </div>
                <div className="text-[var(--text-secondary)] mt-0.5">
                  Spread: <span className="text-[var(--text-primary)] font-bold">{hoveredPoint.exp.spread_rate_mm_s} mm/s</span>
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)] pt-1 mt-1 border-t border-[var(--border-subtle)]">
                  {hoveredPoint.exp.source_id} · {hoveredPoint.exp.source_page}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

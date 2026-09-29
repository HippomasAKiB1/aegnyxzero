import React, { useState } from 'react'
import { LineChart, Info } from 'lucide-react'
import type { Experiment } from '../types'

interface ComparisonChartsProps {
  experiments: Experiment[]
  selectedMaterials: string[]
}

const MATERIAL_COLORS: Record<string, string> = {
  'PMMA (cast acrylic)': '#f97316',      // orange
  'SIBAL fabric': '#ef4444',              // red
  'Nomex HT90-40': '#06b6d4',             // cyan
  'Cellulose Kimwipes': '#eab308',         // yellow
  'Delrin (POM)': '#a855f7',              // purple
  'Polycarbonate (Lexan)': '#3b82f6',     // blue
  'Silicone Elastomer (RTV)': '#10b981',  // emerald
  'Kapton (Polyimide)': '#64748b',        // slate
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
  const width = 540
  const height = 240
  const padding = { top: 20, right: 30, bottom: 40, left: 45 }
  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom

  // Axis ranges
  const maxSpread = Math.max(8.0, ...validExps.map((e) => e.spread_rate_mm_s || 0))

  // For O2 tab: x in [15, 40]
  // For Flow tab: x in [0, 22]
  const xMin = activeTab === 'o2' ? 15 : 0
  const xMax = activeTab === 'o2' ? 40 : 25

  const getX = (val: number) => padding.left + ((val - xMin) / (xMax - xMin)) * plotW
  const getY = (val: number) => padding.top + plotH - (val / maxSpread) * plotH

  return (
    <div className="bg-card/70 border border-border rounded-xl backdrop-blur-sm shadow-sm overflow-hidden flex flex-col p-4 lg:p-5">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/80">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
            <LineChart className="h-4 w-4 text-orange-400" />
            <span>Empirical Combustion Trends</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compare flame spread velocity across NASA microgravity investigations.
          </p>
        </div>

        {/* Tab switch */}
        <div className="inline-flex rounded-lg border border-border bg-secondary/40 p-0.5 text-xs">
          <button
            onClick={() => setActiveTab('o2')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              activeTab === 'o2'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Spread vs O₂ (%)
          </button>
          <button
            onClick={() => setActiveTab('flow')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              activeTab === 'flow'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Spread vs Airflow (cm/s)
          </button>
        </div>
      </div>

      {/* Selected Materials Legend */}
      <div className="flex flex-wrap items-center gap-3 pt-3 text-xs">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase">
          Active Materials:
        </span>
        {selectedMaterials.length === 0 ? (
          <span className="text-xs text-muted-foreground italic">
            Check materials in the table to plot them
          </span>
        ) : (
          selectedMaterials.map((mat) => (
            <div key={mat} className="flex items-center gap-1.5 font-medium">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: MATERIAL_COLORS[mat] || '#f97316' }}
              />
              <span className="text-foreground text-[11px]">{mat}</span>
            </div>
          ))
        )}
      </div>

      {/* SVG Chart Canvas */}
      <div className="relative mt-3 w-full overflow-x-auto flex justify-center">
        {validExps.length === 0 ? (
          <div className="h-60 w-full flex flex-col items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
            <Info className="h-5 w-5 mb-1.5 text-muted-foreground/60" />
            <span>No plottable experiments for currently selected materials.</span>
            <span className="text-[11px] text-muted-foreground/80 mt-0.5">
              Select PMMA, SIBAL fabric, or Cellulose from the table above.
            </span>
          </div>
        ) : (
          <div className="relative">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full max-w-[540px] select-none"
            >
              {/* Grid Lines */}
              {[0, 2, 4, 6, 8].map((val) => {
                const y = getY(val)
                return (
                  <g key={val}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity="0.1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-muted-foreground text-[9px] font-mono"
                    >
                      {val}
                    </text>
                  </g>
                )
              })}

              {/* X Axis Ticks */}
              {activeTab === 'o2'
                ? [15, 20, 25, 30, 35, 40].map((val) => {
                    const x = getX(val)
                    return (
                      <g key={val}>
                        <line
                          x1={x}
                          y1={padding.top}
                          x2={x}
                          y2={padding.top + plotH}
                          stroke="currentColor"
                          strokeOpacity="0.08"
                        />
                        <text
                          x={x}
                          y={padding.top + plotH + 16}
                          textAnchor="middle"
                          className="fill-muted-foreground text-[9px] font-mono"
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
                          y1={padding.top}
                          x2={x}
                          y2={padding.top + plotH}
                          stroke="currentColor"
                          strokeOpacity="0.08"
                        />
                        <text
                          x={x}
                          y={padding.top + plotH + 16}
                          textAnchor="middle"
                          className="fill-muted-foreground text-[9px] font-mono"
                        >
                          {val}
                        </text>
                      </g>
                    )
                  })}

              {/* Axis Labels */}
              <text
                x={padding.left + plotW / 2}
                y={height - 6}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px] font-medium"
              >
                {activeTab === 'o2'
                  ? 'Oxygen Concentration (%)'
                  : 'Forced Ventilation Flow Velocity (cm/s)'}
              </text>

              <text
                x={-padding.top - plotH / 2}
                y={14}
                transform="rotate(-90)"
                textAnchor="middle"
                className="fill-muted-foreground text-[10px] font-medium"
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
                const color = MATERIAL_COLORS[exp.material_name] || '#f97316'

                return (
                  <g
                    key={exp.id}
                    onMouseEnter={() => setHoveredPoint({ exp, x: cx, y: cy })}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="cursor-pointer group"
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill={color}
                      fillOpacity={0.85}
                      stroke="#fff"
                      strokeWidth={1.5}
                      className="transition-transform group-hover:scale-125"
                    />
                  </g>
                )
              })}
            </svg>

            {/* Hover Tooltip (US-3 AC2) */}
            {hoveredPoint && (
              <div
                className="absolute z-30 pointer-events-none bg-popover/95 border border-border shadow-xl rounded-lg p-2.5 text-xs text-foreground backdrop-blur-md -translate-x-1/2 -translate-y-full mb-3"
                style={{
                  left: `${hoveredPoint.x}px`,
                  top: `${hoveredPoint.y}px`,
                }}
              >
                <div className="font-bold text-orange-400">
                  {hoveredPoint.exp.material_name}
                </div>
                <div className="font-mono text-[11px] text-foreground mt-0.5">
                  Spread Rate: <strong>{hoveredPoint.exp.spread_rate_mm_s} mm/s</strong>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  O₂: {hoveredPoint.exp.o2_percent}% &middot; Pressure: {hoveredPoint.exp.pressure_kpa} kPa &middot; Flow: {hoveredPoint.exp.flow_velocity_cm_s} cm/s
                </div>
                <div className="text-[10px] text-cyan-400 mt-1 pt-1 border-t border-border/40 font-mono">
                  {hoveredPoint.exp.source_id} &middot; {hoveredPoint.exp.source_page}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

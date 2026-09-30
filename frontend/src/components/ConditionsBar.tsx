import React from 'react'
import { RotateCcw, Download } from 'lucide-react'
import { Graticule } from './ui'
import type { UserConditions } from '../types'

interface ConditionsBarProps {
  conditions: UserConditions
  onChange: (newConds: UserConditions) => void
  onExport: (format: 'csv' | 'json') => void
}

export const PRESETS = [
  {
    name: 'Lunar Habitat',
    description: '30% O2, 70 kPa reduced pressure (Exploration baseline)',
    conditions: {
      o2_percent: 30.0,
      pressure_kpa: 70.0,
      flow_velocity_cm_s: 5.0,
      gravity_level: 'microgravity',
      material_class: 'all',
    },
  },
  {
    name: 'ISS Cabin',
    description: 'Standard sea-level air at microgravity (21% O2, 101.3 kPa)',
    conditions: {
      o2_percent: 21.0,
      pressure_kpa: 101.3,
      flow_velocity_cm_s: 5.0,
      gravity_level: 'microgravity',
      material_class: 'all',
    },
  },
  {
    name: 'Emergency / Pre-EVA',
    description: 'Hypobaric enriched oxygen atmosphere (34% O2, 56 kPa)',
    conditions: {
      o2_percent: 34.0,
      pressure_kpa: 56.0,
      flow_velocity_cm_s: 5.0,
      gravity_level: 'microgravity',
      material_class: 'all',
    },
  },
]

export const ConditionsBar: React.FC<ConditionsBarProps> = ({
  conditions,
  onChange,
  onExport,
}) => {
  const handlePresetSelect = (presetConds: UserConditions) => {
    onChange({ ...presetConds })
  }

  const handleReset = () => {
    onChange({
      o2_percent: 30.0,
      pressure_kpa: 70.0,
      flow_velocity_cm_s: 5.0,
      gravity_level: 'microgravity',
      material_class: 'all',
    })
  }

  const o2Percent = ((conditions.o2_percent - 10) / (45 - 10)) * 100
  const pressurePercent = ((conditions.pressure_kpa - 30) / (110 - 30)) * 100
  const flowPercent = ((conditions.flow_velocity_cm_s - 0) / (25 - 0)) * 100

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] p-3.5 space-y-3">
      {/* Top Ribbon: Scenario Presets & Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.08em] font-medium text-[var(--text-tertiary)]">
            Scenario Presets
          </span>
          <div className="inline-flex rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-inset)] p-0.5">
            {PRESETS.map((p) => {
              const isActive =
                conditions.o2_percent === p.conditions.o2_percent &&
                conditions.pressure_kpa === p.conditions.pressure_kpa

              return (
                <button
                  key={p.name}
                  onClick={() => handlePresetSelect(p.conditions)}
                  title={p.description}
                  className={`text-xs px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--chrome-active-bg)] text-[var(--text-primary)] border border-[var(--border-strong)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04]'
                  }`}
                >
                  {p.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors px-2 py-1 rounded-[4px] hover:bg-[var(--bg-elevated)]"
            title="Reset conditions to default"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
          <button
            onClick={() => onExport('csv')}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 py-1 rounded-[4px] border border-[var(--border-default)] hover:bg-[var(--bg-elevated)] transition-colors"
            title="Export ranking as CSV"
          >
            <Download className="h-3 w-3" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Numerical Environmental Sliders & Condition Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Oxygen Concentration */}
        <div className="space-y-1.5 p-2 rounded-[6px] bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-tertiary)] font-medium">Oxygen (O₂)</span>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-[18px] font-semibold text-[var(--text-primary)]">
                {conditions.o2_percent.toFixed(1)}
              </span>
              <span className="text-[13px] text-[var(--text-tertiary)]">%</span>
            </div>
          </div>

          <div className="pt-1">
            <input
              type="range"
              min="10"
              max="45"
              step="1"
              value={conditions.o2_percent}
              onChange={(e) =>
                onChange({ ...conditions, o2_percent: parseFloat(e.target.value) || 21 })
              }
              style={{
                background: `linear-gradient(to right, rgba(245, 245, 247, 0.85) 0%, rgba(245, 245, 247, 0.85) ${o2Percent}%, rgba(255, 255, 255, 0.10) ${o2Percent}%, rgba(255, 255, 255, 0.10) 100%)`,
              }}
              className="w-full h-1 rounded-[2px] appearance-none cursor-pointer focus:outline-none"
            />
            <Graticule min={10} max={45} step={5} className="mt-1" />
          </div>

          <div className="flex justify-between text-xs font-mono text-[var(--text-tertiary)] pt-0.5">
            <span>10%</span>
            <span>21% (Air)</span>
            <span>45%</span>
          </div>
        </div>

        {/* Ambient Pressure */}
        <div className="space-y-1.5 p-2 rounded-[6px] bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-tertiary)] font-medium">Pressure</span>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-[18px] font-semibold text-[var(--text-primary)]">
                {conditions.pressure_kpa.toFixed(1)}
              </span>
              <span className="text-[13px] text-[var(--text-tertiary)]">kPa</span>
            </div>
          </div>

          <div className="pt-1">
            <input
              type="range"
              min="30"
              max="110"
              step="1"
              value={conditions.pressure_kpa}
              onChange={(e) =>
                onChange({ ...conditions, pressure_kpa: parseFloat(e.target.value) || 101.3 })
              }
              style={{
                background: `linear-gradient(to right, rgba(245, 245, 247, 0.85) 0%, rgba(245, 245, 247, 0.85) ${pressurePercent}%, rgba(255, 255, 255, 0.10) ${pressurePercent}%, rgba(255, 255, 255, 0.10) 100%)`,
              }}
              className="w-full h-1 rounded-[2px] appearance-none cursor-pointer focus:outline-none"
            />
            <Graticule min={30} max={110} step={10} className="mt-1" />
          </div>

          <div className="flex justify-between text-xs font-mono text-[var(--text-tertiary)] pt-0.5">
            <span>30</span>
            <span>70 (Lunar)</span>
            <span>101.3</span>
          </div>
        </div>

        {/* Ventilation Flow Velocity */}
        <div className="space-y-1.5 p-2 rounded-[6px] bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-tertiary)] font-medium">Airflow</span>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-[18px] font-semibold text-[var(--text-primary)]">
                {conditions.flow_velocity_cm_s.toFixed(1)}
              </span>
              <span className="text-[13px] text-[var(--text-tertiary)]">cm/s</span>
            </div>
          </div>

          <div className="pt-1">
            <input
              type="range"
              min="0"
              max="25"
              step="1"
              value={conditions.flow_velocity_cm_s}
              onChange={(e) =>
                onChange({ ...conditions, flow_velocity_cm_s: parseFloat(e.target.value) || 0 })
              }
              style={{
                background: `linear-gradient(to right, rgba(245, 245, 247, 0.85) 0%, rgba(245, 245, 247, 0.85) ${flowPercent}%, rgba(255, 255, 255, 0.10) ${flowPercent}%, rgba(255, 255, 255, 0.10) 100%)`,
              }}
              className="w-full h-1 rounded-[2px] appearance-none cursor-pointer focus:outline-none"
            />
            <Graticule min={0} max={25} step={5} className="mt-1" />
          </div>

          <div className="flex justify-between text-xs font-mono text-[var(--text-tertiary)] pt-0.5">
            <span>0</span>
            <span>5 (Duct)</span>
            <span>25</span>
          </div>
        </div>

        {/* Gravity Level */}
        <div className="space-y-1.5 p-2 rounded-[6px] bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-tertiary)] font-medium">Gravity Level</span>
            <span className="text-xs font-mono text-[var(--text-secondary)]">Domain</span>
          </div>

          <select
            value={conditions.gravity_level}
            onChange={(e) => onChange({ ...conditions, gravity_level: e.target.value })}
            className="w-full text-xs font-mono bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[4px] px-2 py-1.5 text-[var(--text-primary)] focus:outline-none"
          >
            <option value="microgravity">Microgravity (μg)</option>
            <option value="partial_g">Partial-g (Lunar/Mars)</option>
            <option value="normal_g">Normal-g (1.0g)</option>
            <option value="any">Any Gravity</option>
          </select>

          <span className="text-[12px] text-[var(--text-tertiary)]">Proximity multiplier 0.5x</span>
        </div>

        {/* Material Class Filter */}
        <div className="space-y-1.5 p-2 rounded-[6px] bg-[var(--bg-inset)] border border-[var(--border-subtle)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-tertiary)] font-medium">Material Class</span>
            <span className="text-xs font-mono text-[var(--text-secondary)]">Filter</span>
          </div>

          <select
            value={conditions.material_class}
            onChange={(e) => onChange({ ...conditions, material_class: e.target.value })}
            className="w-full text-xs font-mono bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[4px] px-2 py-1.5 text-[var(--text-primary)] focus:outline-none"
          >
            <option value="all">All Classes</option>
            <option value="polymer">Polymers (Acrylic, POM, Kapton)</option>
            <option value="fabric">Fabrics (SIBAL, Nomex)</option>
            <option value="cellulose">Cellulose (Kimwipes)</option>
            <option value="other">Other (Silicone RTV)</option>
          </select>

          <span className="text-[12px] text-[var(--text-tertiary)]">300ms pure-Python debounce</span>
        </div>
      </div>
    </div>
  )
}

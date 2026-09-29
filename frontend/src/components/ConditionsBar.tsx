import React from 'react'
import { RotateCcw, Download, Sliders, Wind, Gauge, Compass } from 'lucide-react'
import type { UserConditions } from '../types'

interface ConditionsBarProps {
  conditions: UserConditions
  onChange: (newConds: UserConditions) => void
  onExport: (format: 'csv' | 'json') => void
}

export const PRESETS = [
  {
    name: '🌙 Lunar Habitat',
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
    name: '🛸 ISS Cabin',
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
    name: '⚠️ Emergency / Pre-EVA',
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

  return (
    <div className="bg-card/70 border border-border rounded-xl p-4 lg:p-5 backdrop-blur-sm shadow-sm space-y-4">
      {/* Preset Scenario Selector Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-orange-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Scenario Presets
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {PRESETS.map((p) => {
            const isActive =
              conditions.o2_percent === p.conditions.o2_percent &&
              conditions.pressure_kpa === p.conditions.pressure_kpa

            return (
              <button
                key={p.name}
                onClick={() => handlePresetSelect(p.conditions)}
                title={p.description}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                  isActive
                    ? 'border-orange-500/60 bg-orange-500/15 text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.15)]'
                    : 'border-border bg-secondary/30 text-foreground hover:bg-secondary/70'
                }`}
              >
                {p.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Numerical Environmental Sliders & Condition Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Oxygen Concentration */}
        <div className="space-y-1.5 bg-secondary/20 p-3 rounded-lg border border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground flex items-center gap-1.5">
              <span>Oxygen (O₂)</span>
            </span>
            <span className="font-mono text-xs font-bold text-orange-400">
              {conditions.o2_percent.toFixed(1)} %
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="45"
            step="1"
            value={conditions.o2_percent}
            onChange={(e) =>
              onChange({ ...conditions, o2_percent: parseFloat(e.target.value) || 21 })
            }
            className="w-full accent-orange-500 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>10% (Low)</span>
            <span>21% (Earth)</span>
            <span>45% (High)</span>
          </div>
        </div>

        {/* Ambient Pressure */}
        <div className="space-y-1.5 bg-secondary/20 p-3 rounded-lg border border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground flex items-center gap-1.5">
              <Gauge className="h-3 w-3 text-cyan-400" />
              <span>Pressure</span>
            </span>
            <span className="font-mono text-xs font-bold text-cyan-400">
              {conditions.pressure_kpa.toFixed(1)} kPa
            </span>
          </div>
          <input
            type="range"
            min="30"
            max="110"
            step="1"
            value={conditions.pressure_kpa}
            onChange={(e) =>
              onChange({ ...conditions, pressure_kpa: parseFloat(e.target.value) || 101.3 })
            }
            className="w-full accent-cyan-500 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>30 kPa</span>
            <span>70 (Lunar)</span>
            <span>101.3 (1 atm)</span>
          </div>
        </div>

        {/* Ventilation Flow Velocity */}
        <div className="space-y-1.5 bg-secondary/20 p-3 rounded-lg border border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground flex items-center gap-1.5">
              <Wind className="h-3 w-3 text-emerald-400" />
              <span>Airflow (Ventilation)</span>
            </span>
            <span className="font-mono text-xs font-bold text-emerald-400">
              {conditions.flow_velocity_cm_s.toFixed(1)} cm/s
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="25"
            step="1"
            value={conditions.flow_velocity_cm_s}
            onChange={(e) =>
              onChange({ ...conditions, flow_velocity_cm_s: parseFloat(e.target.value) || 0 })
            }
            className="w-full accent-emerald-500 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0 (Quiescent)</span>
            <span>5 (Hab Duct)</span>
            <span>25 cm/s</span>
          </div>
        </div>

        {/* Gravity Level */}
        <div className="space-y-1.5 bg-secondary/20 p-3 rounded-lg border border-border/50">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Compass className="h-3 w-3 text-purple-400" />
            <span>Gravity Level</span>
          </label>
          <select
            value={conditions.gravity_level}
            onChange={(e) => onChange({ ...conditions, gravity_level: e.target.value })}
            className="w-full text-xs bg-background/80 border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-400"
          >
            <option value="microgravity">Microgravity (μg, ISS/Cygnus)</option>
            <option value="partial_g">Partial-g (Lunar 1/6 g / Mars 3/8 g)</option>
            <option value="normal_g">Normal-g (1.0 g Earth)</option>
            <option value="any">Any Gravity (Cross-domain)</option>
          </select>
          <div className="text-[10px] text-muted-foreground">
            Filters proximity weighting
          </div>
        </div>

        {/* Material Class Filter & Action Controls */}
        <div className="space-y-1.5 bg-secondary/20 p-3 rounded-lg border border-border/50">
          <label className="text-xs font-medium text-foreground flex items-center justify-between">
            <span>Material Class</span>
            <button
              onClick={handleReset}
              className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition"
              title="Reset conditions to default"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              <span>Reset</span>
            </button>
          </label>
          <div className="flex items-center gap-2">
            <select
              value={conditions.material_class}
              onChange={(e) => onChange({ ...conditions, material_class: e.target.value })}
              className="w-full text-xs bg-background/80 border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              <option value="all">All Classes</option>
              <option value="polymer">Polymers (Acrylic, POM, Kapton)</option>
              <option value="fabric">Fabrics (SIBAL, Nomex)</option>
              <option value="cellulose">Cellulose (Kimwipes, Paper)</option>
              <option value="other">Other (Silicone RTV)</option>
            </select>

            <button
              onClick={() => onExport('csv')}
              className="p-1.5 rounded-lg border border-border bg-background/80 hover:bg-secondary text-foreground transition"
              title="Export current ranking as CSV (US-10)"
            >
              <Download className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="text-[10px] text-muted-foreground flex justify-between">
            <span>Dynamic filter</span>
            <span className="font-mono text-orange-400/80">300ms debounce</span>
          </div>
        </div>
      </div>
    </div>
  )
}

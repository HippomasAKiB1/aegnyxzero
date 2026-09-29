import React from 'react'
import { X, HelpCircle, Database, BookOpen, AlertTriangle, Shield } from 'lucide-react'
import type { FeedbackItem } from '../types'

interface ScoreFormulaModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ScoreFormulaModal: React.FC<ScoreFormulaModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Score Formula & Methodology (v2)
              </h3>
              <p className="text-xs text-muted-foreground">
                PRD Section 13 — Pure deterministic Python calculation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-foreground/90">
          <div className="bg-secondary/30 p-3.5 rounded-xl border border-border space-y-1.5 font-mono text-xs">
            <div className="text-orange-400 font-semibold">// 1. Raw Experiment Risk</div>
            <div>RawRisk_i = (0.6 &times; OutcomeScore_i) + (0.4 &times; NormalizedSpread_i)</div>
            <div className="text-muted-foreground text-[11px] pt-1">
              Outcome: sustained_spread=1.0, marginal=0.6, extinguished=0.1, no_ignition=0.0
            </div>
          </div>

          <div className="bg-secondary/30 p-3.5 rounded-xl border border-border space-y-1.5 font-mono text-xs">
            <div className="text-cyan-400 font-semibold">// 2. Condition Proximity Weighting (w_i)</div>
            <div>For each dimension (O₂, Pressure, Airflow):</div>
            <div>&bull; Relative difference &le; 10% &rarr; Dimension weight = 1.0</div>
            <div>&bull; Relative difference &le; 20% &rarr; Dimension weight = 0.5</div>
            <div>&bull; Relative difference &gt; 20% &rarr; Dimension weight = 0.0</div>
            <div className="text-muted-foreground text-[11px]">
              Gravity mismatch penalty = 0.5 multiplier if domain differs.
            </div>
          </div>

          <div className="bg-secondary/30 p-3.5 rounded-xl border border-border space-y-1.5 font-mono text-xs">
            <div className="text-emerald-400 font-semibold">// 3. Material Risk Score (0–100)</div>
            <div>Risk_m = 100 &times; &Sigma;(w_i &times; RawRisk_i) / &Sigma;(w_i)</div>
            <div className="text-muted-foreground text-[11px] pt-1">
              Bands: Low (0–24), Moderate (25–49), High (50–74), Severe (75–100)
            </div>
          </div>

          <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-1">
            <div className="font-semibold text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Mandatory Integrity Rule: Insufficient Evidence</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              If the sum of supporting weights &Sigma; w_i &lt; 1.0, the material is designated as{' '}
              <strong className="text-foreground">"Insufficient Evidence"</strong> with NO numeric score.
              AegnyxZero never hallucinates or extrapolates unsupported safety numbers.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

interface ReviewLogModalProps {
  isOpen: boolean
  onClose: () => void
  feedbacks: FeedbackItem[]
}

export const ReviewLogModal: React.FC<ReviewLogModalProps> = ({ isOpen, onClose, feedbacks }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Expert Review &amp; Audit Log
              </h3>
              <p className="text-xs text-muted-foreground">
                PRD US-8 — Human-in-the-loop review history stored in SQLite
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {feedbacks.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
              No expert reviews logged yet. You can approve or flag experiments in the Evidence Panel.
            </div>
          ) : (
            <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
              {feedbacks.map((f) => (
                <div key={f.id} className="p-3 text-xs flex items-center justify-between gap-3 bg-card hover:bg-secondary/30">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          f.action === 'approve'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {f.action.toUpperCase()}
                      </span>
                      <span className="font-mono font-medium text-foreground">{f.target_id}</span>
                      <span className="text-muted-foreground">({f.target_type})</span>
                    </div>
                    {f.note && <p className="text-muted-foreground italic text-[11px]">"{f.note}"</p>}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground/75 whitespace-nowrap">
                    {new Date(f.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                About AegnyxZero &amp; Data Provenance
              </h3>
              <p className="text-xs text-muted-foreground">
                NASA Space Apps Challenge 2026 &middot; Team Turtlers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-foreground/90">
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground text-sm">Challenge Statement</h4>
            <p className="text-muted-foreground leading-relaxed">
              Problem 8 — <em>Flame in Freefall: AI-Powered Fire Safety Insights from Microgravity Combustion Data</em>.
              AegnyxZero is an evidence-first fire safety dashboard providing rapid, defensible flammability rankings
              grounded in decades of NASA microgravity experiments.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-foreground text-sm">Indexed NASA Investigations (100% Free &amp; Public)</h4>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>&bull; <strong className="text-foreground">BASS / BASS-II:</strong> Burning and Suppression of Solids on ISS (NTRS 20150008962)</li>
              <li>&bull; <strong className="text-foreground">Saffire I–VI:</strong> Large-Scale Spacecraft Fire Safety Tests on Cygnus (AIAA / NTRS)</li>
              <li>&bull; <strong className="text-foreground">SoFIE-GEL:</strong> Solid Fuel Ignition and Extinction Limits on ISS</li>
              <li>&bull; <strong className="text-foreground">Drop Tower 2.2s / 5.18s:</strong> Thin Cellulose Near-Limit Spread (NTRS 19880006471)</li>
              <li>&bull; <strong className="text-foreground">Exploration Atmospheres:</strong> Flammability in Lunar/Martian environments (NASA-TP-2010-216134)</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-1.5">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-orange-400" />
              <span>What AegnyxZero Cannot Tell You (Safety Disclaimer)</span>
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              AegnyxZero is an exploratory decision-support dashboard for research and scenario planning.
              It is NOT a certified spacecraft life-safety clearance system. Spacecraft materials must always undergo
              formal NASA STD-6001 testing before flight qualification.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

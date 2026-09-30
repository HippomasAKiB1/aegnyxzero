import React from 'react'
import { X, HelpCircle, Database, BookOpen, AlertTriangle, ShieldCheck } from 'lucide-react'
import type { FeedbackItem } from '../types'

interface ScoreFormulaModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ScoreFormulaModal: React.FC<ScoreFormulaModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-overlay)] backdrop-blur-[4px] animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] shadow-[var(--shadow-lg)] p-6 space-y-4 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 text-[var(--text-secondary)]" />
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">
                Score Formula &amp; Deterministic Methodology
              </h3>
              <p className="text-xs text-[var(--text-tertiary)]">
                Pure Python mathematical calculation — zero LLM numeric generation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors focus-visible:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Math explanation blocks */}
        <div className="space-y-3 text-xs text-[var(--text-secondary)]">
          <div className="bg-[var(--bg-inset)] p-3 rounded-[6px] border border-[var(--border-subtle)] space-y-1 font-mono text-xs">
            <div className="text-[var(--text-primary)] font-semibold">// 1. Raw Experiment Risk</div>
            <div className="text-[var(--text-primary)]">RawRisk_i = (0.6 &times; OutcomeScore_i) + (0.4 &times; NormalizedSpread_i)</div>
            <div className="text-[var(--text-tertiary)] text-[11px] pt-1">
              Outcome: sustained_spread=1.0, marginal=0.6, extinguished=0.1, no_ignition=0.0
            </div>
          </div>

          <div className="bg-[var(--bg-inset)] p-3 rounded-[6px] border border-[var(--border-subtle)] space-y-1 font-mono text-xs">
            <div className="text-[var(--text-primary)] font-semibold">// 2. Condition Proximity Weighting (w_i)</div>
            <div>For each dimension (O₂, Pressure, Airflow):</div>
            <div>&bull; Relative diff &le; 10% &rarr; Dimension weight = 1.0</div>
            <div>&bull; Relative diff &le; 20% &rarr; Dimension weight = 0.5</div>
            <div>&bull; Relative diff &gt; 20% &rarr; Dimension weight = 0.0</div>
            <div className="text-[var(--text-tertiary)] text-[11px] pt-1">
              Gravity mismatch penalty = 0.5x multiplier if test gravity domain differs.
            </div>
          </div>

          <div className="bg-[var(--bg-inset)] p-3 rounded-[6px] border border-[var(--border-subtle)] space-y-1 font-mono text-xs">
            <div className="text-[var(--text-primary)] font-semibold">// 3. Material Risk Score (0–100)</div>
            <div className="text-[var(--text-primary)]">Risk_m = 100 &times; &Sigma;(w_i &times; RawRisk_i) / &Sigma;(w_i)</div>
            <div className="text-[var(--text-tertiary)] text-[11px] pt-1">
              Bands: Low (0–24), Moderate (25–49), High (50–74), Severe (75–100)
            </div>
          </div>

          <div className="p-3 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-inset)] space-y-1">
            <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-[var(--risk-mod)]" />
              <span>Mandatory Integrity Rule: Insufficient Evidence</span>
            </div>
            <p className="text-[12px] text-[var(--text-secondary)]">
              If the sum of supporting weights &Sigma; w_i &lt; 1.0, the material is designated as{' '}
              <strong className="text-[var(--text-primary)]">"Insufficient Evidence"</strong> with NO numeric score.
              AegnyxZero never extrapolates unsupported safety numbers.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-[6px] bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-white/[0.08] text-xs font-medium transition-colors"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-overlay)] backdrop-blur-[4px] animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] shadow-[var(--shadow-lg)] p-6 space-y-4 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-[var(--text-secondary)]" />
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">
                Expert Review &amp; Audit Log
              </h3>
              <p className="text-xs text-[var(--text-tertiary)]">
                Human-in-the-loop review history stored in SQLite
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors focus-visible:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Feedbacks list */}
        <div className="space-y-2">
          {feedbacks.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-tertiary)] border border-[var(--border-subtle)] rounded-[6px] bg-[var(--bg-inset)]">
              No expert reviews logged yet. You can approve or flag experiments in the Evidence Panel.
            </div>
          ) : (
            <div className="border border-[var(--border-subtle)] rounded-[6px] overflow-hidden divide-y divide-[var(--border-subtle)]">
              {feedbacks.map((f) => (
                <div key={f.id} className="p-3 text-xs flex items-center justify-between gap-3 bg-[var(--bg-inset)]">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded-[3px] ${
                          f.action === 'approve'
                            ? 'bg-[var(--check-pass)]/15 text-[var(--check-pass)]'
                            : 'bg-[var(--check-fail)]/15 text-[var(--check-fail)]'
                        }`}
                      >
                        {f.action.toUpperCase()}
                      </span>
                      <span className="font-mono text-[var(--text-primary)] font-medium">{f.target_id}</span>
                      <span className="text-[var(--text-tertiary)] font-sans">({f.target_type})</span>
                    </div>
                    {f.note && <p className="text-[var(--text-secondary)] italic text-[12px]">"{f.note}"</p>}
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-tertiary)] shrink-0">
                    {new Date(f.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-[6px] bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-white/[0.08] text-xs font-medium transition-colors"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-overlay)] backdrop-blur-[4px] animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] shadow-[var(--shadow-lg)] p-6 space-y-4 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[var(--text-secondary)]" />
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">
                About AegnyxZero &amp; Data Provenance
              </h3>
              <p className="text-xs text-[var(--text-tertiary)]">
                NASA Space Apps Challenge 2026 &middot; Team Turtlers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors focus-visible:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs text-[var(--text-secondary)]">
          <div className="space-y-1">
            <h4 className="font-semibold text-[var(--text-primary)] text-xs uppercase tracking-[0.08em]">Challenge Statement</h4>
            <p className="leading-relaxed">
              Problem 8 — <em>Flame in Freefall: AI-Powered Fire Safety Insights from Microgravity Combustion Data</em>.
              AegnyxZero is an evidence-first fire safety dashboard providing rapid flammability rankings
              grounded in decades of NASA microgravity experiments.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-semibold text-[var(--text-primary)] text-xs uppercase tracking-[0.08em]">Indexed NASA Investigations</h4>
            <ul className="space-y-1 text-[var(--text-secondary)]">
              <li>&bull; <strong className="text-[var(--text-primary)]">BASS / BASS-II:</strong> Burning and Suppression of Solids on ISS (NTRS 20150008962)</li>
              <li>&bull; <strong className="text-[var(--text-primary)]">Saffire I–VI:</strong> Large-Scale Spacecraft Fire Safety Tests on Cygnus (AIAA / NTRS)</li>
              <li>&bull; <strong className="text-[var(--text-primary)]">SoFIE-GEL:</strong> Solid Fuel Ignition and Extinction Limits on ISS</li>
              <li>&bull; <strong className="text-[var(--text-primary)]">Drop Tower:</strong> Thin Cellulose Near-Limit Spread (NTRS 19880006471)</li>
              <li>&bull; <strong className="text-[var(--text-primary)]">Exploration Atmospheres:</strong> Flammability in Lunar/Martian environments (NASA-TP-2010-216134)</li>
            </ul>
          </div>

          <div className="p-3 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-inset)] space-y-1">
            <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
              <span>Safety Disclaimer</span>
            </h4>
            <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed">
              AegnyxZero is an exploratory decision-support dashboard for combustion research and scenario planning.
              It is NOT a certified spacecraft life-safety clearance system. Spacecraft materials must always undergo
              formal NASA STD-6001 testing before flight qualification.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-[6px] bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-white/[0.08] text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

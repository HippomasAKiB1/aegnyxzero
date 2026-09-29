import React, { useState } from 'react'
import {
  X,
  ExternalLink,
  CheckCircle2,
  Flag,
  ShieldCheck,
  AlertCircle,
  FileText,
  Flame,
  Check,
} from 'lucide-react'
import type { MaterialRanking, Experiment, Source } from '../types'

interface EvidenceDrawerProps {
  material: MaterialRanking | null
  experiments: Experiment[]
  sources: Source[]
  onClose: () => void
  onSubmitFeedback: (targetType: string, targetId: string, action: string, note?: string) => Promise<void>
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  material,
  experiments,
  sources,
  onClose,
  onSubmitFeedback,
}) => {
  const [feedbackNote, setFeedbackNote] = useState<Record<string, string>>({})
  const [feedbackStatus, setFeedbackStatus] = useState<Record<string, string>>({})

  if (!material) return null

  const supportingExps = experiments.filter((e) =>
    material.evidence_ids.includes(e.id) || e.material_name === material.material_name
  )

  const sourcesById = Object.fromEntries(sources.map((s) => [s.id, s]))

  const handleFeedback = async (expId: string, action: 'approve' | 'flag') => {
    const note = feedbackNote[expId] || ''
    try {
      await onSubmitFeedback('experiment', expId, action, note)
      setFeedbackStatus((prev) => ({ ...prev, [expId]: action }))
      setTimeout(() => {
        setFeedbackStatus((prev) => {
          const next = { ...prev }
          delete next[expId]
          return next
        })
      }, 4000)
    } catch (err) {
      console.error('Feedback failed:', err)
    }
  }

  const getOutcomeBadge = (outcome?: string) => {
    switch (outcome) {
      case 'sustained_spread':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded">
            <Flame className="h-3 w-3 text-red-400" />
            <span>Sustained Spread</span>
          </span>
        )
      case 'marginal':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded">
            <span>Marginal / Smoldering</span>
          </span>
        )
      case 'extinguished':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded">
            <span>Self-Extinguished</span>
          </span>
        )
      case 'no_ignition':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">
            <span>No Ignition</span>
          </span>
        )
      default:
        return (
          <span className="text-[11px] text-muted-foreground">Unknown</span>
        )
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-card border-l border-border shadow-2xl flex flex-col backdrop-blur-xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-5 border-b border-border/80 flex items-start justify-between gap-4 bg-secondary/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-orange-400">
              #{material.rank}
            </span>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              {material.material_name}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            <span>Score: <strong className="text-foreground">{material.score !== null ? material.score.toFixed(1) : 'None'}</strong></span>
            <span>&middot;</span>
            <span>Band: <strong className="text-foreground">{material.band || 'Insufficient Evidence'}</strong></span>
            <span>&middot;</span>
            <span>Confidence: <strong className="text-cyan-400">{material.confidence}</strong></span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition"
          title="Close evidence panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Confidence & Limitations Card */}
        <div className="bg-secondary/20 border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
            <span>Confidence & Validation Rationale</span>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">
              Confidence Basis:
            </div>
            <ul className="text-xs space-y-1 text-foreground">
              {material.confidence_reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {material.limitations.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-border/50">
              <div className="text-xs font-medium text-amber-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>Deterministic Limitations:</span>
              </div>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {material.limitations.map((lim, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-400/80 mt-0.5">•</span>
                    <span>{lim}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Experiment Rows List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-orange-400" />
              <span>Supporting NASA Experiments ({supportingExps.length})</span>
            </h3>
          </div>

          {supportingExps.length === 0 ? (
            <div className="p-4 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
              No matching experiments found for this material in database.
            </div>
          ) : (
            supportingExps.map((exp) => {
              const src = exp.source_id ? sourcesById[exp.source_id] : null
              const isApproved = feedbackStatus[exp.id] === 'approve'
              const isFlagged = feedbackStatus[exp.id] === 'flag'

              return (
                <div
                  key={exp.id}
                  className="bg-card border border-border/80 rounded-xl p-4 space-y-3 shadow-sm hover:border-border transition"
                >
                  {/* Row Top: ID, Facility, Outcome */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-orange-400">
                        {exp.id}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                        {exp.facility || 'NASA Test'}
                      </span>
                      {exp.verified === 1 && (
                        <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5">
                          <Check className="h-2.5 w-2.5" />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>
                    <div>{getOutcomeBadge(exp.outcome)}</div>
                  </div>

                  {/* Conditions Matrix */}
                  <div className="grid grid-cols-4 gap-2 text-center bg-secondary/30 rounded-lg p-2 text-xs">
                    <div>
                      <div className="text-[10px] text-muted-foreground">O₂ Conc</div>
                      <div className="font-mono font-semibold text-foreground">
                        {exp.o2_percent !== undefined ? `${exp.o2_percent}%` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Pressure</div>
                      <div className="font-mono font-semibold text-foreground">
                        {exp.pressure_kpa !== undefined ? `${exp.pressure_kpa} kPa` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Airflow</div>
                      <div className="font-mono font-semibold text-foreground">
                        {exp.flow_velocity_cm_s !== undefined ? `${exp.flow_velocity_cm_s} cm/s` : '0 cm/s'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Spread Rate</div>
                      <div className="font-mono font-bold text-orange-400">
                        {exp.spread_rate_mm_s !== undefined && exp.spread_rate_mm_s !== null
                          ? `${exp.spread_rate_mm_s} mm/s`
                          : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Quoted Evidence Span */}
                  {exp.evidence_span && (
                    <blockquote className="text-xs italic bg-muted/30 border-l-2 border-orange-500/60 pl-3 py-1 text-foreground/90 font-mono">
                      "{exp.evidence_span}"
                    </blockquote>
                  )}

                  {/* Bibliographic Citation */}
                  <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/40 space-y-0.5">
                    <div className="font-medium text-foreground/90">
                      {src ? src.title : exp.source_id}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>
                        {src?.authors} ({src?.year}) &middot;{' '}
                        <strong className="text-foreground">{exp.source_page}</strong>
                      </span>
                      {src?.url && (
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300"
                        >
                          <span>NASA Report</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Expert Review Controls (US-8) */}
                  <div className="pt-2 border-t border-border/50 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add review note (optional)..."
                        value={feedbackNote[exp.id] || ''}
                        onChange={(e) =>
                          setFeedbackNote({ ...feedbackNote, [exp.id]: e.target.value })
                        }
                        className="flex-1 text-xs bg-secondary/50 border border-border rounded px-2.5 py-1 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-orange-400"
                      />
                      <button
                        onClick={() => handleFeedback(exp.id, 'approve')}
                        className={`text-xs px-2.5 py-1 rounded border inline-flex items-center gap-1 transition ${
                          isApproved
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'border-border bg-secondary/40 text-foreground hover:bg-emerald-500/20 hover:text-emerald-400'
                        }`}
                        title="Approve this experiment data"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{isApproved ? 'Approved' : 'Approve'}</span>
                      </button>
                      <button
                        onClick={() => handleFeedback(exp.id, 'flag')}
                        className={`text-xs px-2.5 py-1 rounded border inline-flex items-center gap-1 transition ${
                          isFlagged
                            ? 'bg-red-500 text-white border-red-500'
                            : 'border-border bg-secondary/40 text-foreground hover:bg-red-500/20 hover:text-red-400'
                        }`}
                        title="Flag this experiment for QA review"
                      >
                        <Flag className="h-3 w-3" />
                        <span>{isFlagged ? 'Flagged' : 'Flag'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

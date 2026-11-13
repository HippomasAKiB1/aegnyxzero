import React, { useState } from 'react'
import {
  X,
  Send,
  CheckCircle2,
  Flag,
  AlertTriangle,
} from 'lucide-react'
import { ConfidenceMeter, ValidationPill, Reticle } from './ui'
import type { AskResponse, UserConditions } from '../types'
import { API_BASE_URL } from '../config'

interface AskAIDrawerProps {
  isOpen: boolean
  onClose: () => void
  conditions: UserConditions
  onSubmitFeedback: (targetType: string, targetId: string, action: string, note?: string) => Promise<void>
}

const SAMPLE_QUESTIONS = [
  'Lunar habitat cabin with 30% O2 at 70 kPa: which materials are highest risk?',
  'How does ventilation airflow velocity affect flame spread on fabrics in zero-g?',
  'What is the flame temperature and soot velocity of PMMA on Mars?',
]

export const AskAIDrawer: React.FC<AskAIDrawerProps> = ({
  isOpen,
  onClose,
  conditions,
  onSubmitFeedback,
}) => {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState<AskResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedbackGiven, setFeedbackGiven] = useState<'approve' | 'flag' | null>(null)

  if (!isOpen) return null

  const handleSend = async (qText?: string) => {
    const q = (qText || question).trim()
    if (!q) return

    setLoading(true)
    setError(null)
    setAnswer(null)
    setFeedbackGiven(null)

    try {
      const res = await fetch(`${API_BASE_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          conditions: conditions,
        }),
      })

      if (!res.ok) {
        throw new Error(`API error: ${res.statusText}`)
      }

      const data: AskResponse = await res.json()
      setAnswer(data)
    } catch (err: unknown) {
      console.warn('Live /ask failed:', err)
      setError('AI connection lost. Please check backend status. Rankings and Evidence remain available.')
    } finally {
      setLoading(false)
    }
  }

  const handleFeedback = async (action: 'approve' | 'flag') => {
    if (!answer) return
    try {
      await onSubmitFeedback('answer', answer.answer_id, action)
      setFeedbackGiven(action)
    } catch (err) {
      console.error('Answer feedback error:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end animate-in fade-in duration-150">
      {/* Scrim with blur(4px) */}
      <div
        className="fixed inset-0 bg-[var(--bg-overlay)] backdrop-blur-[4px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel: Slides up from bottom, 50% viewport height, flat solid surface bg (no blur) */}
      <div
        className="relative z-10 w-full h-[54vh] max-h-[640px] bg-[var(--bg-surface)] border-t border-[var(--border-default)] shadow-[0_-12px_32px_rgba(0,0,0,0.6)] flex flex-col animate-in slide-in-from-bottom duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Input Bar with Radial Glow on Focus */}
        <div className="p-4 sm:px-8 border-b border-[var(--border-subtle)] transition-all focus-within:bg-[radial-gradient(ellipse_at_top,_var(--ember-muted)_0%,_transparent_75%)]">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4">
            <div className="flex-1 flex items-center gap-3">
              <input
                type="text"
                placeholder="Ask about fire safety in microgravity…"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={loading}
                className="w-full text-[18px] bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] border-b border-transparent focus:border-[var(--border-strong)] pb-1 focus:outline-none transition-colors"
                autoFocus
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !question.trim()}
                className="px-3.5 py-1.5 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-white/[0.08] disabled:opacity-40 text-xs font-medium text-[var(--text-primary)] inline-flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-[4px] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors focus-visible:outline-none"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sample Prompts */}
          <div className="max-w-[1200px] mx-auto flex flex-wrap items-center gap-2 pt-2 text-xs">
            <span className="text-[11px] uppercase tracking-[0.08em] font-medium text-[var(--text-tertiary)]">
              Scenarios:
            </span>
            {SAMPLE_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuestion(q)
                  handleSend(q)
                }}
                className="text-[12px] px-2.5 py-0.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-inset)] hover:border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors truncate max-w-xs"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Answer Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:px-8 space-y-4">
          <div className="max-w-[1200px] mx-auto space-y-4">
            {/* Loading state: 3-dot indicator, neutral white at 60% opacity with staggered pulse */}
            {loading && (
              <div className="h-44 flex flex-col items-center justify-center gap-3">
                <div className="flex items-center gap-2" aria-label="Loading response">
                  <span className="w-2 h-2 rounded-full bg-[var(--text-primary)] opacity-60 animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-[var(--text-primary)] opacity-60 animate-pulse [animation-delay:200ms]" />
                  <span className="w-2 h-2 rounded-full bg-[var(--text-primary)] opacity-60 animate-pulse [animation-delay:400ms]" />
                </div>
                <span className="text-xs font-mono text-[var(--text-secondary)]">
                  Consulting NASA microgravity records &amp; executing deterministic validators…
                </span>
              </div>
            )}

            {!loading && error && (
              <div className="p-4 rounded-[6px] border border-[var(--check-fail)] bg-[var(--check-fail)]/10 text-[var(--check-fail)] text-xs flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {!loading && !answer && !error && (
              <div className="h-44 flex flex-col items-center justify-center gap-2 text-xs text-[var(--text-tertiary)] border border-[var(--border-subtle)] rounded-[6px] bg-[var(--bg-inset)] text-center p-6">
                <Reticle size={16} pulse={false} />
                <span className="font-sans font-medium text-[var(--text-secondary)]">
                  Ask a question above to retrieve cited empirical facts
                </span>
                <span className="text-[12px] text-[var(--text-tertiary)] max-w-md">
                  All math and risk scoring is purely deterministic. Every number verified against cited data.
                </span>
              </div>
            )}

            {!loading && answer && (
              <div className="space-y-4 pb-4">
                {/* User Query Echo */}
                <div className="text-[13px] italic text-[var(--text-secondary)]">
                  You asked: "{answer.question}"
                </div>

                {/* AI Executive Summary: 15px, relaxed leading, max 70ch */}
                <div className="p-4 rounded-[6px] bg-white/[0.03] border border-[var(--border-subtle)] space-y-2">
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-[var(--border-subtle)]">
                    <span className="text-[11px] uppercase tracking-[0.08em] font-medium text-[var(--text-tertiary)]">
                      Evidence Synthesis
                    </span>
                    <span className="font-mono text-[11px] text-[var(--text-secondary)]">
                      {answer.meta.provider} · {answer.meta.latency_ms}ms
                    </span>
                  </div>
                  <p className="text-[15px] leading-relaxed text-[var(--text-primary)] max-w-[70ch]">
                    {answer.summary}
                  </p>
                </div>

                {/* Empirical Findings: 1 card each */}
                {answer.findings.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="text-[11px] uppercase tracking-[0.08em] font-medium text-[var(--text-tertiary)]">
                      Empirical Findings ({answer.findings.length})
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {answer.findings.map((f, i) => (
                        <div
                          key={i}
                          className="bg-white/[0.03] border border-[var(--border-subtle)] rounded-[6px] p-4 space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-[var(--text-tertiary)] flex items-center gap-1.5">
                              <span>◆</span>
                              <span>Finding 0{i + 1}</span>
                            </span>
                            <ConfidenceMeter level={answer.confidence.level} />
                          </div>

                          <p className="text-[14px] text-[var(--text-primary)] leading-normal">
                            {f.claim}
                          </p>

                          {/* Citation and numbers row */}
                          <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[var(--text-secondary)]">
                            <div className="flex flex-wrap gap-2">
                              {f.numbers.map((n, idx) => (
                                <span key={idx} className="text-[var(--text-primary)] font-semibold">
                                  {n.value} {n.unit} ({n.label})
                                </span>
                              ))}
                            </div>
                            <div className="text-[var(--text-tertiary)]">
                              {f.evidence.map((ev, idx) => (
                                <span key={idx}>
                                  [{ev.experiment_id} · {ev.source_id} {ev.page}]
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Validation Checks Row: Compact horizontal row of ValidationPills */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] uppercase tracking-[0.08em] font-medium text-[var(--text-tertiary)] mr-1">
                    Deterministic Checks:
                  </span>
                  {answer.validation.checks.map((chk) => (
                    <ValidationPill
                      key={chk.id}
                      id={chk.id}
                      status={chk.status}
                      message={chk.message}
                    />
                  ))}
                </div>

                {/* Suggested Follow-ups: small outlined pill buttons */}
                {answer.follow_ups.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] uppercase tracking-[0.08em] font-medium text-[var(--text-tertiary)]">
                      Suggested Follow-ups:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {answer.follow_ups.map((fQ, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setQuestion(fQ)
                            handleSend(fQ)
                          }}
                          className="text-xs px-3 py-1 rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-white/[0.08] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                          {fQ}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expert Feedback Bar */}
                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>Is this insight verified and grounded in NASA data?</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFeedback('approve')}
                      className={`px-2.5 py-1 rounded-[4px] border inline-flex items-center gap-1 transition-colors ${
                        feedbackGiven === 'approve'
                          ? 'bg-[var(--check-pass)] text-black border-[var(--check-pass)]'
                          : 'border-[var(--border-default)] bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleFeedback('flag')}
                      className={`px-2.5 py-1 rounded-[4px] border inline-flex items-center gap-1 transition-colors ${
                        feedbackGiven === 'flag'
                          ? 'bg-[var(--check-fail)] text-white border-[var(--check-fail)]'
                          : 'border-[var(--border-default)] bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Flag</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

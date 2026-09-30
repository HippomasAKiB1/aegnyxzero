import React from 'react'
import { HelpCircle, BookOpen, MessageSquare, Database } from 'lucide-react'
import { Reticle, StatusDot } from './ui'

interface HeaderProps {
  isBackendConnected: boolean
  datasetVersion: string
  onOpenFormula: () => void
  onOpenAbout: () => void
  onOpenReviewLog: () => void
  onToggleAskAI: () => void
  askAIOpen: boolean
}

export const Header: React.FC<HeaderProps> = ({
  isBackendConnected,
  datasetVersion,
  onOpenFormula,
  onOpenAbout,
  onOpenReviewLog,
  onToggleAskAI,
  askAIOpen,
}) => {
  return (
    <header className="h-12 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] sticky top-0 z-40 px-6 flex items-center justify-between select-none">
      <div className="max-w-[1600px] w-full mx-auto flex items-center justify-between gap-4">
        {/* Left: Reticle mark, Wordmark, and Version Badge */}
        <div className="flex items-center gap-2.5">
          <Reticle size={16} />
          <span className="font-sans text-[16px] font-semibold tracking-tight text-[var(--text-primary)]">
            AegnyxZero
          </span>
          <span className="font-mono text-xs text-[var(--text-tertiary)] border border-[var(--border-subtle)] px-1.5 py-0.2 rounded-[4px]">
            {datasetVersion || 'v1.0'}
          </span>
        </div>

        {/* Center / Right: Flat Status Pill and Navigation Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Status pill: flat, no blur, neutral dot */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] border border-[var(--border-subtle)] px-2.5 py-0.5 text-xs font-mono text-[var(--text-secondary)]">
            <StatusDot live={isBackendConnected} />
            <span>{isBackendConnected ? `LIVE · ${datasetVersion}` : `OFFLINE · ${datasetVersion}`}</span>
          </div>

          <div className="h-4 w-[1px] bg-[var(--border-subtle)] hidden sm:block" />

          {/* Quick Action Buttons: 13px text-secondary, hover text-primary */}
          <button
            onClick={onOpenFormula}
            className="inline-flex items-center gap-1.5 text-[13px] px-2.5 py-1 rounded-[6px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
            title="Inspect scoring formula and weight assumptions"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Score Formula</span>
          </button>

          <button
            onClick={onOpenReviewLog}
            className="inline-flex items-center gap-1.5 text-[13px] px-2.5 py-1 rounded-[6px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
            title="View expert approval and flag history"
          >
            <Database className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Review Log</span>
          </button>

          <button
            onClick={onOpenAbout}
            className="inline-flex items-center gap-1.5 text-[13px] px-2.5 py-1 rounded-[6px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
            title="NASA data sources, team info, and data limitations"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Data & Limits</span>
          </button>

          {/* Ask Safety AI trigger: neutral active state */}
          <button
            onClick={onToggleAskAI}
            className={`inline-flex items-center gap-1.5 text-[13px] px-3 py-1 rounded-[6px] font-medium transition-colors border ${
              askAIOpen
                ? 'bg-[var(--chrome-active-bg)] text-[var(--text-primary)] border-[var(--border-strong)]'
                : 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-white/[0.08]'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Ask Safety AI</span>
          </button>
        </div>
      </div>
    </header>
  )
}

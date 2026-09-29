import React from 'react'
import { Flame, Shield, HelpCircle, BookOpen, MessageSquare, Database } from 'lucide-react'

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
    <header className="border-b border-border/80 bg-card/60 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500/20 via-red-500/20 to-amber-500/20 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.15)]">
            <Shield className="h-6 w-6 text-orange-400 absolute" />
            <Flame className="h-4 w-4 text-amber-300 relative z-10 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-orange-400 via-rose-400 to-amber-300 bg-clip-text text-transparent">
                AegnyxZero
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                NASA Space Apps
              </span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>Evidence-First Microgravity Fire Safety</span>
              <span className="text-muted-foreground/40">&middot;</span>
              <span className="font-mono text-[11px] text-muted-foreground/80">33 Verified Experiments</span>
            </p>
          </div>
        </div>

        {/* Status indicators & Actions */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Connection status badge */}
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-mono transition-colors ${
              isBackendConnected
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isBackendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{isBackendConnected ? `Live API (${datasetVersion})` : 'Offline Snapshot (v1.1)'}</span>
          </div>

          {/* Quick Action Navigation */}
          <button
            onClick={onOpenFormula}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border bg-secondary/40 text-foreground hover:bg-secondary hover:border-border/80 transition"
            title="Inspect scoring formula and weight assumptions"
          >
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Score Formula</span>
          </button>

          <button
            onClick={onOpenReviewLog}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border bg-secondary/40 text-foreground hover:bg-secondary hover:border-border/80 transition"
            title="View expert approval and flag history"
          >
            <Database className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Review Log</span>
          </button>

          <button
            onClick={onOpenAbout}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border bg-secondary/40 text-foreground hover:bg-secondary hover:border-border/80 transition"
            title="NASA data sources, team info, and data limitations"
          >
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Data & Limits</span>
          </button>

          <button
            onClick={onToggleAskAI}
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition shadow-sm ${
              askAIOpen
                ? 'bg-orange-500 text-white shadow-orange-500/20'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-95'
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

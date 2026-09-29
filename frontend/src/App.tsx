import { useEffect, useState, useRef } from 'react'
import { Header } from './components/Header'
import { ConditionsBar } from './components/ConditionsBar'
import { RankedTable } from './components/RankedTable'
import { EvidenceDrawer } from './components/EvidenceDrawer'
import { ComparisonCharts } from './components/ComparisonCharts'
import { CoverageMap } from './components/CoverageMap'
import { AskAIDrawer } from './components/AskAIDrawer'
import { ScoreFormulaModal, ReviewLogModal, AboutModal } from './components/Modals'
import type {
  MaterialRanking,
  Experiment,
  Source,
  CoverageData,
  UserConditions,
  FeedbackItem,
} from './types'
import snapshotData from './data/snapshot.json'

const DEFAULT_CONDITIONS: UserConditions = {
  o2_percent: 30.0,
  pressure_kpa: 70.0,
  flow_velocity_cm_s: 5.0,
  gravity_level: 'microgravity',
  material_class: 'all',
}

function App() {
  const [conditions, setConditions] = useState<UserConditions>(DEFAULT_CONDITIONS)
  const [isBackendConnected, setIsBackendConnected] = useState(false)
  const [datasetVersion, setDatasetVersion] = useState('v1.1')

  const [experiments, setExperiments] = useState<Experiment[]>(
    (snapshotData.experiments as unknown as Experiment[]) || []
  )
  const [sources, setSources] = useState<Source[]>(
    (snapshotData.sources as unknown as Source[]) || []
  )
  const [rankings, setRankings] = useState<MaterialRanking[]>(
    (snapshotData.default_lunar_rankings as unknown as MaterialRanking[]) || []
  )
  const [coverage, setCoverage] = useState<CoverageData | null>(
    (snapshotData.coverage as unknown as CoverageData) || null
  )

  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null)
  const [chartMaterials, setChartMaterials] = useState<string[]>([
    'PMMA (cast acrylic)',
    'SIBAL fabric',
    'Nomex HT90-40',
    'Cellulose Kimwipes',
  ])

  // Modals state
  const [isFormulaOpen, setIsFormulaOpen] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [isAskAIOpen, setIsAskAIOpen] = useState(false)
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])

  const debounceTimer = useRef<number | null>(null)

  // 1. Initial Health and Dataset Check
  useEffect(() => {
    fetch('http://localhost:8000/health')
      .then((res) => res.json())
      .then((data) => {
        setIsBackendConnected(true)
        if (data.dataset_version) setDatasetVersion(data.dataset_version)
      })
      .catch((err) => {
        console.warn('Backend unreachable on mount, using bundled snapshot:', err)
        setIsBackendConnected(false)
      })

    // Fetch initial experiments and sources from live backend if available
    fetch('http://localhost:8000/experiments')
      .then((res) => res.json())
      .then((data: Experiment[]) => {
        if (data && data.length > 0) setExperiments(data)
      })
      .catch(() => {})

    fetch('http://localhost:8000/sources')
      .then((res) => res.json())
      .then((data: Source[]) => {
        if (data && data.length > 0) setSources(data)
      })
      .catch(() => {})

    fetch('http://localhost:8000/feedback')
      .then((res) => res.json())
      .then((data: FeedbackItem[]) => {
        if (data) setFeedbacks(data)
      })
      .catch(() => {})
  }, [])

  // 2. Fetch Ranking & Coverage with 300ms Debounce (PRD US-1 AC4)
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    debounceTimer.current = window.setTimeout(async () => {
      try {
        const [rankingRes, coverageRes] = await Promise.all([
          fetch('http://localhost:8000/risk-ranking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(conditions),
          }),
          fetch('http://localhost:8000/coverage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(conditions),
          }),
        ])

        if (rankingRes.ok && coverageRes.ok) {
          const rankData = await rankingRes.json()
          const covData = await coverageRes.json()
          setRankings(rankData.materials)
          setCoverage(covData)
          setIsBackendConnected(true)
        }
      } catch (err) {
        // Keep current snapshot or calculate client-side if disconnected
        setIsBackendConnected(false)
      }
    }, 300)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [conditions])

  // 3. Toggle Material in Comparison Charts
  const handleToggleChartMaterial = (matName: string) => {
    setChartMaterials((prev) =>
      prev.includes(matName) ? prev.filter((m) => m !== matName) : [...prev, matName]
    )
  }

  // 4. Export Ranking (US-10)
  const handleExport = (format: 'csv' | 'json') => {
    const url = `http://localhost:8000/export?format=${format}&o2_percent=${conditions.o2_percent}&pressure_kpa=${conditions.pressure_kpa}&flow_velocity_cm_s=${conditions.flow_velocity_cm_s}&gravity_level=${conditions.gravity_level}`
    window.open(url, '_blank')
  }

  // 5. Submit Expert Feedback (US-8)
  const handleSubmitFeedback = async (
    targetType: string,
    targetId: string,
    action: string,
    note?: string
  ) => {
    try {
      const res = await fetch('http://localhost:8000/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          action: action,
          note: note,
        }),
      })

      if (res.ok) {
        const item: FeedbackItem = await res.json()
        setFeedbacks((prev) => [item, ...prev])
      }
    } catch {
      // Local fallback for offline mode
      const localItem: FeedbackItem = {
        id: Date.now(),
        target_type: targetType,
        target_id: targetId,
        action: action,
        note: note,
        created_at: new Date().toISOString(),
      }
      setFeedbacks((prev) => [localItem, ...prev])
    }
  }

  const selectedMaterialData =
    rankings.find((r) => r.material_name === selectedMaterial) || null

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased selection:bg-orange-500/30 selection:text-orange-200">
      {/* ─── Navigation Header ─── */}
      <Header
        isBackendConnected={isBackendConnected}
        datasetVersion={datasetVersion}
        onOpenFormula={() => setIsFormulaOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenReviewLog={() => setIsReviewOpen(true)}
        onToggleAskAI={() => setIsAskAIOpen(!isAskAIOpen)}
        askAIOpen={isAskAIOpen}
      />

      {/* ─── Main Content Canvas ─── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        {/* Conditions Control Panel & Presets */}
        <ConditionsBar
          conditions={conditions}
          onChange={setConditions}
          onExport={handleExport}
        />

        {/* Dashboard 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Ranked Risk Table (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <RankedTable
              rankings={rankings}
              selectedMaterial={selectedMaterial}
              onSelectMaterial={setSelectedMaterial}
              chartMaterials={chartMaterials}
              onToggleChartMaterial={handleToggleChartMaterial}
              onOpenFormula={() => setIsFormulaOpen(true)}
            />
          </div>

          {/* Right Column: Comparison Trends & Coverage Map (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <ComparisonCharts
              experiments={experiments}
              selectedMaterials={chartMaterials}
            />

            <CoverageMap coverage={coverage} conditions={conditions} />
          </div>
        </div>
      </main>

      {/* ─── Slide-over Drawers & Modals ─── */}
      {selectedMaterial && (
        <EvidenceDrawer
          material={selectedMaterialData}
          experiments={experiments}
          sources={sources}
          onClose={() => setSelectedMaterial(null)}
          onSubmitFeedback={handleSubmitFeedback}
        />
      )}

      <AskAIDrawer
        isOpen={isAskAIOpen}
        onClose={() => setIsAskAIOpen(false)}
        conditions={conditions}
        onSubmitFeedback={handleSubmitFeedback}
      />

      <ScoreFormulaModal
        isOpen={isFormulaOpen}
        onClose={() => setIsFormulaOpen(false)}
      />

      <ReviewLogModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        feedbacks={feedbacks}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/80 px-6 py-4 mt-8 bg-card/40 backdrop-blur text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">AegnyxZero</span>
            <span>&middot;</span>
            <span>NASA Space Apps Challenge 2026</span>
            <span>&middot;</span>
            <span className="font-mono text-[11px] text-orange-400">Team Turtlers (Dhaka)</span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span>Problem 8: Flame in Freefall</span>
            <span>&middot;</span>
            <span>Deterministic Math &middot; Zero Hallucination</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App

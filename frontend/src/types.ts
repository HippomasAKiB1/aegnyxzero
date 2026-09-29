export interface Source {
  id: string
  title?: string
  authors?: string
  year?: number
  doi?: string
  url?: string
  type?: string
  license?: string
}

export interface Experiment {
  id: string
  material_name: string
  material_class?: string
  geometry?: string
  thickness_mm?: number
  oxidizer?: string
  o2_percent?: number
  pressure_kpa?: number
  flow_velocity_cm_s?: number
  gravity_level?: string
  gravity_g?: number
  facility?: string
  ignition_method?: string
  outcome?: string
  spread_rate_mm_s?: number
  notes?: string
  source_id?: string
  source_page?: string
  evidence_span?: string
  verified?: number
  verified_by?: string
  verified_at?: string
}

export interface MaterialRanking {
  rank: number
  material_name: string
  score: number | null
  band: string | null
  confidence: string
  confidence_reasons: string[]
  insufficient_evidence: boolean
  num_experiments: number
  num_sources: number
  evidence_ids: string[]
  limitations: string[]
}

export interface UserConditions {
  o2_percent: number
  pressure_kpa: number
  flow_velocity_cm_s: number
  gravity_level: string
  material_class: string
}

export interface CoverageCell {
  o2_bin: string
  p_bin: string
  count: number
  has_user_condition: boolean
  experiment_ids: string[]
}

export interface CoverageData {
  grid: CoverageCell[]
  o2_labels: string[]
  p_labels: string[]
  tested_cells: number
  untested_cells: number
  total_cells: number
  gap_percentage: number
  closeness_statement: string
  total_experiments_analyzed: number
}

export interface AskFindingNumber {
  value: number
  unit: string
  label: string
  experiment_id: string
}

export interface AskFindingEvidence {
  experiment_id: string
  source_id: string
  page: string
}

export interface AskFinding {
  claim: string
  numbers: AskFindingNumber[]
  evidence: AskFindingEvidence[]
}

export interface ValidationCheck {
  id: string
  name: string
  status: string
  message: string
}

export interface AskResponse {
  answer_id: string
  question: string
  summary: string
  findings: AskFinding[]
  confidence: {
    level: string
    score: number
    reasons: string[]
  }
  limitations: string[]
  validation: {
    passed: boolean
    checks: ValidationCheck[]
  }
  follow_ups: string[]
  meta: {
    provider: string
    model: string
    cached: boolean
    dataset_version: string
    latency_ms: number
  }
}

export interface FeedbackItem {
  id: number
  target_type: string
  target_id: string
  action: string
  note?: string
  created_at: string
}

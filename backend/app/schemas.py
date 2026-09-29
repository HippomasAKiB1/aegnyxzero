"""
Pydantic schemas for AegnyxZero API responses.
Maps to the SQLAlchemy models in models.py (PRD Section 11.2).
"""

from typing import Optional
from pydantic import BaseModel


# ─── Source schemas ───────────────────────────────────────────────

class SourceBase(BaseModel):
    id: str
    title: Optional[str] = None
    authors: Optional[str] = None
    year: Optional[int] = None
    doi: Optional[str] = None
    url: Optional[str] = None
    type: Optional[str] = None
    license: Optional[str] = None
    local_path: Optional[str] = None


class SourceResponse(SourceBase):
    """Schema returned by GET /sources and GET /sources/{id}."""

    model_config = {"from_attributes": True}


# ─── Experiment schemas ───────────────────────────────────────────

class ExperimentBase(BaseModel):
    id: str
    material_name: Optional[str] = None
    material_class: Optional[str] = None
    geometry: Optional[str] = None
    thickness_mm: Optional[float] = None
    oxidizer: Optional[str] = "O2/N2"
    o2_percent: Optional[float] = None
    pressure_kpa: Optional[float] = None
    flow_velocity_cm_s: Optional[float] = None
    gravity_level: Optional[str] = None
    gravity_g: Optional[float] = None
    facility: Optional[str] = None
    ignition_method: Optional[str] = None
    outcome: Optional[str] = None
    spread_rate_mm_s: Optional[float] = None
    notes: Optional[str] = None
    source_id: Optional[str] = None
    source_page: Optional[str] = None
    evidence_span: Optional[str] = None
    extraction_method: Optional[str] = None
    extraction_confidence: Optional[float] = None
    verified: Optional[int] = 0
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None


class ExperimentResponse(ExperimentBase):
    """Schema returned by GET /experiments and GET /experiments/{id}."""

    model_config = {"from_attributes": True}


# ─── Health check schema ──────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    dataset_version: str
    mode: str


# ─── Risk ranking schemas ─────────────────────────────────────────

class RiskRankingRequest(BaseModel):
    """POST /risk-ranking request body (PRD §14.2)."""
    o2_percent: Optional[float] = None
    pressure_kpa: Optional[float] = None
    flow_velocity_cm_s: Optional[float] = None
    gravity_level: Optional[str] = None
    material_class: Optional[str] = None


class MaterialRanking(BaseModel):
    """A single material's risk ranking result."""
    rank: int
    material_name: str
    score: Optional[float] = None
    band: Optional[str] = None
    confidence: str
    confidence_reasons: list[str] = []
    insufficient_evidence: bool = False
    num_experiments: int = 0
    num_sources: int = 0
    evidence_ids: list[str] = []
    limitations: list[str] = []


class RiskRankingResponse(BaseModel):
    """POST /risk-ranking response body."""
    conditions: RiskRankingRequest
    materials: list[MaterialRanking]
    dataset_version: str = "v1"
    score_version: int = 2


# ─── Coverage schemas (PRD §14.2) ─────────────────────────────────

class CoverageRequest(BaseModel):
    o2_percent: Optional[float] = None
    pressure_kpa: Optional[float] = None
    flow_velocity_cm_s: Optional[float] = None
    gravity_level: Optional[str] = None
    material_class: Optional[str] = None


class CoverageCell(BaseModel):
    o2_bin: str
    p_bin: str
    count: int
    has_user_condition: bool
    experiment_ids: list[str] = []


class CoverageResponse(BaseModel):
    grid: list[CoverageCell]
    o2_labels: list[str]
    p_labels: list[str]
    tested_cells: int
    untested_cells: int
    total_cells: int
    gap_percentage: float
    closeness_statement: str
    total_experiments_analyzed: int


# ─── Ask AI schemas (PRD §14.4) ───────────────────────────────────

class AskRequest(BaseModel):
    question: str
    conditions: Optional[RiskRankingRequest] = None


class AskFindingNumber(BaseModel):
    value: float
    unit: str
    label: str
    experiment_id: str


class AskFindingEvidence(BaseModel):
    experiment_id: str
    source_id: str
    page: str


class AskFinding(BaseModel):
    claim: str
    numbers: list[AskFindingNumber] = []
    evidence: list[AskFindingEvidence] = []


class AskConfidence(BaseModel):
    level: str
    score: float
    reasons: list[str] = []


class ValidationCheck(BaseModel):
    id: str
    name: str
    status: str
    message: str


class ValidationSummary(BaseModel):
    passed: bool
    checks: list[ValidationCheck] = []


class AskMeta(BaseModel):
    provider: str
    model: str
    cached: bool = False
    dataset_version: str = "v1"
    latency_ms: int = 0


class AskResponse(BaseModel):
    answer_id: str
    question: str
    summary: str
    findings: list[AskFinding] = []
    confidence: AskConfidence
    limitations: list[str] = []
    validation: ValidationSummary
    follow_ups: list[str] = []
    meta: AskMeta


# ─── Feedback schemas (PRD §14.2 & US-8) ──────────────────────────

class FeedbackCreate(BaseModel):
    target_type: str  # "experiment" or "answer"
    target_id: str
    action: str       # "approve" or "flag"
    note: Optional[str] = None


class FeedbackResponse(FeedbackCreate):
    id: int
    created_at: str

    model_config = {"from_attributes": True}



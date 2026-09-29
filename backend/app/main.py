"""
AegnyxZero — FastAPI application entry point.
Implements REST API endpoints per PRD Section 14.2.
"""

import io
import os
import csv
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Load environment variables from project root .env
load_dotenv()
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")


from .database import engine, get_db, Base
from .models import Experiment, Source, Feedback
from .schemas import (
    HealthResponse,
    ExperimentResponse,
    SourceResponse,
    RiskRankingRequest,
    RiskRankingResponse,
    MaterialRanking,
    CoverageRequest,
    CoverageResponse,
    AskRequest,
    AskResponse,
    FeedbackCreate,
    FeedbackResponse,
)
from .scoring import ExperimentRow, UserConditions, rank_materials
from .coverage import compute_coverage
from .ask_ai import handle_ask_query

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AegnyxZero API",
    description="Evidence-first fire safety for human spaceflight",
    version="0.1.0",
)

# Allow frontend dev server to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health():
    """Liveness probe + dataset version + mode (PRD §14.2)."""
    return {"status": "ok", "dataset_version": "v1", "mode": "demo"}


@app.get("/sources", response_model=list[SourceResponse])
def list_sources(db: Session = Depends(get_db)):
    """Return all bibliographic sources."""
    return db.query(Source).all()


@app.get("/sources/{source_id}", response_model=SourceResponse)
def get_source(source_id: str, db: Session = Depends(get_db)):
    """Return a single source by ID."""
    src = db.query(Source).filter(Source.id == source_id).first()
    if not src:
        raise HTTPException(status_code=404, detail=f"Source {source_id} not found")
    return src


@app.get("/experiments", response_model=list[ExperimentResponse])
def list_experiments(
    material_class: Optional[str] = None,
    gravity_level: Optional[str] = None,
    o2_min: Optional[float] = None,
    o2_max: Optional[float] = None,
    p_min: Optional[float] = None,
    p_max: Optional[float] = None,
    outcome: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = 0,
    db: Session = Depends(get_db),
):
    """Return experiments with optional filtering (PRD §14.2)."""
    query = db.query(Experiment)

    if material_class and material_class.lower() != "all":
        query = query.filter(Experiment.material_class == material_class)
    if gravity_level and gravity_level.lower() != "any":
        query = query.filter(Experiment.gravity_level == gravity_level)
    if o2_min is not None:
        query = query.filter(Experiment.o2_percent >= o2_min)
    if o2_max is not None:
        query = query.filter(Experiment.o2_percent <= o2_max)
    if p_min is not None:
        query = query.filter(Experiment.pressure_kpa >= p_min)
    if p_max is not None:
        query = query.filter(Experiment.pressure_kpa <= p_max)
    if outcome and outcome.lower() != "all":
        query = query.filter(Experiment.outcome == outcome)

    if offset:
        query = query.offset(offset)
    if limit:
        query = query.limit(limit)

    return query.all()


@app.get("/experiments/{experiment_id}", response_model=ExperimentResponse)
def get_experiment(experiment_id: str, db: Session = Depends(get_db)):
    """Return a single experiment by ID."""
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail=f"Experiment {experiment_id} not found")
    return exp


def _orm_to_row(exp: Experiment) -> ExperimentRow:
    """Convert an SQLAlchemy Experiment ORM object to an ExperimentRow for scoring."""
    return ExperimentRow(
        id=exp.id,
        material_name=exp.material_name or "Unknown",
        material_class=exp.material_class,
        o2_percent=exp.o2_percent,
        pressure_kpa=exp.pressure_kpa,
        flow_velocity_cm_s=exp.flow_velocity_cm_s,
        gravity_level=exp.gravity_level,
        outcome=exp.outcome,
        spread_rate_mm_s=exp.spread_rate_mm_s,
        source_id=exp.source_id,
        verified=exp.verified or 0,
    )


@app.post("/risk-ranking", response_model=RiskRankingResponse)
def risk_ranking(body: RiskRankingRequest, db: Session = Depends(get_db)):
    """
    Compute ranked risk for all materials given user conditions (PRD §14.2).
    """
    experiments = db.query(Experiment).all()
    rows = [_orm_to_row(exp) for exp in experiments]

    conditions = UserConditions(
        o2_percent=body.o2_percent,
        pressure_kpa=body.pressure_kpa,
        flow_velocity_cm_s=body.flow_velocity_cm_s,
        gravity_level=body.gravity_level,
        material_class=body.material_class,
    )

    scored = rank_materials(rows, conditions)

    materials = [
        MaterialRanking(
            rank=i + 1,
            material_name=m.material_name,
            score=m.score,
            band=m.band,
            confidence=m.confidence,
            confidence_reasons=m.confidence_reasons,
            insufficient_evidence=m.insufficient_evidence,
            num_experiments=m.num_experiments,
            num_sources=m.num_sources,
            evidence_ids=m.evidence_ids,
            limitations=m.limitations,
        )
        for i, m in enumerate(scored)
    ]

    return RiskRankingResponse(
        conditions=body,
        materials=materials,
    )


@app.post("/coverage", response_model=CoverageResponse)
def coverage(body: CoverageRequest, db: Session = Depends(get_db)):
    """
    Compute O2 × pressure parameter coverage grid and closeness assessment (PRD US-5, FR-5).
    """
    experiments = db.query(Experiment).all()
    res = compute_coverage(
        experiments=experiments,
        user_o2=body.o2_percent,
        user_p=body.pressure_kpa,
        material_class_filter=body.material_class,
        gravity_filter=body.gravity_level,
    )
    return res


@app.post("/ask", response_model=AskResponse)
async def ask(body: AskRequest, db: Session = Depends(get_db)):
    """
    Plain-English safety QA with cited evidence and deterministic validation (PRD US-6, FR-6).
    """
    if os.getenv("USE_V2_PIPELINE", "false").lower() == "true":
        from .pipeline_v2 import run_pipeline
        cond_dict = body.conditions.model_dump() if body.conditions else {}
        result = await run_pipeline(question=body.question, conditions=cond_dict)
    else:
        cond_dict = body.conditions.model_dump() if body.conditions else None
        result = handle_ask_query(body.question, cond_dict, db)
    return result


@app.post("/feedback", response_model=FeedbackResponse)
def create_feedback(body: FeedbackCreate, db: Session = Depends(get_db)):
    """
    Save expert approval or flag (PRD US-8, FR-12).
    """
    entry = Feedback(
        target_type=body.target_type,
        target_id=body.target_id,
        action=body.action,
        note=body.note,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@app.get("/feedback", response_model=list[FeedbackResponse])
def list_feedback(db: Session = Depends(get_db)):
    """Return all expert reviews for the Review Log."""
    return db.query(Feedback).order_by(Feedback.id.desc()).all()


@app.get("/export")
def export_ranking(
    o2_percent: Optional[float] = 30.0,
    pressure_kpa: Optional[float] = 70.0,
    flow_velocity_cm_s: Optional[float] = 5.0,
    gravity_level: Optional[str] = "microgravity",
    material_class: Optional[str] = None,
    format: str = Query("csv", pattern="^(csv|json)$"),
    db: Session = Depends(get_db),
):
    """
    Export ranked table and evidence as CSV or JSON (PRD US-10, FR-13).
    """
    experiments = db.query(Experiment).all()
    rows = [_orm_to_row(exp) for exp in experiments]

    cond = UserConditions(
        o2_percent=o2_percent,
        pressure_kpa=pressure_kpa,
        flow_velocity_cm_s=flow_velocity_cm_s,
        gravity_level=gravity_level,
        material_class=material_class,
    )
    ranked = rank_materials(rows, cond)

    if format == "json":
        export_data = {
            "metadata": {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "score_formula_version": 2,
                "conditions": {
                    "o2_percent": o2_percent,
                    "pressure_kpa": pressure_kpa,
                    "flow_velocity_cm_s": flow_velocity_cm_s,
                    "gravity_level": gravity_level,
                },
                "total_materials": len(ranked),
            },
            "rankings": [
                {
                    "rank": idx + 1,
                    "material": m.material_name,
                    "score": m.score,
                    "band": m.band,
                    "confidence": m.confidence,
                    "reasons": m.confidence_reasons,
                    "insufficient_evidence": m.insufficient_evidence,
                    "evidence_experiment_ids": m.evidence_ids,
                    "limitations": m.limitations,
                }
                for idx, m in enumerate(ranked)
            ],
        }
        return export_data

    # Return CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["# AegnyxZero Risk Ranking Export"])
    writer.writerow([f"# Timestamp: {datetime.now(timezone.utc).isoformat()}"])
    writer.writerow([f"# Conditions: O2={o2_percent}%, P={pressure_kpa}kPa, Flow={flow_velocity_cm_s}cm/s, Gravity={gravity_level}"])
    writer.writerow([f"# Score Formula: v2 (0.6*Outcome + 0.4*NormalizedSpread)"])
    writer.writerow([])
    writer.writerow(["Rank", "Material", "Risk Score", "Risk Band", "Confidence", "Supporting Experiments", "Distinct Sources", "Evidence IDs", "Limitations"])

    for idx, m in enumerate(ranked):
        writer.writerow([
            idx + 1,
            m.material_name,
            f"{m.score:.1f}" if m.score is not None else "N/A",
            m.band or "Insufficient Evidence",
            m.confidence,
            m.num_experiments,
            m.num_sources,
            "; ".join(m.evidence_ids),
            "; ".join(m.limitations),
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=aegnyxzero_risk_rankings.csv"},
    )

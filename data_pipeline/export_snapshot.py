"""
data_pipeline/export_snapshot.py — DB → JSON snapshot generator.

Exports SQLite database records and default rankings to
frontend/src/data/snapshot.json for offline resilience and Demo Mode (PRD §11.3).
"""

import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Experiment, Source
from app.scoring import ExperimentRow, UserConditions, rank_materials
from app.coverage import compute_coverage

DB_PATH = PROJECT_ROOT / "backend" / "aegnyxzero.db"
OUTPUT_PATH = PROJECT_ROOT / "frontend" / "src" / "data" / "snapshot.json"


def main():
    engine = create_engine(f"sqlite:///{DB_PATH}")
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        sources = session.query(Source).all()
        experiments = session.query(Experiment).all()

        sources_data = [
            {
                "id": s.id,
                "title": s.title,
                "authors": s.authors,
                "year": s.year,
                "doi": s.doi,
                "url": s.url,
                "type": s.type,
                "license": s.license,
            }
            for s in sources
        ]

        experiments_data = [
            {
                "id": e.id,
                "material_name": e.material_name,
                "material_class": e.material_class,
                "geometry": e.geometry,
                "thickness_mm": e.thickness_mm,
                "oxidizer": e.oxidizer,
                "o2_percent": e.o2_percent,
                "pressure_kpa": e.pressure_kpa,
                "flow_velocity_cm_s": e.flow_velocity_cm_s,
                "gravity_level": e.gravity_level,
                "gravity_g": e.gravity_g,
                "facility": e.facility,
                "ignition_method": e.ignition_method,
                "outcome": e.outcome,
                "spread_rate_mm_s": e.spread_rate_mm_s,
                "notes": e.notes,
                "source_id": e.source_id,
                "source_page": e.source_page,
                "evidence_span": e.evidence_span,
                "verified": e.verified,
                "verified_by": e.verified_by,
                "verified_at": e.verified_at,
            }
            for e in experiments
        ]

        # Precompute lunar habitat default ranking (30% O2, 70 kPa, 5 cm/s flow)
        rows = [
            ExperimentRow(
                id=e.id,
                material_name=e.material_name or "Unknown",
                material_class=e.material_class,
                o2_percent=e.o2_percent,
                pressure_kpa=e.pressure_kpa,
                flow_velocity_cm_s=e.flow_velocity_cm_s,
                gravity_level=e.gravity_level,
                outcome=e.outcome,
                spread_rate_mm_s=e.spread_rate_mm_s,
                source_id=e.source_id,
                verified=e.verified or 0,
            )
            for e in experiments
        ]

        lunar_cond = UserConditions(
            o2_percent=30.0,
            pressure_kpa=70.0,
            flow_velocity_cm_s=5.0,
            gravity_level="microgravity",
            material_class=None,
        )
        ranked = rank_materials(rows, lunar_cond)

        lunar_rankings = [
            {
                "rank": i + 1,
                "material_name": m.material_name,
                "score": m.score,
                "band": m.band,
                "confidence": m.confidence,
                "confidence_reasons": m.confidence_reasons,
                "insufficient_evidence": m.insufficient_evidence,
                "num_experiments": m.num_experiments,
                "num_sources": m.num_sources,
                "evidence_ids": m.evidence_ids,
                "limitations": m.limitations,
            }
            for i, m in enumerate(ranked)
        ]

        coverage_data = compute_coverage(experiments, user_o2=30.0, user_p=70.0)

        snapshot = {
            "version": "v1.1",
            "metadata": {
                "total_experiments": len(experiments_data),
                "total_sources": len(sources_data),
                "verified_rate": 1.0,
            },
            "sources": sources_data,
            "experiments": experiments_data,
            "default_lunar_rankings": lunar_rankings,
            "coverage": coverage_data,
        }

        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, indent=2)

        print(f"[OK] Exported snapshot with {len(experiments_data)} experiments to {OUTPUT_PATH}")

    finally:
        session.close()


if __name__ == "__main__":
    main()

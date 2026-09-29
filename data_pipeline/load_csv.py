"""
data_pipeline/load_csv.py — CSV → SQLite data adapter for AegnyxZero.

Reads sources.csv and seed_data.csv, validates against PRD Section 11.3
Data QA rules, and inserts valid rows into the SQLite database.

Usage:
    python -m data_pipeline.load_csv
    # or from project root:
    python data_pipeline/load_csv.py
"""

import csv
import sys
import os
from pathlib import Path

# Add backend to path so we can import the ORM models
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import Source, Experiment


# ─── Configuration ────────────────────────────────────────────────

DATA_DIR = PROJECT_ROOT / "data"
SOURCES_CSV = DATA_DIR / "sources.csv"
SEED_CSV = DATA_DIR / "seed_data.csv"
DB_PATH = PROJECT_ROOT / "backend" / "aegnyxzero.db"
DB_URL = f"sqlite:///{DB_PATH}"

VALID_OUTCOMES = {
    "sustained_spread",
    "marginal",
    "extinguished",
    "no_ignition",
    "unknown",
}

VALID_GRAVITY_LEVELS = {
    "microgravity",
    "partial_g",
    "normal_g",
}


# ─── Helpers ──────────────────────────────────────────────────────

def _parse_float(val: str) -> float | None:
    """Convert a CSV value to float, returning None for empty strings."""
    val = val.strip()
    if val == "" or val.lower() == "null":
        return None
    return float(val)


def _parse_int(val: str) -> int | None:
    """Convert a CSV value to int, returning None for empty strings."""
    val = val.strip()
    if val == "" or val.lower() == "null":
        return None
    return int(val)


def _parse_text(val: str) -> str | None:
    """Return None for empty CSV values."""
    val = val.strip()
    return val if val else None


# ─── Validation (PRD §11.3 Data QA rules) ────────────────────────

def validate_experiment(row: dict, row_num: int) -> list[str]:
    """
    Validate a single experiment row against PRD Section 11.3 QA rules.
    Returns a list of error messages (empty = valid).
    """
    errors: list[str] = []

    # Must have source_id and source_page
    if not row.get("source_id", "").strip():
        errors.append("missing source_id")
    if not row.get("source_page", "").strip():
        errors.append("missing source_page")

    # O₂ in [0, 100]
    o2 = _parse_float(row.get("o2_percent", ""))
    if o2 is not None and (o2 < 0 or o2 > 100):
        errors.append(f"o2_percent={o2} not in [0, 100]")

    # Pressure > 0
    pressure = _parse_float(row.get("pressure_kpa", ""))
    if pressure is not None and pressure <= 0:
        errors.append(f"pressure_kpa={pressure} must be > 0")

    # Spread rate ≥ 0 or NULL
    spread = _parse_float(row.get("spread_rate_mm_s", ""))
    if spread is not None and spread < 0:
        errors.append(f"spread_rate_mm_s={spread} must be ≥ 0")

    # Outcome from the enum
    outcome = row.get("outcome", "").strip()
    if outcome and outcome not in VALID_OUTCOMES:
        errors.append(
            f"outcome='{outcome}' not in {VALID_OUTCOMES}"
        )

    # Gravity level validation
    gravity = row.get("gravity_level", "").strip()
    if gravity and gravity not in VALID_GRAVITY_LEVELS:
        errors.append(
            f"gravity_level='{gravity}' not in {VALID_GRAVITY_LEVELS}"
        )

    return errors


# ─── Loaders ──────────────────────────────────────────────────────

def load_sources(session, csv_path: Path) -> int:
    """Load sources.csv into the sources table. Returns count loaded."""
    if not csv_path.exists():
        print(f"  ⚠ Sources CSV not found: {csv_path}")
        return 0

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        loaded = 0
        for row in reader:
            source = Source(
                id=row["id"].strip(),
                title=_parse_text(row.get("title", "")),
                authors=_parse_text(row.get("authors", "")),
                year=_parse_int(row.get("year", "")),
                doi=_parse_text(row.get("doi", "")),
                url=_parse_text(row.get("url", "")),
                type=_parse_text(row.get("type", "")),
                license=_parse_text(row.get("license", "")),
                local_path=_parse_text(row.get("local_path", "")),
            )
            session.merge(source)  # upsert
            loaded += 1

        session.commit()
        return loaded


def load_experiments(session, csv_path: Path) -> tuple[int, int]:
    """
    Load seed_data.csv into the experiments table.
    Returns (loaded_count, rejected_count).
    """
    if not csv_path.exists():
        print(f"  ⚠ Experiments CSV not found: {csv_path}")
        return 0, 0

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        loaded = 0
        rejected = 0

        for row_num, row in enumerate(reader, start=2):  # row 1 = header
            errors = validate_experiment(row, row_num)
            if errors:
                rejected += 1
                print(f"  ✗ Row {row_num} (id={row.get('id','?')}): REJECTED")
                for e in errors:
                    print(f"      → {e}")
                continue

            experiment = Experiment(
                id=row["id"].strip(),
                material_name=_parse_text(row.get("material_name", "")),
                material_class=_parse_text(row.get("material_class", "")),
                geometry=_parse_text(row.get("geometry", "")),
                thickness_mm=_parse_float(row.get("thickness_mm", "")),
                oxidizer=_parse_text(row.get("oxidizer", "")) or "O2/N2",
                o2_percent=_parse_float(row.get("o2_percent", "")),
                pressure_kpa=_parse_float(row.get("pressure_kpa", "")),
                flow_velocity_cm_s=_parse_float(row.get("flow_velocity_cm_s", "")),
                gravity_level=_parse_text(row.get("gravity_level", "")),
                gravity_g=_parse_float(row.get("gravity_g", "")),
                facility=_parse_text(row.get("facility", "")),
                ignition_method=_parse_text(row.get("ignition_method", "")),
                outcome=_parse_text(row.get("outcome", "")),
                spread_rate_mm_s=_parse_float(row.get("spread_rate_mm_s", "")),
                notes=_parse_text(row.get("notes", "")),
                source_id=_parse_text(row.get("source_id", "")),
                source_page=_parse_text(row.get("source_page", "")),
                evidence_span=_parse_text(row.get("evidence_span", "")),
                extraction_method=_parse_text(row.get("extraction_method", "")),
                extraction_confidence=_parse_float(row.get("extraction_confidence", "")),
                verified=_parse_int(row.get("verified", "0")),
                verified_by=_parse_text(row.get("verified_by", "")),
                verified_at=_parse_text(row.get("verified_at", "")),
            )
            session.merge(experiment)  # upsert
            loaded += 1

        session.commit()
        return loaded, rejected


# ─── Main ─────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("AegnyxZero Data Loader")
    print("=" * 60)
    print(f"  DB: {DB_PATH}")
    print(f"  Sources CSV: {SOURCES_CSV}")
    print(f"  Experiments CSV: {SEED_CSV}")
    print()

    # Ensure DB directory exists
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Load sources first (FK dependency)
        print("[1/2] Loading sources...")
        src_count = load_sources(session, SOURCES_CSV)
        print(f"  [OK] {src_count} sources loaded.\n")

        # Load experiments
        print("[2/2] Loading experiments...")
        loaded, rejected = load_experiments(session, SEED_CSV)
        print(f"  [OK] {loaded} experiments loaded, {rejected} rejected.\n")

        # Summary
        total_in_db = session.query(Experiment).count()
        verified_count = session.query(Experiment).filter(Experiment.verified == 1).count()
        print("=" * 60)
        print(f"  Total experiments in DB: {total_in_db}")
        print(f"  Verified: {verified_count}")
        print(f"  Sources: {session.query(Source).count()}")
        print("=" * 60)

    finally:
        session.close()


if __name__ == "__main__":
    main()

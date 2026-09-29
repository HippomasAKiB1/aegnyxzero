"""
data_pipeline/build_index.py — Index experiments & evidence into ChromaDB.

Implements PRD Section 10.3 and Section 11.3:
  1. Loads experiments and sources from SQLite database (backend/aegnyxzero.db)
  2. Generates natural-language summaries for every experiment run
  3. Extracts evidence_span chunks linked to each experiment
  4. Embeds all documents locally using BAAI/bge-small-en-v1.5 via sentence-transformers
  5. Stores vectors in persistent ChromaDB at backend/chroma_db/ in collection 'aegnyx_chunks'
  6. Idempotent: drops and recreates collection on each run

Usage:
  python data_pipeline/build_index.py
"""

import os
import sys
from pathlib import Path

# Add backend directory to sys.path so we can import ORM models
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv

load_dotenv(dotenv_path=PROJECT_ROOT / ".env")

import chromadb
from sentence_transformers import SentenceTransformer
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Experiment, Source

DB_PATH = BACKEND_DIR / "aegnyxzero.db"
CHROMA_DIR = BACKEND_DIR / "chroma_db"
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
COLLECTION_NAME = "aegnyx_chunks"


def build_experiment_summary(exp: Experiment) -> str:
    """
    Format a complete natural-language paragraph summary of an experiment run.
    PRD Section 11.3 Stage A format.
    """
    thickness = f", {exp.thickness_mm} mm" if exp.thickness_mm is not None else ""
    geom = f" ({exp.material_class or 'solid'}, {exp.geometry or 'sample'}{thickness})"
    oxidizer = exp.oxidizer or "O2/N2"
    o2 = f"{exp.o2_percent:.1f}% oxygen" if exp.o2_percent is not None else "unspecified oxygen"
    pressure = f"{exp.pressure_kpa:.1f} kPa pressure" if exp.pressure_kpa is not None else "unspecified pressure"
    flow = f"{exp.flow_velocity_cm_s:.1f} cm/s flow velocity" if exp.flow_velocity_cm_s is not None else "quiescent flow"
    gravity = f"{exp.gravity_level or 'microgravity'} conditions"
    facility = f" in the {exp.facility} facility" if exp.facility else ""

    spread_str = (
        f" with a spread rate of {exp.spread_rate_mm_s:.2f} mm/s"
        if exp.spread_rate_mm_s is not None
        else ""
    )
    outcome = f"Outcome: {exp.outcome or 'unknown'}{spread_str}."

    source = f"Source: {exp.source_id or 'unknown'}, {exp.source_page or 'unspecified page'}."
    evidence = f" Evidence: '{exp.evidence_span}'." if exp.evidence_span else ""
    notes = f" Notes: {exp.notes}." if exp.notes else ""

    return (
        f"Experiment {exp.id} tested {exp.material_name}{geom} in {oxidizer} oxidizer at "
        f"{o2}, {pressure}, {flow} under {gravity}{facility}. "
        f"{outcome} {source}{evidence}{notes}"
    ).strip()


def build_evidence_chunk(exp: Experiment) -> str:
    """
    Format an evidence-span excerpt chunk linking back to the experiment.
    """
    return (
        f"Primary evidence from {exp.source_id} ({exp.source_page}) for {exp.material_name} "
        f"(run {exp.id}, outcome: {exp.outcome}): \"{exp.evidence_span}\""
    ).strip()


def main():
    print("=" * 60)
    print("AegnyxZero ChromaDB Vector Indexer")
    print("=" * 60)
    print(f"  SQLite DB:        {DB_PATH}")
    print(f"  Chroma Storage:   {CHROMA_DIR}")
    print(f"  Embedding Model:  {EMBEDDING_MODEL_NAME}")
    print(f"  Collection Name:  {COLLECTION_NAME}")
    print()

    # 1. Connect to SQLite DB
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found at {DB_PATH}. Run load_csv.py first.")

    engine = create_engine(f"sqlite:///{DB_PATH}")
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        experiments = session.query(Experiment).all()
        print(f"[1/4] Loaded {len(experiments)} experiment rows from SQLite.")

        if not experiments:
            print("No experiments found to index.")
            return

        # 2. Build text documents, IDs, and metadata
        docs: list[str] = []
        ids: list[str] = []
        metadatas: list[dict] = []

        summary_count = 0
        evidence_count = 0

        for exp in experiments:
            # A. Full natural-language experiment summary
            summary_text = build_experiment_summary(exp)
            doc_id = f"summary_{exp.id}"
            meta = {
                "experiment_id": exp.id,
                "source_id": exp.source_id or "",
                "source_page": exp.source_page or "",
                "material_name": exp.material_name or "",
                "material_class": exp.material_class or "",
                "gravity_level": exp.gravity_level or "",
                "outcome": exp.outcome or "",
                "o2_percent": float(exp.o2_percent) if exp.o2_percent is not None else -1.0,
                "pressure_kpa": float(exp.pressure_kpa) if exp.pressure_kpa is not None else -1.0,
                "flow_velocity_cm_s": float(exp.flow_velocity_cm_s) if exp.flow_velocity_cm_s is not None else -1.0,
                "spread_rate_mm_s": float(exp.spread_rate_mm_s) if exp.spread_rate_mm_s is not None else -1.0,
                "chunk_type": "summary",
            }
            docs.append(summary_text)
            ids.append(doc_id)
            metadatas.append(meta)
            summary_count += 1

            # B. Direct evidence_span excerpt chunk
            if exp.evidence_span and exp.evidence_span.strip():
                ev_text = build_evidence_chunk(exp)
                ev_id = f"evidence_{exp.id}"
                ev_meta = {
                    "experiment_id": exp.id,
                    "source_id": exp.source_id or "",
                    "source_page": exp.source_page or "",
                    "material_name": exp.material_name or "",
                    "material_class": exp.material_class or "",
                    "gravity_level": exp.gravity_level or "",
                    "outcome": exp.outcome or "",
                    "o2_percent": float(exp.o2_percent) if exp.o2_percent is not None else -1.0,
                    "pressure_kpa": float(exp.pressure_kpa) if exp.pressure_kpa is not None else -1.0,
                    "flow_velocity_cm_s": float(exp.flow_velocity_cm_s) if exp.flow_velocity_cm_s is not None else -1.0,
                    "spread_rate_mm_s": float(exp.spread_rate_mm_s) if exp.spread_rate_mm_s is not None else -1.0,
                    "chunk_type": "evidence_span",
                }
                docs.append(ev_text)
                ids.append(ev_id)
                metadatas.append(ev_meta)
                evidence_count += 1

        total_chunks = len(docs)
        print(f"[2/4] Generated {total_chunks} text chunks ({summary_count} summaries + {evidence_count} evidence spans).")

        # 3. Load embedding model and encode chunks
        print(f"[3/4] Loading local SentenceTransformer model '{EMBEDDING_MODEL_NAME}'...")
        model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        print("      Computing embeddings...")
        embeddings = model.encode(docs, show_progress_bar=False, normalize_embeddings=True)
        embeddings_list = [emb.tolist() for emb in embeddings]
        print(f"      [OK] Computed {len(embeddings_list)} embeddings (dimension {len(embeddings_list[0])}).")

        # 4. Store in ChromaDB collection
        print(f"[4/4] Writing to persistent ChromaDB at {CHROMA_DIR}...")
        CHROMA_DIR.mkdir(parents=True, exist_ok=True)
        client = chromadb.PersistentClient(path=str(CHROMA_DIR))

        # Idempotency: drop existing collection if present
        try:
            client.delete_collection(COLLECTION_NAME)
            print(f"      Dropped existing '{COLLECTION_NAME}' collection.")
        except Exception:
            pass

        collection = client.create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

        collection.add(
            ids=ids,
            documents=docs,
            metadatas=metadatas,
            embeddings=embeddings_list,
        )

        indexed_count = collection.count()
        print("=" * 60)
        print(f"Index successfully built!")
        print(f"  Total experiments: {len(experiments)}")
        print(f"  Total chunks indexed: {indexed_count}")
        print(f"  Summaries indexed: {summary_count}")
        print(f"  Evidence spans indexed: {evidence_count}")
        print("=" * 60)

    finally:
        session.close()


if __name__ == "__main__":
    main()

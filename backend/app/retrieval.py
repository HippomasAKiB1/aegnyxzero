"""
backend/app/retrieval.py — Semantic Vector Retrieval & Citation Assembly.

Implements PRD Section 10.3 (AI Pipeline - Retrieval) & Section 14.4 (Citation Assembly):
  - In-memory cached SentenceTransformer embedding model (BAAI/bge-small-en-v1.5)
  - ChromaDB vector search against persistent collection 'aegnyx_chunks'
  - Metadata filtering (material_class, gravity_level, outcome, etc.)
  - SQLite entity lookup by experiment_id for deterministic citation assembly
"""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import chromadb
from sentence_transformers import SentenceTransformer
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .models import Experiment, Source

# File locations
BACKEND_DIR = Path(__file__).resolve().parent.parent
CHROMA_DIR = BACKEND_DIR / "chroma_db"
DB_PATH = BACKEND_DIR / "aegnyxzero.db"
COLLECTION_NAME = "aegnyx_chunks"

# Module-level singletons for performance
_MODEL: Optional[SentenceTransformer] = None
_CHROMA_CLIENT: Optional[chromadb.PersistentClient] = None


def get_embedding_model() -> SentenceTransformer:
    """Retrieve or initialize the cached local SentenceTransformer embedding model."""
    global _MODEL
    if _MODEL is None:
        model_name = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
        _MODEL = SentenceTransformer(model_name)
    return _MODEL


def get_chroma_collection():
    """Retrieve the ChromaDB persistent collection for aegnyx_chunks."""
    global _CHROMA_CLIENT
    if _CHROMA_CLIENT is None:
        _CHROMA_CLIENT = chromadb.PersistentClient(path=str(CHROMA_DIR))
    return _CHROMA_CLIENT.get_collection(name=COLLECTION_NAME)


def search_experiments(
    query: str,
    top_k: int = 6,
    filters: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Search ChromaDB for relevant experiment summaries and evidence chunks.

    Args:
        query: User question or semantic retrieval query string.
        top_k: Maximum number of chunks to return (default 6).
        filters: Optional dict of metadata filter conditions, e.g.
                 {"material_class": "polymer"} or {"gravity_level": "microgravity"}.

    Returns:
        List of dicts: [
            {
                "experiment_id": str,
                "text": str,
                "metadata": dict,
                "score": float,
            },
            ...
        ]
    """
    if not query or not query.strip():
        return []

    # 1. Prepare metadata filter for ChromaDB
    where_clause = None
    if filters:
        clean_filters = {k: v for k, v in filters.items() if v is not None}
        if len(clean_filters) == 1:
            where_clause = clean_filters
        elif len(clean_filters) > 1:
            where_clause = {"$and": [{k: v} for k, v in clean_filters.items()]}

    # 2. Compute normalized query embedding with cached model
    model = get_embedding_model()
    query_emb = model.encode(query.strip(), normalize_embeddings=True).tolist()

    # 3. Query ChromaDB collection
    collection = get_chroma_collection()
    raw = collection.query(
        query_embeddings=[query_emb],
        n_results=top_k,
        where=where_clause,
    )

    # 4. Format results
    results: List[Dict[str, Any]] = []
    if raw and raw.get("ids") and raw["ids"][0]:
        ids = raw["ids"][0]
        documents = raw["documents"][0] if raw.get("documents") else []
        metadatas = raw["metadatas"][0] if raw.get("metadatas") else []
        distances = raw["distances"][0] if raw.get("distances") else []

        for i in range(len(ids)):
            meta = metadatas[i] if i < len(metadatas) else {}
            doc_text = documents[i] if i < len(documents) else ""
            dist = distances[i] if i < len(distances) else 1.0
            
            # hnsw:space cosine -> distance = 1 - cosine_sim -> score = 1 - distance
            score = round(float(1.0 - dist), 4)

            results.append({
                "experiment_id": meta.get("experiment_id", ""),
                "text": doc_text,
                "metadata": meta,
                "score": score,
            })

    return results


def search_by_experiment_ids(ids: List[str]) -> List[Dict[str, Any]]:
    """
    Fetch raw experiment rows and linked source metadata from SQLite for citation assembly.

    Args:
        ids: List of experiment IDs (e.g. ["exp_0001", "exp_0007"]).

    Returns:
        List of dicts containing full experiment fields and source references.
    """
    if not ids:
        return []

    engine = create_engine(f"sqlite:///{DB_PATH}")
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        experiments = (
            session.query(Experiment)
            .filter(Experiment.id.in_(ids))
            .all()
        )

        exp_map = {exp.id: exp for exp in experiments}
        results = []
        for exp_id in ids:
            exp = exp_map.get(exp_id)
            if exp is None:
                continue

            results.append({
                "id": exp.id,
                "experiment_id": exp.id,
                "material_name": exp.material_name,
                "material_class": exp.material_class,
                "geometry": exp.geometry,
                "thickness_mm": exp.thickness_mm,
                "oxidizer": exp.oxidizer,
                "o2_percent": exp.o2_percent,
                "pressure_kpa": exp.pressure_kpa,
                "flow_velocity_cm_s": exp.flow_velocity_cm_s,
                "gravity_level": exp.gravity_level,
                "gravity_g": exp.gravity_g,
                "facility": exp.facility,
                "ignition_method": exp.ignition_method,
                "outcome": exp.outcome,
                "spread_rate_mm_s": exp.spread_rate_mm_s,
                "notes": exp.notes,
                "source_id": exp.source_id,
                "source_page": exp.source_page,
                "evidence_span": exp.evidence_span,
                "extraction_method": exp.extraction_method,
                "extraction_confidence": exp.extraction_confidence,
                "verified": bool(exp.verified),
                "verified_by": exp.verified_by,
                "verified_at": exp.verified_at,
                "source_title": exp.source.title if exp.source else None,
                "source_authors": exp.source.authors if exp.source else None,
                "source_year": exp.source.year if exp.source else None,
                "source_url": exp.source.url if exp.source else None,
                "source_doi": exp.source.doi if exp.source else None,
            })

        return results
    finally:
        session.close()

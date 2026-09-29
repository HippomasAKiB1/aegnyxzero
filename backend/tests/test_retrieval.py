"""
backend/tests/test_retrieval.py — Integration tests for vector retrieval and citation lookup.

Verifies:
  1. Top result for "PMMA flame spread in microgravity" matches PMMA.
  2. Top result for "extinguished flames at high oxygen" has outcome in {'extinguished', 'marginal'}.
  3. Irrelevant query ("banana smoothie recipe") produces low similarity score.
  4. Metadata filtering restricts returned results to the specified condition (e.g. gravity_level).
  5. Deterministic SQLite lookup by experiment IDs fetches raw rows for citation assembly.
"""

import sys
from pathlib import Path
import pytest

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.retrieval import (
    search_experiments,
    search_by_experiment_ids,
    CHROMA_DIR,
    COLLECTION_NAME,
    get_chroma_collection,
)


@pytest.fixture(scope="session", autouse=True)
def ensure_index_ready():
    """Ensure ChromaDB index exists and is populated before running retrieval tests."""
    collection = get_chroma_collection()
    count = collection.count()
    if count == 0:
        import subprocess
        project_root = BACKEND_DIR.parent
        res = subprocess.run(
            [sys.executable, str(project_root / "data_pipeline" / "build_index.py")],
            check=True,
            capture_output=True,
            text=True,
        )
        print("Indexer output:", res.stdout)
        collection = get_chroma_collection()
        assert collection.count() > 0


def test_retrieval_pmma_query():
    """
    Test 1: Queries 'PMMA flame spread in microgravity'.
    Asserts top result has material_name containing 'PMMA' or contains 'PMMA' in text.
    """
    results = search_experiments("PMMA flame spread in microgravity", top_k=5)
    assert len(results) > 0, "Expected at least 1 retrieval result"

    top = results[0]
    material_name = top["metadata"].get("material_name", "")
    text = top.get("text", "")

    assert "PMMA" in material_name or "PMMA" in text, (
        f"Expected 'PMMA' in top result, got material: '{material_name}', text: '{text[:100]}...'"
    )
    assert top["score"] > 0.70, f"Expected high similarity score for relevant query, got {top['score']}"


def test_retrieval_extinguished_outcome():
    """
    Test 2: Queries 'extinguished flames at high oxygen'.
    Asserts top result's outcome is 'extinguished' or 'marginal'.
    """
    results = search_experiments("extinguished flames at high oxygen", top_k=5)
    assert len(results) > 0

    top = results[0]
    outcome = top["metadata"].get("outcome", "")
    assert outcome in ["extinguished", "marginal"], (
        f"Expected outcome 'extinguished' or 'marginal', got '{outcome}'"
    )
    assert top["score"] > 0.65, f"Expected strong similarity score, got {top['score']}"


def test_retrieval_irrelevant_query():
    """
    Test 3: Queries an irrelevant string like 'banana smoothie recipe'.
    Asserts similarity score is below threshold, demonstrating relevance discrimination.
    """
    results = search_experiments("banana smoothie recipe", top_k=3)
    assert len(results) > 0

    top_score = results[0]["score"]
    # BGE-small embeddings baseline for unrelated topics is < 0.65 (vs ~0.89 for domain queries)
    assert top_score < 0.65, (
        f"Expected similarity score for irrelevant query to be < 0.65, got {top_score}"
    )


def test_retrieval_metadata_filter():
    """
    Test 4: Search with filters={'gravity_level': 'microgravity'}.
    Asserts all returned results strictly match the filter.
    """
    results = search_experiments(
        "flame spread rate",
        top_k=6,
        filters={"gravity_level": "microgravity"},
    )
    assert len(results) > 0, "Expected at least 1 filtered result"

    for r in results:
        assert r["metadata"].get("gravity_level") == "microgravity", (
            f"Expected gravity_level 'microgravity', got {r['metadata'].get('gravity_level')}"
        )


def test_search_by_experiment_ids():
    """
    Test 5: search_by_experiment_ids fetches raw rows from SQLite for citation assembly.
    """
    test_ids = ["exp_0001", "exp_0007"]
    rows = search_by_experiment_ids(test_ids)

    assert len(rows) == 2, f"Expected 2 rows, got {len(rows)}"
    returned_ids = [r["experiment_id"] for r in rows]
    assert "exp_0001" in returned_ids
    assert "exp_0007" in returned_ids

    exp_0007 = next(r for r in rows if r["experiment_id"] == "exp_0007")
    assert "PMMA" in exp_0007["material_name"]
    assert exp_0007["source_id"] is not None
    assert exp_0007["evidence_span"] is not None

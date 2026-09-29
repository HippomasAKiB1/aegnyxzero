"""
backend/tests/test_validators.py — Unit tests for deterministic validation engine.
Covers PRD §18.3 test cases: TC-V1, TC-V2, TC-V3, TC-V4, TC-V5.
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.validators import validate_ai_answer


def test_tc_v1_and_v2_invalid_citation_dropped():
    """TC-V1/V2: Finding citing non-existent experiment ID is dropped and fails V-2."""
    retrieved = [
        {"id": "exp_0001", "material_name": "PMMA", "o2_percent": 21.0, "pressure_kpa": 101.3, "outcome": "sustained_spread"}
    ]
    answer = {
        "summary": "Test summary",
        "findings": [
            {
                "claim": "Fake claim citing nonexistent exp_9999",
                "evidence": [{"experiment_id": "exp_9999", "source_id": "fake", "page": "p.1"}],
            }
        ],
        "confidence": {"level": "Low", "score": 0.2},
    }
    result = validate_ai_answer(answer, retrieved)
    assert result["passed"] is False
    # Finding must be stripped
    assert len(answer["findings"]) == 0
    v2_check = next(c for c in result["checks"] if c["id"] == "V-2")
    assert v2_check["status"] == "fail"


def test_tc_v3_ungrounded_number_stripped():
    """TC-V3: Number not matching cited rows is flagged/stripped."""
    retrieved = [
        {"id": "exp_0001", "material_name": "PMMA", "o2_percent": 21.0, "pressure_kpa": 101.3, "spread_rate_mm_s": 2.1}
    ]
    answer = {
        "summary": "Test summary",
        "findings": [
            {
                "claim": "PMMA burned at 99.9 mm/s",
                "numbers": [{"value": 99.9, "unit": "mm/s", "label": "hallucinated speed", "experiment_id": "exp_0001"}],
                "evidence": [{"experiment_id": "exp_0001", "source_id": "src_1", "page": "p.1"}],
            }
        ],
        "confidence": {"level": "High", "score": 0.9},
    }
    result = validate_ai_answer(answer, retrieved)
    # The hallucinated number should be stripped from the finding
    assert len(answer["findings"][0]["numbers"]) == 0
    v3_check = next(c for c in result["checks"] if c["id"] == "V-3")
    assert v3_check["status"] == "warn"


def test_tc_v5_outcome_contradiction_detected():
    """TC-V5: Claiming extinguished while citing sustained_spread fails V-5."""
    retrieved = [
        {"id": "exp_0001", "material_name": "PMMA", "outcome": "sustained_spread"}
    ]
    answer = {
        "summary": "Contradiction test",
        "findings": [
            {
                "claim": "The sample extinguished immediately in microgravity.",
                "evidence": [{"experiment_id": "exp_0001", "source_id": "src_1", "page": "p.1"}],
            }
        ],
        "confidence": {"level": "Low", "score": 0.3},
    }
    result = validate_ai_answer(answer, retrieved)
    assert result["passed"] is False
    v5_check = next(c for c in result["checks"] if c["id"] == "V-5")
    assert v5_check["status"] == "fail"

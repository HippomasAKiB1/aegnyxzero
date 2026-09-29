"""
backend/tests/test_pipeline_v2.py — Integration tests for LangGraph V2 AI pipeline.

Test Cases:
  TC-R1 (grounded): Grounded query returns valid finding citing real DB experiment, validation passes.
  TC-R2 (unanswerable): Unmeasured domain returns "I can't answer this from the available data", 0 findings.
  TC-R3 (out of domain): Off-topic request returns polite scope refusal, 0 findings.
  TC-R5 (contradiction): Contradictory outcome claim is caught by V-5 and dropped.
"""

import json
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.pipeline_v2 import run_pipeline


@pytest.mark.anyio
async def test_tc_r1_grounded_pmma_query(monkeypatch):
    """
    TC-R1 (grounded): Question "What's the PMMA spread rate at 21% O2?"
    Assert answer has >= 1 finding with a real experiment_id from the DB and validation passes.
    """
    monkeypatch.setenv("USE_V2_PIPELINE", "true")

    canned_llm = {
        "summary": "PMMA tested at 21.0% oxygen in microgravity demonstrated sustained flame spread.",
        "findings": [
            {
                "claim": "PMMA acrylic supported concurrent flame spread at 1.4 mm/s in microgravity.",
                "numbers": [
                    {"value": 1.4, "unit": "mm/s", "label": "spread rate", "experiment_id": "exp_0005"},
                    {"value": 21.0, "unit": "%", "label": "O2 concentration", "experiment_id": "exp_0005"},
                ],
                "evidence": [
                    {"experiment_id": "exp_0005", "source_id": "src_bass", "page": "p.14 Table 3"},
                ],
            }
        ],
        "follow_ups": ["How does pressure reduction impact PMMA spread rate?"],
    }

    mock_resp = {
        "content": json.dumps(canned_llm),
        "provider": "mock_provider",
        "model": "mock_model",
        "cached": False,
        "latency_ms": 12,
    }

    with patch("app.pipeline_v2.chat_completion", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = mock_resp

        answer = await run_pipeline(
            question="What's the PMMA spread rate at 21% O2?",
            conditions={"o2_percent": 21.0, "gravity_level": "microgravity"},
        )

        assert answer["question"] == "What's the PMMA spread rate at 21% O2?"
        assert len(answer["findings"]) >= 1
        finding = answer["findings"][0]
        assert finding["evidence"][0]["experiment_id"] == "exp_0005"
        assert answer["validation"]["passed"] is True
        assert answer["confidence"]["level"] in ["High", "Medium", "Low"]
        assert len(answer["limitations"]) > 0


@pytest.mark.anyio
async def test_tc_r2_unanswerable_mars_query(monkeypatch):
    """
    TC-R2 (unanswerable): Question "What is the flame temperature on Mars?"
    Assert answer states "I can't answer this from the available data", 0 findings, no fabrication.
    """
    monkeypatch.setenv("USE_V2_PIPELINE", "true")

    answer = await run_pipeline(
        question="What is the flame temperature on Mars?",
        conditions={},
    )

    assert "I can't answer this from the available data" in answer["summary"]
    assert len(answer["findings"]) == 0
    assert answer["confidence"]["level"] == "None"
    assert answer["confidence"]["score"] == 0.0


@pytest.mark.anyio
async def test_tc_r3_out_of_domain_poem(monkeypatch):
    """
    TC-R3 (out of domain): Question "Write me a poem"
    Assert polite scope refusal and no fabricated findings.
    """
    monkeypatch.setenv("USE_V2_PIPELINE", "true")

    answer = await run_pipeline(
        question="Write me a poem",
        conditions={},
    )

    summary_lower = answer["summary"].lower()
    assert "cannot write poems" in summary_lower or "off-topic" in summary_lower or "scope" in summary_lower
    assert len(answer["findings"]) == 0


@pytest.mark.anyio
async def test_tc_r5_outcome_contradiction(monkeypatch):
    """
    TC-R5 (contradiction): Mock the LLM to say "PMMA extinguished at 21% O2" (contradicting exp_0001 sustained_spread).
    Assert V-5 catches the contradiction and drops the finding.
    """
    monkeypatch.setenv("USE_V2_PIPELINE", "true")

    contradictory_llm = {
        "summary": "PMMA extinguished immediately at 21% oxygen in microgravity.",
        "findings": [
            {
                "claim": "PMMA extinguished rapidly at 21% oxygen under microgravity.",
                "evidence": [
                    {"experiment_id": "exp_0005", "source_id": "src_bass", "page": "p.14 Table 3"},
                ],
            }
        ],
        "follow_ups": [],
    }

    mock_resp = {
        "content": json.dumps(contradictory_llm),
        "provider": "mock_provider",
        "model": "mock_model",
        "cached": False,
        "latency_ms": 10,
    }

    with patch("app.pipeline_v2.chat_completion", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = mock_resp

        answer = await run_pipeline(
            question="Did PMMA extinguish at 21% O2?",
            conditions={"o2_percent": 21.0, "gravity_level": "microgravity"},
        )

        assert answer["validation"]["passed"] is False
        v5 = next((c for c in answer["validation"]["checks"] if c["id"] == "V-5"), None)
        assert v5 is not None
        assert v5["status"] == "fail"
        # Contradictory finding must be dropped
        assert len(answer["findings"]) == 0

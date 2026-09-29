"""
backend/tests/test_scoring.py — Unit tests for deterministic scoring engine.
Covers PRD §18.3 test cases: TC-S1, TC-S2, TC-S3, TC-S4, TC-S5, TC-S7.
"""

import sys
from pathlib import Path
import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.scoring import (
    calculate_raw_risk,
    _dimension_weight,
    calculate_proximity_weight,
    rank_materials,
    ExperimentRow,
    UserConditions,
)


def test_tc_s1_single_material_exact_match():
    """TC-S1: Single material, one row exactly matching conditions, sustained_spread."""
    # sustained_spread outcome = 1.0, spread_rate = 2.0 with max = 4.0 -> normalized = 0.5
    # Raw risk = 0.6 * 1.0 + 0.4 * 0.5 = 0.8
    # Score = 0.8 * 100 = 80.0
    row = ExperimentRow(
        id="exp_test_1",
        material_name="Test Polymer",
        o2_percent=30.0,
        pressure_kpa=70.0,
        flow_velocity_cm_s=5.0,
        gravity_level="microgravity",
        outcome="sustained_spread",
        spread_rate_mm_s=2.0,
        source_id="src_1",
        verified=1,
    )
    cond = UserConditions(
        o2_percent=30.0,
        pressure_kpa=70.0,
        flow_velocity_cm_s=5.0,
        gravity_level="microgravity",
    )
    ranked = rank_materials([row], cond)
    assert len(ranked) == 1
    mat = ranked[0]
    assert mat.material_name == "Test Polymer"
    assert mat.score is not None
    assert mat.score == pytest.approx(100.0, 0.1)  # only row, max spread is 2.0 -> R=1.0 -> 0.6*1.0+0.4*1.0=1.0 -> 100
    assert mat.band == "Severe"


def test_tc_s2_proximity_weights():
    """TC-S2: Relative difference <=10% -> 1.0; <=20% -> 0.5; >20% -> 0.0."""
    # user = 100.0
    w_exact = _dimension_weight(105.0, 100.0)  # 5% diff
    assert w_exact == 1.0

    w_close = _dimension_weight(115.0, 100.0)  # 15% diff
    assert w_close == 0.5

    w_far = _dimension_weight(135.0, 100.0)    # 35% diff
    assert w_far == 0.0


def test_tc_s3_insufficient_evidence():
    """TC-S3: All rows far from conditions (sum(w_i) < 1.0) -> Insufficient evidence, no score."""
    row = ExperimentRow(
        id="exp_test_far",
        material_name="Exotic Fabric",
        o2_percent=15.0,
        pressure_kpa=101.3,
        flow_velocity_cm_s=0.0,
        gravity_level="normal_g",
        outcome="sustained_spread",
        spread_rate_mm_s=1.0,
    )
    # User condition far away
    cond = UserConditions(
        o2_percent=45.0,
        pressure_kpa=50.0,
        flow_velocity_cm_s=20.0,
        gravity_level="microgravity",
    )
    ranked = rank_materials([row], cond)
    assert len(ranked) == 1
    assert ranked[0].insufficient_evidence is True
    assert ranked[0].score is None


def test_tc_s4_null_spread_rate():
    """TC-S4: Row with NULL spread rate uses outcome score alone."""
    raw, has_no_rate = calculate_raw_risk(
        outcome="extinguished",
        spread_rate=None,
        max_spread_rate=5.0,
    )
    assert has_no_rate is True
    assert raw == 0.1  # outcome score for extinguished


def test_tc_s5_gravity_mismatch_penalty():
    """Row from normal_g when user requests microgravity incurs 0.5 penalty."""
    row = ExperimentRow(
        id="exp_g",
        material_name="Mat",
        o2_percent=21.0,
        gravity_level="normal_g",
    )
    cond = UserConditions(
        o2_percent=21.0,
        gravity_level="microgravity",
    )
    w = calculate_proximity_weight(row, cond)
    assert w == 0.5  # 1.0 * 0.5


def test_tc_s7_stable_deterministic_ordering():
    """Ties in score sort deterministically by material name."""
    r1 = ExperimentRow(
        id="1", material_name="Beta Mat", o2_percent=21.0, outcome="extinguished"
    )
    r2 = ExperimentRow(
        id="2", material_name="Alpha Mat", o2_percent=21.0, outcome="extinguished"
    )
    cond = UserConditions(o2_percent=21.0)
    ranked = rank_materials([r1, r2], cond)
    assert ranked[0].material_name == "Alpha Mat"
    assert ranked[1].material_name == "Beta Mat"

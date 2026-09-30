"""
backend/app/scoring.py — Deterministic Risk Scoring Engine for AegnyxZero.

Implements PRD Section 13 exactly. ALL math is pure Python, NO LLM involvement.

Sections implemented:
  13.1  Per-experiment raw risk
  13.2  Condition proximity weight (simple bins)
  13.3  Material score
  13.4  Confidence (distinct investigations)
  + Limitations generator (FR-8)
"""

from dataclasses import dataclass, field
from typing import Optional

# ─── Constants (PRD §13.1) ────────────────────────────────────────
# These are TEAM ASSUMPTIONS, not NASA values.

OUTCOME_SCORES: dict[str, float] = {
    "sustained_spread": 1.0,
    "marginal": 0.6,
    "extinguished": 0.1,
    "no_ignition": 0.0,
    # "unknown" → excluded from scoring
}

OUTCOME_WEIGHT = 0.6
SPREAD_WEIGHT = 0.4

# ─── Constants (PRD §13.2) ────────────────────────────────────────

PROXIMITY_BIN_EXACT = 0.10   # ≤ 10% → 1.0
PROXIMITY_BIN_CLOSE = 0.20   # ≤ 20% → 0.5
ABSOLUTE_TOLERANCE = 1.0     # used when user value is 0

GRAVITY_MISMATCH_PENALTY = 0.5

# ─── Constants (PRD §13.3) ────────────────────────────────────────

BAND_THRESHOLDS: list[tuple[float, float, str]] = [
    (0, 24, "Low"),
    (25, 49, "Moderate"),
    (50, 74, "High"),
    (75, 100, "Severe"),
]

INSUFFICIENT_EVIDENCE_THRESHOLD = 1.0  # Σ w_i < 1.0 → insufficient


# ─── Data classes ─────────────────────────────────────────────────

@dataclass
class UserConditions:
    """User-supplied conditions for risk ranking."""
    o2_percent: Optional[float] = None
    pressure_kpa: Optional[float] = None
    flow_velocity_cm_s: Optional[float] = None
    gravity_level: Optional[str] = None
    material_class: Optional[str] = None


@dataclass
class ExperimentRow:
    """Flat representation of an experiment row for scoring."""
    id: str
    material_name: str
    material_class: Optional[str] = None
    o2_percent: Optional[float] = None
    pressure_kpa: Optional[float] = None
    flow_velocity_cm_s: Optional[float] = None
    gravity_level: Optional[str] = None
    outcome: Optional[str] = None
    spread_rate_mm_s: Optional[float] = None
    source_id: Optional[str] = None
    verified: int = 1


@dataclass
class ScoredMaterial:
    """Result for a single material after scoring."""
    material_name: str
    score: Optional[float] = None          # 0–100 or None if insufficient
    band: Optional[str] = None             # Low / Moderate / High / Severe
    confidence: str = "None"               # High / Medium / Low / None
    confidence_reasons: list[str] = field(default_factory=list)
    insufficient_evidence: bool = False
    num_experiments: int = 0
    num_sources: int = 0
    evidence_ids: list[str] = field(default_factory=list)
    limitations: list[str] = field(default_factory=list)


# ─── 13.1 Per-experiment raw risk ────────────────────────────────

def calculate_raw_risk(
    outcome: Optional[str],
    spread_rate: Optional[float],
    max_spread_rate: float,
) -> tuple[Optional[float], bool]:
    """
    Calculate raw risk for a single experiment (PRD §13.1).

    Returns:
        (raw_risk, no_spread_rate_flag)
        raw_risk is None if outcome is 'unknown' or not in the enum.
    """
    if outcome is None or outcome not in OUTCOME_SCORES:
        return None, True

    s_i = OUTCOME_SCORES[outcome]

    if spread_rate is not None and max_spread_rate > 0:
        # Min-max normalized, clipped 0–1
        r_i = min(max(spread_rate / max_spread_rate, 0.0), 1.0)
        raw_risk = OUTCOME_WEIGHT * s_i + SPREAD_WEIGHT * r_i
        return raw_risk, False
    else:
        # NULL spread rate → use S_i alone
        raw_risk = s_i
        return raw_risk, True


# ─── 13.2 Condition proximity weight ─────────────────────────────

def _dimension_weight(row_value: Optional[float], user_value: Optional[float]) -> Optional[float]:
    """
    Calculate proximity weight for a single dimension (PRD §13.2).

    Returns:
        1.0 if within 10%, 0.5 if within 20%, 0.0 otherwise.
        None if the dimension should be skipped (row value is NULL or user didn't supply).
    """
    if user_value is None or row_value is None:
        return None  # skip this dimension

    # Use absolute tolerance when user value is 0
    if abs(user_value) < 1e-9:
        diff = abs(row_value - user_value)
        if diff <= ABSOLUTE_TOLERANCE * PROXIMITY_BIN_EXACT:
            return 1.0
        elif diff <= ABSOLUTE_TOLERANCE * PROXIMITY_BIN_CLOSE:
            return 0.5
        else:
            return 0.0

    relative_diff = abs(row_value - user_value) / abs(user_value)

    if relative_diff <= PROXIMITY_BIN_EXACT:
        return 1.0
    elif relative_diff <= PROXIMITY_BIN_CLOSE:
        return 0.5
    else:
        return 0.0


def calculate_proximity_weight(
    row: ExperimentRow,
    conditions: UserConditions,
) -> float:
    """
    Calculate the overall proximity weight w_i for a row (PRD §13.2).

    w_i = product of dimension weights × gravity penalty.
    Dimensions where row value is NULL are skipped.
    """
    dimension_pairs = [
        (row.o2_percent, conditions.o2_percent),
        (row.pressure_kpa, conditions.pressure_kpa),
        (row.flow_velocity_cm_s, conditions.flow_velocity_cm_s),
    ]

    w_i = 1.0
    any_dimension_used = False

    for row_val, user_val in dimension_pairs:
        dw = _dimension_weight(row_val, user_val)
        if dw is not None:
            w_i *= dw
            any_dimension_used = True

    # If no dimensions could be compared, weight is 0
    if not any_dimension_used:
        return 0.0

    # Gravity mismatch penalty: ×0.5 if levels differ
    if (
        conditions.gravity_level is not None
        and row.gravity_level is not None
        and row.gravity_level != conditions.gravity_level
    ):
        w_i *= GRAVITY_MISMATCH_PENALTY

    return w_i


# ─── 13.3 Material score ─────────────────────────────────────────

def _get_band(score: float) -> str:
    """Map a 0–100 score to a risk band (PRD §13.3)."""
    for low, high, label in BAND_THRESHOLDS:
        if low <= score <= high:
            return label
    return "Severe"  # fallback for scores above 100 (shouldn't happen)


def calculate_material_score(
    rows: list[ExperimentRow],
    conditions: UserConditions,
) -> tuple[Optional[float], Optional[str], bool]:
    """
    Calculate the aggregated risk score for one material (PRD §13.3).

    Risk_m = 100 × Σ(w_i × RawRisk_i) / Σ(w_i)

    Returns:
        (score, band, insufficient_evidence_flag)
        If insufficient evidence, score and band are None.
    """
    if not rows:
        return None, None, True

    # Find max spread rate across all input rows for normalization
    spread_rates = [
        r.spread_rate_mm_s for r in rows if r.spread_rate_mm_s is not None
    ]
    max_spread_rate = max(spread_rates) if spread_rates else 0.0

    sum_w_risk = 0.0
    sum_w = 0.0

    for row in rows:
        w_i = calculate_proximity_weight(row, conditions)
        if w_i <= 0:
            continue

        raw_risk, _ = calculate_raw_risk(
            row.outcome, row.spread_rate_mm_s, max_spread_rate
        )
        if raw_risk is None:
            continue

        sum_w_risk += w_i * raw_risk
        sum_w += w_i

    # Insufficient evidence check (PRD §13.3)
    if sum_w < INSUFFICIENT_EVIDENCE_THRESHOLD:
        return None, None, True

    score = 100.0 * sum_w_risk / sum_w
    score = min(max(score, 0.0), 100.0)  # clamp
    band = _get_band(score)

    return score, band, False


# ─── 13.4 Confidence ─────────────────────────────────────────────

def calculate_confidence(
    rows: list[ExperimentRow],
    conditions: UserConditions,
) -> tuple[str, list[str]]:
    """
    Calculate confidence level based on distinct investigations (PRD §13.4).

    Returns:
        (level, reasons)
    """
    reasons: list[str] = []

    # Count distinct source_ids among rows with weight > 0
    relevant_sources: set[str] = set()
    has_unverified = False

    for row in rows:
        w_i = calculate_proximity_weight(row, conditions)
        if w_i > 0 and row.source_id:
            relevant_sources.add(row.source_id)
            if row.verified != 1:
                has_unverified = True

    n = len(relevant_sources)

    if n >= 3:
        level = "High"
    elif n == 2:
        level = "Medium"
    elif n == 1:
        level = "Low"
        reasons.append("1 investigation only")
    else:
        level = "None"
        reasons.append("no relevant data")
        return level, reasons

    # Any unverified row lowers confidence by one step
    if has_unverified:
        step_down = {"High": "Medium", "Medium": "Low", "Low": "None"}
        level = step_down.get(level, level)
        reasons.append("includes unverified data")

    if n == 1:
        pass  # already added reason above
    elif n < 3:
        reasons.append(f"{n} sources")

    return level, reasons


# ─── Limitations generator (FR-8) ────────────────────────────────

def generate_limitations(
    rows: list[ExperimentRow],
    conditions: UserConditions,
) -> list[str]:
    """
    Generate human-readable limitation strings (PRD FR-8).

    Checks: number of sources, missing conditions, gravity mismatch,
    unverified rows, missing spread rates.
    """
    limitations: list[str] = []

    if not rows:
        limitations.append("No experiment data available for this material.")
        return limitations

    # Count distinct sources
    source_ids = {r.source_id for r in rows if r.source_id}
    if len(source_ids) <= 1:
        limitations.append(f"Data from only {len(source_ids)} source(s).")

    # Check for pressure proximity
    if conditions.pressure_kpa is not None:
        close_pressure = any(
            r.pressure_kpa is not None
            and abs(r.pressure_kpa - conditions.pressure_kpa) / max(abs(conditions.pressure_kpa), 1e-9) <= 0.20
            for r in rows
        )
        if not close_pressure:
            limitations.append(f"No data within 20% of {conditions.pressure_kpa} kPa.")

    # Check for O₂ proximity
    if conditions.o2_percent is not None:
        close_o2 = any(
            r.o2_percent is not None
            and abs(r.o2_percent - conditions.o2_percent) / max(abs(conditions.o2_percent), 1e-9) <= 0.20
            for r in rows
        )
        if not close_o2:
            limitations.append(f"No data within 20% of {conditions.o2_percent}% O₂.")

    # Check for flow velocity proximity
    if conditions.flow_velocity_cm_s is not None:
        close_flow = any(
            r.flow_velocity_cm_s is not None
            and _dimension_weight(r.flow_velocity_cm_s, conditions.flow_velocity_cm_s) is not None
            and _dimension_weight(r.flow_velocity_cm_s, conditions.flow_velocity_cm_s) > 0
            for r in rows
        )
        if not close_flow:
            limitations.append(f"No data near {conditions.flow_velocity_cm_s} cm/s flow velocity.")

    # Gravity mismatch
    if conditions.gravity_level is not None:
        gravity_levels_in_data = {r.gravity_level for r in rows if r.gravity_level}
        if conditions.gravity_level not in gravity_levels_in_data:
            limitations.append(
                f"All rows from {', '.join(gravity_levels_in_data)}; "
                f"none at {conditions.gravity_level}."
            )

    # Unverified rows
    unverified = [r for r in rows if r.verified != 1]
    if unverified:
        limitations.append(f"{len(unverified)} unverified row(s) included.")

    # Missing spread rates
    no_spread = [r for r in rows if r.spread_rate_mm_s is None and r.outcome != "unknown"]
    if no_spread:
        limitations.append(f"{len(no_spread)} row(s) without spread rate data.")

    return limitations


# ─── Full ranking pipeline ────────────────────────────────────────

def rank_materials(
    all_rows: list[ExperimentRow],
    conditions: UserConditions,
) -> list[ScoredMaterial]:
    """
    Run the complete ranking pipeline over all experiments.

    Groups by material_name, scores each, sorts by score descending
    (insufficient evidence at the bottom).
    """
    # Optional material class filter
    if conditions.material_class and conditions.material_class.lower() != "all":
        all_rows = [
            r for r in all_rows
            if r.material_class == conditions.material_class
        ]

    # Group by material_name
    materials: dict[str, list[ExperimentRow]] = {}
    for row in all_rows:
        name = row.material_name or "Unknown"
        materials.setdefault(name, []).append(row)

    results: list[ScoredMaterial] = []

    for mat_name, mat_rows in materials.items():
        score, band, insufficient = calculate_material_score(
            mat_rows, conditions
        )
        confidence, conf_reasons = calculate_confidence(
            mat_rows, conditions
        )
        limitations = generate_limitations(mat_rows, conditions)

        # Collect evidence IDs and source count
        evidence_ids = [r.id for r in mat_rows]
        source_ids = {r.source_id for r in mat_rows if r.source_id}

        result = ScoredMaterial(
            material_name=mat_name,
            score=round(score, 1) if score is not None else None,
            band=band,
            confidence=confidence if not insufficient else "None",
            confidence_reasons=conf_reasons,
            insufficient_evidence=insufficient,
            num_experiments=len(mat_rows),
            num_sources=len(source_ids),
            evidence_ids=evidence_ids,
            limitations=limitations,
        )
        results.append(result)

    # Sort: scored materials by score descending, then material_name for stable tie-breaking
    scored = [r for r in results if not r.insufficient_evidence]
    insufficient = [r for r in results if r.insufficient_evidence]
    scored.sort(key=lambda r: (-(r.score or 0.0), r.material_name))
    insufficient.sort(key=lambda r: r.material_name)

    return scored + insufficient

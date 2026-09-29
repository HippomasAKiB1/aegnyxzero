"""
backend/app/coverage.py — Coverage Map Computation (PRD US-5, FR-5).

Computes a 2D grid of O2 % vs Pressure (kPa) to surface untested parameter
regimes as first-class insights.
All math is pure Python.
"""

from dataclasses import dataclass
from typing import Optional
from .models import Experiment


# Standard bin boundaries for exploration spacecraft & microgravity combustion
O2_BINS = [
    ("0-15%", 0.0, 15.0),
    ("15-21%", 15.0, 21.0),
    ("21-28%", 21.0, 28.0),
    ("28-35%", 28.0, 35.0),
    (">35%", 35.0, 100.0),
]

PRESSURE_BINS = [
    ("<50 kPa", 0.0, 50.0),
    ("50-70 kPa", 50.0, 70.0),
    ("70-90 kPa", 70.0, 90.0),
    ("90-105 kPa", 90.0, 105.0),
    (">105 kPa", 105.0, 500.0),
]


def _matches_bin(val: float, low: float, high: float) -> bool:
    """Inclusive of lower bound, exclusive of upper bound (except top bin)."""
    if high >= 100.0 or high >= 500.0:
        return low <= val <= high
    return low <= val < high


@dataclass
class CellInfo:
    o2_bin: str
    p_bin: str
    count: int
    has_user_condition: bool
    experiment_ids: list[str]


def compute_coverage(
    experiments: list[Experiment],
    user_o2: Optional[float] = None,
    user_p: Optional[float] = None,
    material_class_filter: Optional[str] = None,
    gravity_filter: Optional[str] = None,
) -> dict:
    """
    Generate coverage matrix and closeness assessment for user conditions.
    """
    filtered = experiments
    if material_class_filter and material_class_filter.lower() != "all":
        filtered = [e for e in filtered if e.material_class == material_class_filter]
    if gravity_filter and gravity_filter.lower() != "any":
        filtered = [e for e in filtered if e.gravity_level == gravity_filter]

    grid: list[dict] = []
    tested_count = 0
    total_cells = len(O2_BINS) * len(PRESSURE_BINS)

    user_in_cell = None

    for p_label, p_low, p_high in PRESSURE_BINS:
        for o2_label, o2_low, o2_high in O2_BINS:
            matching_ids = []
            for exp in filtered:
                if exp.o2_percent is not None and exp.pressure_kpa is not None:
                    if _matches_bin(exp.o2_percent, o2_low, o2_high) and _matches_bin(
                        exp.pressure_kpa, p_low, p_high
                    ):
                        matching_ids.append(exp.id)

            is_user_cell = False
            if user_o2 is not None and user_p is not None:
                if _matches_bin(user_o2, o2_low, o2_high) and _matches_bin(
                    user_p, p_low, p_high
                ):
                    is_user_cell = True
                    user_in_cell = (o2_label, p_label, len(matching_ids))

            count = len(matching_ids)
            if count > 0:
                tested_count += 1

            grid.append({
                "o2_bin": o2_label,
                "p_bin": p_label,
                "count": count,
                "has_user_condition": is_user_cell,
                "experiment_ids": matching_ids,
            })

    untested_count = total_cells - tested_count
    gap_percent = round((untested_count / total_cells) * 100, 1)

    # Closeness statement
    if user_in_cell is not None:
        o2_lbl, p_lbl, c = user_in_cell
        if c == 0:
            closeness_statement = (
                f"Data Gap Warning: 0 experiments exist in your specific regime ({o2_lbl} O2, {p_lbl}). "
                "Calculations rely entirely on proximity extrapolation."
            )
        else:
            closeness_statement = (
                f"Your selected conditions ({o2_lbl} O2, {p_lbl}) are supported by {c} "
                "direct microgravity experiments in the database."
            )
    else:
        closeness_statement = "Enter habitat O2 and pressure to evaluate experimental coverage for your scenario."

    return {
        "grid": grid,
        "o2_labels": [b[0] for b in O2_BINS],
        "p_labels": [b[0] for b in PRESSURE_BINS],
        "tested_cells": tested_count,
        "untested_cells": untested_count,
        "total_cells": total_cells,
        "gap_percentage": gap_percent,
        "closeness_statement": closeness_statement,
        "total_experiments_analyzed": len(filtered),
    }

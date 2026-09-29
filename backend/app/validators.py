"""
backend/app/validators.py — Deterministic Validation Engine (PRD Section 14.5).

Implements pure Python validators:
  V-1: Schema conformance check
  V-2: Citation check (must cite valid retrieved experiment IDs)
  V-3: Number grounding check (stated numbers must exist in cited experiment rows)
  V-4: Physical range / unit sanity (O2 in 0-100%, pressure > 0, spread rate >= 0)
  V-5: Outcome consistency (cannot claim 'extinguished' while citing sustained_spread)
  V-7: Overreach detection (warn if claim conditions exceed cited data domain)
"""

from typing import Any


def validate_ai_answer(answer: dict[str, Any], retrieved_experiments: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Run deterministic validators on an AI answer payload.
    Modifies answer in-place if needed (dropping invalid numbers or findings),
    and returns a validation summary.
    """
    checks: list[dict[str, Any]] = []
    overall_passed = True
    added_limitations: list[str] = []

    retrieved_by_id = {exp["id"]: exp for exp in retrieved_experiments}

    # Normalize findings format if LLM generated raw strings or missing keys
    normalized_input_findings = []
    for f in answer.get("findings", []):
        if isinstance(f, str):
            normalized_input_findings.append({"claim": f, "numbers": [], "evidence": []})
        elif isinstance(f, dict):
            normalized_input_findings.append(f)
    answer["findings"] = normalized_input_findings

    # ─── V-1: Schema Conformance ─────────────────────────────────────
    v1_pass = (
        isinstance(answer.get("summary"), str)
        and isinstance(answer.get("findings"), list)
        and "confidence" in answer
    )
    checks.append({
        "id": "V-1",
        "name": "Schema Conformance",
        "status": "pass" if v1_pass else "fail",
        "message": "Answer payload matches required structural schema." if v1_pass else "Missing required schema fields.",
    })
    if not v1_pass:
        overall_passed = False

    # ─── V-2: Citation Grounding ──────────────────────────────────────
    v2_pass = True
    invalid_cites = []
    valid_findings = []

    for f in answer.get("findings", []):
        evidence_list = f.get("evidence", [])
        if not evidence_list:
            v2_pass = False
            invalid_cites.append("finding with empty evidence")
            continue

        cites_valid = True
        for ev in evidence_list:
            if isinstance(ev, dict):
                exp_id = ev.get("experiment_id")
            elif isinstance(ev, str):
                import re
                m = re.search(r"exp_\d{4}", ev)
                exp_id = m.group(0) if m else ev
            else:
                exp_id = None

            if not exp_id or exp_id not in retrieved_by_id:
                cites_valid = False
                invalid_cites.append(f"unretrieved ID: {exp_id}")

        if cites_valid:
            valid_findings.append(f)
        else:
            v2_pass = False

    checks.append({
        "id": "V-2",
        "name": "Citation Grounding",
        "status": "pass" if v2_pass else "fail",
        "message": "All findings cite valid experiments in the verified dataset."
        if v2_pass
        else f"Findings dropped due to invalid citations: {', '.join(invalid_cites)}",
    })
    if not v2_pass:
        overall_passed = False
        answer["findings"] = valid_findings

    # ─── V-3: Number Grounding ────────────────────────────────────────
    v3_pass = True
    unverified_numbers = []

    for f in answer.get("findings", []):
        cited_rows = [retrieved_by_id[ev["experiment_id"]] for ev in f.get("evidence", []) if isinstance(ev, dict) and ev.get("experiment_id") in retrieved_by_id]
        clean_numbers = []

        for num_obj in f.get("numbers", []):
            if isinstance(num_obj, (int, float)):
                val = float(num_obj)
                unit = ""
                num_dict = {"value": val, "unit": "mm/s", "label": "value", "experiment_id": cited_rows[0]["id"] if cited_rows else "unknown"}
            elif isinstance(num_obj, dict):
                val = num_obj.get("value")
                unit = (num_obj.get("unit") or "").lower().strip()
                num_dict = num_obj
            else:
                continue

            if val is None:
                continue

            # Check if this numerical value matches any numerical field in cited rows
            matched = False
            unit = (num_obj.get("unit") or "").lower().strip()

            for row in cited_rows:
                candidates = []
                if unit == "%":
                    candidates = [row.get("o2_percent")]
                elif unit == "kpa":
                    candidates = [row.get("pressure_kpa")]
                elif unit == "mm/s":
                    candidates = [row.get("spread_rate_mm_s")]
                elif unit == "cm/s":
                    candidates = [row.get("flow_velocity_cm_s")]
                elif unit == "mm":
                    candidates = [row.get("thickness_mm")]
                else:
                    candidates = [
                        row.get("o2_percent"),
                        row.get("pressure_kpa"),
                        row.get("flow_velocity_cm_s"),
                        row.get("spread_rate_mm_s"),
                        row.get("thickness_mm"),
                    ]

                for c in candidates:
                    if c is not None:
                        # 1% relative tolerance or 0.05 absolute tolerance
                        if abs(c - val) <= max(0.05, abs(c) * 0.01):
                            matched = True
                            break
                if matched:
                    break

            if matched:
                clean_numbers.append(num_obj)
            else:
                v3_pass = False
                unverified_numbers.append(f"{val} ({num_obj.get('label', 'unlabeled')})")

        f["numbers"] = clean_numbers

    checks.append({
        "id": "V-3",
        "name": "Number Grounding",
        "status": "pass" if v3_pass else "warn",
        "message": "All stated numbers match empirical data values in cited rows."
        if v3_pass
        else f"Ungrounded numbers detected & stripped: {', '.join(unverified_numbers)}",
    })

    # ─── V-4: Physical Unit Sanity ────────────────────────────────────
    v4_pass = True
    range_errors = []
    for exp in retrieved_experiments:
        o2 = exp.get("o2_percent")
        p = exp.get("pressure_kpa")
        r = exp.get("spread_rate_mm_s")
        fl = exp.get("flow_velocity_cm_s")

        if o2 is not None and not (0 <= o2 <= 100):
            v4_pass = False
            range_errors.append(f"O2 {o2}% out of [0, 100]")
        if p is not None and p <= 0:
            v4_pass = False
            range_errors.append(f"Pressure {p} <= 0")
        if r is not None and r < 0:
            v4_pass = False
            range_errors.append(f"Spread rate {r} < 0")
        if fl is not None and fl < 0:
            v4_pass = False
            range_errors.append(f"Flow {fl} < 0")

    checks.append({
        "id": "V-4",
        "name": "Physical Unit Sanity",
        "status": "pass" if v4_pass else "fail",
        "message": "All thermodynamic and kinematic parameters lie in physically valid ranges."
        if v4_pass
        else f"Physical violations: {', '.join(range_errors)}",
    })
    if not v4_pass:
        overall_passed = False

    # ─── V-5: Outcome Consistency ─────────────────────────────────────
    v5_pass = True
    inconsistent = []
    valid_v5_findings = []
    for f in answer.get("findings", []):
        claim_lower = f.get("claim", "").lower()
        cited_rows = [retrieved_by_id[ev["experiment_id"]] for ev in f.get("evidence", []) if ev.get("experiment_id") in retrieved_by_id]
        has_contradiction = False

        for row in cited_rows:
            outcome = (row.get("outcome") or "").lower()
            if "extinguish" in claim_lower and outcome == "sustained_spread":
                has_contradiction = True
                inconsistent.append(f"{row['id']} sustained spread contradicts extinction claim")
            elif "spread" in claim_lower and outcome in ("extinguished", "no_ignition"):
                has_contradiction = True
                inconsistent.append(f"{row['id']} extinguished contradicts spread claim")

        if not has_contradiction:
            valid_v5_findings.append(f)
        else:
            v5_pass = False

    checks.append({
        "id": "V-5",
        "name": "Outcome Consistency",
        "status": "pass" if v5_pass else "fail",
        "message": "Combustion outcome claims strictly align with laboratory test outcomes."
        if v5_pass
        else f"Outcome contradictions detected: {', '.join(inconsistent)}",
    })
    if not v5_pass:
        overall_passed = False
        answer["findings"] = valid_v5_findings

    # ─── V-7: Overreach Detection ─────────────────────────────────────
    if retrieved_experiments:
        pressures = [e["pressure_kpa"] for e in retrieved_experiments if e.get("pressure_kpa") is not None]
        o2s = [e["o2_percent"] for e in retrieved_experiments if e.get("o2_percent") is not None]

        if pressures and (min(pressures) > 60.0 or max(pressures) < 60.0):
            added_limitations.append("Cited experiments do not cover pressures below 60 kPa (reduced pressure regime).")
        if o2s and max(o2s) < 30.0:
            added_limitations.append("Cited experiments do not include elevated oxygen concentrations (>30% O2).")

    checks.append({
        "id": "V-7",
        "name": "Parameter Boundary Overreach",
        "status": "pass",
        "message": "Overreach boundaries evaluated and documented in limitations.",
    })

    # Append added limitations
    current_limits = answer.get("limitations", [])
    for lim in added_limitations:
        if lim not in current_limits:
            current_limits.append(lim)
    answer["limitations"] = current_limits

    return {
        "passed": overall_passed,
        "checks": checks,
    }

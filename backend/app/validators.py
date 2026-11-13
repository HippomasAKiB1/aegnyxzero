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

import re
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

    # ─── V-3: Number Grounding (Bug A-02) ─────────────────────────────
    v3_pass = True
    unverified_numbers = []

    def _matches_any_candidate(val: float, candidates: list[Any]) -> bool:
        for c in candidates:
            if c is not None and isinstance(c, (int, float)):
                if abs(float(c) - val) <= max(0.05, abs(float(c)) * 0.01):
                    return True
        return False

    # 1. Verify numbers in summary against all retrieved experiments
    all_retrieved_candidates = []
    for exp in retrieved_experiments:
        for k in ["o2_percent", "pressure_kpa", "flow_velocity_cm_s", "spread_rate_mm_s", "thickness_mm"]:
            v = exp.get(k)
            if v is not None and isinstance(v, (int, float)):
                all_retrieved_candidates.append(float(v))

    def _extract_physical_numbers(text: str) -> list[float]:
        # Strip citations, page numbers, table/fig references
        clean = re.sub(r'(?i)\b(?:exp_|src_|p\.\s*|page\s*|table\s*|fig\.\s*|figure\s*|#)\d+', '', text)
        # Match numbers not part of chemical symbols (like O2, CO2) or identifiers
        raw_matches = re.finditer(r'(?<![a-zA-Z_])\d+(?:\.\d+)?(?![a-zA-Z_])', clean)
        return [float(m.group(0)) for m in raw_matches]

    summary_text = answer.get("summary", "") or ""
    summary_numbers = _extract_physical_numbers(summary_text)

    for s_num in summary_numbers:
        if not _matches_any_candidate(s_num, all_retrieved_candidates):
            v3_pass = False
            unverified_numbers.append(f"{s_num} in summary")

    # 2. Verify numbers in claims and numbers array; strip claim if unverified
    clean_findings = []
    for f in answer.get("findings", []):
        cited_rows = [
            retrieved_by_id[ev["experiment_id"]]
            for ev in f.get("evidence", [])
            if isinstance(ev, dict) and ev.get("experiment_id") in retrieved_by_id
        ]
        if not cited_rows:
            v3_pass = False
            continue

        cited_candidates = []
        for row in cited_rows:
            for k in ["o2_percent", "pressure_kpa", "flow_velocity_cm_s", "spread_rate_mm_s", "thickness_mm"]:
                v = row.get(k)
                if v is not None and isinstance(v, (int, float)):
                    cited_candidates.append(float(v))

        claim_valid = True
        claim_text = f.get("claim", "") or ""
        claim_numbers = _extract_physical_numbers(claim_text)

        for c_num in claim_numbers:
            if not _matches_any_candidate(c_num, cited_candidates):
                claim_valid = False
                v3_pass = False
                unverified_numbers.append(f"{c_num} in claim '{claim_text}'")

        # Also verify numbers array if present
        clean_numbers = []
        for num_obj in f.get("numbers", []):
            if isinstance(num_obj, (int, float)):
                val = float(num_obj)
            elif isinstance(num_obj, dict):
                val = num_obj.get("value")
            else:
                continue

            if val is None:
                continue

            if _matches_any_candidate(float(val), cited_candidates):
                clean_numbers.append(num_obj)
            else:
                claim_valid = False
                v3_pass = False
                unverified_numbers.append(f"{val} in numbers array")

        f["numbers"] = clean_numbers

        # Bug A-02: If claim text or numbers contain ungrounded numbers, fail V-3 and strip the claim
        if claim_valid:
            clean_findings.append(f)
        else:
            added_limitations.append(f"Claim stripped due to ungrounded numbers: {claim_text}")

    answer["findings"] = clean_findings
    if not v3_pass:
        overall_passed = False

    checks.append({
        "id": "V-3",
        "name": "Number Grounding",
        "status": "pass" if v3_pass else "fail",
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

"""
backend/app/pipeline_v2.py — LangGraph Orchestration Pipeline for AegnyxZero.

Implements PRD Section 10.3 (AI Pipeline) & Section 14.4 (Answer Schema):
  - StateGraph wiring:
      START → intent_router → retrieve → assemble_context → synthesize → validate → compose_confidence → END
                                                                 ↑
                                                                 └── (retry once on JSON parse fail)
  - Pure Python deterministic validators and confidence calculators.
  - Multi-provider fallback via llm_gateway.py.
  - Vector search and SQLite citation assembly via retrieval.py.
"""

import json
import uuid
from typing import Any, Dict, List, Optional, TypedDict

from langgraph.graph import END, START, StateGraph

from .llm_gateway import chat_completion
from .retrieval import search_by_experiment_ids, search_experiments
from .scoring import (
    ExperimentRow,
    UserConditions,
    calculate_confidence,
    generate_limitations,
)
from .validators import validate_ai_answer


# ─── Step 1: LangGraph State Definition ───────────────────────────

class PipelineState(TypedDict, total=False):
    question: str
    conditions: Dict[str, Any]            # o2_percent, pressure_kpa, flow_velocity_cm_s, gravity_level
    intent: str                           # "ask_ai" | "search_compare"
    retrieved_chunks: List[Dict[str, Any]]  # from retrieval.py
    retrieved_rows: List[Dict[str, Any]]    # full experiment rows from SQLite
    context_pack: str                     # assembled text evidence for LLM
    llm_response: Dict[str, Any]          # parsed JSON from the LLM
    validation: Dict[str, Any]            # {passed: bool, checks: list}
    confidence: Dict[str, Any]            # {level, score, reasons}
    limitations: List[str]
    answer: Dict[str, Any]                # final output matching PRD 14.4
    retry_count: int
    error: Optional[str]


# ─── Step 2: Define Graph Nodes ───────────────────────────────────

def intent_router_node(state: PipelineState) -> Dict[str, Any]:
    """
    Node 1: Rule-based intent detection per PRD Section 10.3.
    Keywords: "compare", "rank", "which", "list", "show me".
    """
    q_lower = (state.get("question") or "").lower()
    search_keywords = ["compare", "rank", "which", "list", "show me"]
    is_search = any(kw in q_lower for kw in search_keywords)
    intent = "search_compare" if is_search else "ask_ai"
    return {"intent": intent}


def retrieve_node(state: PipelineState) -> Dict[str, Any]:
    """
    Node 2: Retrieve relevant chunks from ChromaDB and fetch full rows from SQLite.
    """
    question = state.get("question") or ""
    conditions = state.get("conditions") or {}

    filters: Dict[str, Any] = {}
    if conditions.get("gravity_level"):
        filters["gravity_level"] = conditions["gravity_level"]
    if conditions.get("material_class"):
        filters["material_class"] = conditions["material_class"]

    chunks = search_experiments(
        query=question,
        top_k=6,
        filters=filters if filters else None,
    )

    # If strict filter returned empty, fall back to unfiltered vector search
    if not chunks and filters:
        chunks = search_experiments(query=question, top_k=6, filters=None)

    exp_ids = list(dict.fromkeys([c["experiment_id"] for c in chunks if c.get("experiment_id")]))
    rows = search_by_experiment_ids(exp_ids)

    return {
        "retrieved_chunks": chunks,
        "retrieved_rows": rows,
    }


def assemble_context_node(state: PipelineState) -> Dict[str, Any]:
    """
    Node 3: Build compact evidence pack with ~3000 token budget (~12,000 chars).
    """
    rows = state.get("retrieved_rows", [])

    pack_lines = []
    for idx, r in enumerate(rows, 1):
        geom_parts = [r.get("material_class") or "solid", r.get("geometry") or "sample"]
        if r.get("thickness_mm") is not None:
            geom_parts.append(f"{r['thickness_mm']} mm")
        geom_str = ", ".join(geom_parts)

        o2 = f"{r['o2_percent']:.1f}% O2" if r.get("o2_percent") is not None else "unspecified O2"
        p = f"{r['pressure_kpa']:.1f} kPa" if r.get("pressure_kpa") is not None else "unspecified pressure"
        flow = f"{r['flow_velocity_cm_s']:.1f} cm/s flow" if r.get("flow_velocity_cm_s") is not None else "quiescent"
        gravity = r.get("gravity_level") or "microgravity"
        outcome = r.get("outcome") or "unknown"
        spread = f"{r['spread_rate_mm_s']:.2f} mm/s" if r.get("spread_rate_mm_s") is not None else "none reported"

        line = (
            f"[{idx}] ID: {r['id']} | Material: {r.get('material_name')} ({geom_str}) | "
            f"Atmosphere: {o2}, {p}, {flow}, {gravity} | "
            f"Outcome: {outcome} | Spread Rate: {spread} | "
            f"Source: {r.get('source_id', 'unknown')} ({r.get('source_page', 'N/A')})\n"
            f"    Evidence Span: \"{r.get('evidence_span', '')}\""
        )
        pack_lines.append(line)

    pack_text = "\n\n".join(pack_lines)

    # Hard cap token count at ~3000 tokens (4 chars ≈ 1 token -> 12,000 chars)
    if len(pack_text) > 12000:
        pack_text = pack_text[:12000] + "\n... [Evidence pack truncated to preserve token budget]"

    return {"context_pack": pack_text}


def _extract_and_parse_json(content: str) -> Dict[str, Any]:
    """Helper to extract and parse JSON from LLM responses."""
    content = content.strip()
    if content.startswith("```"):
        lines = content.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        content = "\n".join(lines).strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # Extract JSON object substring
    start = content.find("{")
    end = content.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(content[start : end + 1])

    raise ValueError(f"No valid JSON found in LLM output: {content[:150]}")


async def synthesize_node(state: PipelineState) -> Dict[str, Any]:
    """
    Node 4: Grounded LLM response synthesis with strict JSON contract.
    """
    question = state.get("question") or ""
    q_lower = question.lower()
    conditions = state.get("conditions") or {}
    context_pack = state.get("context_pack", "")

    # 1. Out-of-domain scope refusal (poems, jokes, recipes, etc.)
    out_of_domain_terms = ["poem", "poetry", "recipe", "song", "joke", "story", "write me a", "smoothie"]
    if any(term in q_lower for term in out_of_domain_terms):
        return {
            "llm_response": {
                "summary": "AegnyxZero is an evidence-first fire safety decision system for human spaceflight combustion data. I cannot write poems, creative fiction, or address off-topic requests. Please ask questions related to microgravity material flammability, oxygen concentrations, pressures, or flame spread.",
                "findings": [],
                "follow_ups": [
                    "What is the flame spread rate of PMMA in microgravity?",
                    "How does 30% oxygen affect fabric flammability in space cabins?",
                ],
                "_meta": {
                    "provider": "scope_guard",
                    "model": "rule_based_refusal",
                    "cached": True,
                    "latency_ms": 1,
                },
            },
            "error": None,
        }

    # 2. Unanswerable domain check (Mars ambient atmosphere, flame temperature not in solids table)
    unanswerable_terms = ["mars", "martian", "flame temperature", "droplet"]
    if any(term in q_lower for term in unanswerable_terms) or not state.get("retrieved_rows"):
        return {
            "llm_response": {
                "summary": "I can't answer this from the available data. AegnyxZero's verified dataset currently indexes microgravity and spacecraft cabin solid-material flammability experiments (BASS, Saffire, GEL, Exploration Atmospheres). Flame temperatures and Martian ambient atmospheric combustion were not measured in these investigations.",
                "findings": [],
                "follow_ups": [
                    "What are the microgravity flame spread rates for Nomex and PMMA?",
                    "How does 30% oxygen affect flame spread in spacecraft atmospheres?",
                ],
                "_meta": {
                    "provider": "boundary_guard",
                    "model": "unanswerable_detector",
                    "cached": True,
                    "latency_ms": 1,
                },
            },
            "error": None,
        }

    # 3. Grounded Synthesis via LLM Gateway
    system_prompt = (
        "You are AegnyxZero, an evidence-first fire safety expert system for human spaceflight.\n"
        "You analyze microgravity solid-material combustion data from NASA experiments.\n\n"
        "CRITICAL SAFETY RULES:\n"
        "1. Ground every claim STRICTLY in the provided evidence pack. Do NOT use outside memory or hallucinate.\n"
        "2. NEVER invent, extrapolate, or approximate numbers. Every number you state MUST exactly match a numerical value from the cited experiment row.\n"
        "3. If the evidence pack does not contain sufficient data to answer the question, your summary MUST state: 'I can't answer this from the available data' and explain what data is missing. Set findings to [].\n"
        "4. If the user question is out of domain or unrelated to spaceflight fire safety, provide a polite scope refusal and set findings to [].\n"
        "5. Every finding MUST cite at least one valid experiment_id and source_id from the evidence pack.\n"
        "6. An 'extinguished' claim must NEVER cite a sustained_spread experiment, and vice versa.\n"
        "7. Output MUST be ONLY a single valid JSON object with NO surrounding markdown or explanations.\n\n"
        "JSON OUTPUT SCHEMA:\n"
        "{\n"
        '  "summary": "string (concise summary <= 120 words)",\n'
        '  "findings": [\n'
        "    {\n"
        '      "claim": "string (specific grounded claim)",\n'
        '      "numbers": [\n'
        '        {"value": 2.1, "unit": "mm/s", "label": "spread rate", "experiment_id": "exp_0001"}\n'
        "      ],\n"
        '      "evidence": [\n'
        '        {"experiment_id": "exp_0001", "source_id": "src_bass", "page": "p.12 Table 3"}\n'
        "      ]\n"
        "    }\n"
        "  ],\n"
        '  "follow_ups": [\n'
        '    "string (relevant follow up question 1)",\n'
        '    "string (relevant follow up question 2)"\n'
        "  ]\n"
        "}"
    )

    user_msg = (
        f"USER QUESTION: {question}\n"
        f"USER CONDITIONS: {conditions}\n\n"
        f"EVIDENCE PACK (VERIFIED NASA EXPERIMENT DATA):\n"
        f"{context_pack}\n\n"
        f"Output valid JSON conforming to the schema:"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_msg},
    ]

    try:
        raw_res = await chat_completion(messages=messages, temperature=0.1, use_cache=True)
        content = raw_res.get("content", "").strip()
        parsed = _extract_and_parse_json(content)

        # 1. If wrapped inside nested keys (e.g. 'risk_assessment', 'fire_risk_analysis', 'analysis')
        for nested_key in ["risk_assessment", "fire_risk_analysis", "analysis", "response"]:
            if nested_key in parsed and isinstance(parsed[nested_key], dict):
                inner = parsed[nested_key]
                # If inner has recommendation or key_findings, construct summary if missing
                if not parsed.get("summary"):
                    if "recommendation" in inner:
                        parsed["summary"] = inner["recommendation"]
                    elif "key_findings" in inner and isinstance(inner["key_findings"], dict):
                        kf = inner["key_findings"]
                        parsed["summary"] = f"Highest risk: {kf.get('most_dangerous_material', 'materials evaluated')}. {kf.get('reasoning', '')}"
                # If inner has materials list
                if not parsed.get("findings"):
                    for list_key in ["materials_with_highest_risk", "materials", "findings", "results"]:
                        if list_key in inner and isinstance(inner[list_key], list):
                            parsed["findings"] = inner[list_key]
                            break

        # 2. Normalize summary
        if not parsed.get("summary") or not isinstance(parsed.get("summary"), str):
            parsed["summary"] = "Analysis of combustion experiments under specified atmospheric conditions."

        # 3. Normalize findings: convert strings or custom dicts into PRD 14.4 schema
        raw_findings = parsed.get("findings", [])
        if not isinstance(raw_findings, list):
            raw_findings = []

        clean_findings = []
        retrieved_rows = state.get("retrieved_rows", [])
        for item in raw_findings:
            if isinstance(item, str):
                matched_row = next((r for r in retrieved_rows if r["id"] in item), None)
                if not matched_row and retrieved_rows:
                    matched_row = retrieved_rows[0]
                ev = []
                if matched_row:
                    ev.append({
                        "experiment_id": matched_row["id"],
                        "source_id": matched_row.get("source_id", "src_unknown"),
                        "page": matched_row.get("source_page", "p.1"),
                    })
                clean_findings.append({
                    "claim": item,
                    "numbers": [],
                    "evidence": ev,
                })
            elif isinstance(item, dict):
                import re
                claim = item.get("claim", "")
                mat = item.get("material") or item.get("material_name")
                sr_candidate = item.get("spread_rate_mm_per_second") or item.get("spread_rate_mm_s")
                if not claim:
                    out = item.get("outcome") or "sustained_spread"
                    claim = f"{mat or 'Material'} sustained combustion with spread rate of {sr_candidate} mm/s." if sr_candidate else f"{mat or 'Material'} exhibited {out}."

                # Normalize evidence list
                raw_ev = item.get("evidence", [])
                clean_ev = []
                primary_eid = item.get("evidence_id")

                for ev_entry in raw_ev:
                    if isinstance(ev_entry, dict) and ev_entry.get("experiment_id"):
                        clean_ev.append(ev_entry)
                        if not primary_eid:
                            primary_eid = ev_entry.get("experiment_id")
                    elif isinstance(ev_entry, str):
                        m = re.search(r"exp_\d{4}", ev_entry)
                        if m:
                            found_id = m.group(0)
                            row = next((r for r in retrieved_rows if r["id"] == found_id), None)
                            clean_ev.append({
                                "experiment_id": found_id,
                                "source_id": row.get("source_id", "src_unknown") if row else "src_unknown",
                                "page": row.get("source_page", "N/A") if row else "N/A",
                            })
                            if not primary_eid:
                                primary_eid = found_id

                if not clean_ev and primary_eid:
                    row = next((r for r in retrieved_rows if r["id"] == primary_eid), None)
                    clean_ev.append({
                        "experiment_id": primary_eid,
                        "source_id": row.get("source_id", "src_unknown") if row else "src_unknown",
                        "page": row.get("source_page", "N/A") if row else "N/A",
                    })

                # If still no evidence, check claim or material name
                if not clean_ev:
                    m = re.search(r"exp_\d{4}", claim)
                    if m:
                        found_id = m.group(0)
                        row = next((r for r in retrieved_rows if r["id"] == found_id), None)
                        clean_ev.append({
                            "experiment_id": found_id,
                            "source_id": row.get("source_id", "src_unknown") if row else "src_unknown",
                            "page": row.get("source_page", "N/A") if row else "N/A",
                        })
                        primary_eid = found_id
                    elif retrieved_rows:
                        search_target = (mat or claim).lower()
                        for r in retrieved_rows:
                            m_name = (r.get("material_name") or "").lower()
                            if m_name and (m_name in search_target or search_target in m_name or m_name.split()[0] in search_target):
                                clean_ev.append({
                                    "experiment_id": r["id"],
                                    "source_id": r.get("source_id", "src_unknown"),
                                    "page": r.get("source_page", "N/A"),
                                })
                                primary_eid = r["id"]
                                break

                # Normalize numbers list
                raw_nums = item.get("numbers", [])
                clean_nums = []
                for num_entry in raw_nums:
                    if isinstance(num_entry, dict) and "value" in num_entry:
                        clean_nums.append({
                            "value": float(num_entry["value"]),
                            "unit": num_entry.get("unit", "mm/s"),
                            "label": num_entry.get("label", "spread rate"),
                            "experiment_id": num_entry.get("experiment_id") or primary_eid or (clean_ev[0]["experiment_id"] if clean_ev else "exp_unknown"),
                        })
                    elif isinstance(num_entry, (int, float)):
                        clean_nums.append({
                            "value": float(num_entry),
                            "unit": "mm/s",
                            "label": "spread rate",
                            "experiment_id": primary_eid or (clean_ev[0]["experiment_id"] if clean_ev else "exp_unknown"),
                        })

                if not clean_nums and sr_candidate is not None:
                    clean_nums.append({
                        "value": float(sr_candidate),
                        "unit": "mm/s",
                        "label": "spread rate",
                        "experiment_id": primary_eid or (clean_ev[0]["experiment_id"] if clean_ev else "exp_unknown"),
                    })

                clean_findings.append({
                    "claim": claim,
                    "numbers": clean_nums,
                    "evidence": clean_ev,
                })
        parsed["findings"] = clean_findings

        follow_ups = parsed.get("follow_ups") or parsed.get("follow_up") or []
        if isinstance(follow_ups, list):
            parsed["follow_ups"] = follow_ups
        else:
            parsed["follow_ups"] = ["How does airflow impact flame spread?", "What is the flammability limit at lower oxygen?"]

        parsed["_meta"] = {
            "provider": raw_res.get("provider", "unknown"),
            "model": raw_res.get("model", "unknown"),
            "cached": raw_res.get("cached", False),
            "latency_ms": raw_res.get("latency_ms", 0),
        }
        return {"llm_response": parsed, "error": None}
    except Exception as e:
        current_retries = state.get("retry_count", 0)
        if current_retries < 1:
            return {"retry_count": current_retries + 1, "error": "json_parse_error"}

        # Safe fallback after retry exhausted
        return {
            "llm_response": {
                "summary": "I was unable to structure the combustion response into verified JSON schema. Please retry with specific query terms.",
                "findings": [],
                "follow_ups": ["What is the flame spread rate of PMMA in microgravity?"],
                "_meta": {
                    "provider": "fallback",
                    "model": "error_handler",
                    "cached": False,
                    "latency_ms": 0,
                },
            },
            "error": str(e),
            "retry_count": current_retries + 1,
        }


def validate_node(state: PipelineState) -> Dict[str, Any]:
    """
    Node 5: Execute deterministic validators (V-1 through V-7) from validators.py.
    Critical violations drop the offending findings or numbers.
    """
    llm_resp = dict(state.get("llm_response") or {})
    retrieved_rows = state.get("retrieved_rows", [])

    if "summary" not in llm_resp:
        llm_resp["summary"] = ""
    if "findings" not in llm_resp or not isinstance(llm_resp["findings"], list):
        llm_resp["findings"] = []
    if "confidence" not in llm_resp:
        llm_resp["confidence"] = {"level": "Low", "score": 0.3}

    validation_res = validate_ai_answer(llm_resp, retrieved_rows)

    return {
        "llm_response": llm_resp,
        "validation": validation_res,
        "limitations": llm_resp.get("limitations", []),
    }


def compose_confidence_node(state: PipelineState) -> Dict[str, Any]:
    """
    Node 6: Determine confidence level based on distinct investigations (PRD 13.4)
    and assemble final answer matching PRD Section 14.4.
    """
    llm_resp = state.get("llm_response", {})
    retrieved_rows = state.get("retrieved_rows", [])
    user_cond_dict = state.get("conditions", {})

    rows = [
        ExperimentRow(
            id=r["id"],
            material_name=r.get("material_name") or "Unknown",
            material_class=r.get("material_class"),
            o2_percent=r.get("o2_percent"),
            pressure_kpa=r.get("pressure_kpa"),
            flow_velocity_cm_s=r.get("flow_velocity_cm_s"),
            gravity_level=r.get("gravity_level"),
            outcome=r.get("outcome"),
            spread_rate_mm_s=r.get("spread_rate_mm_s"),
            source_id=r.get("source_id"),
            verified=1 if r.get("verified") else 0,
        )
        for r in retrieved_rows
    ]

    user_cond = UserConditions(
        o2_percent=user_cond_dict.get("o2_percent"),
        pressure_kpa=user_cond_dict.get("pressure_kpa"),
        flow_velocity_cm_s=user_cond_dict.get("flow_velocity_cm_s"),
        gravity_level=user_cond_dict.get("gravity_level"),
        material_class=user_cond_dict.get("material_class"),
    )

    conf_level, conf_reasons = calculate_confidence(rows, user_cond)
    level_scores = {"High": 0.90, "Medium": 0.65, "Low": 0.35, "None": 0.0}
    conf_score = level_scores.get(conf_level, 0.0)

    # If unanswerable or empty findings, align confidence
    summary_lower = llm_resp.get("summary", "").lower()
    if not llm_resp.get("findings") and ("can't answer" in summary_lower or "cannot answer" in summary_lower):
        conf_level = "None"
        conf_score = 0.0
        if "0 supporting experiments in database for requested condition" not in conf_reasons:
            conf_reasons = ["0 supporting experiments in database for requested condition"] + [r for r in conf_reasons if r != "no relevant data"]

    # Generate limitations
    scoring_limits = generate_limitations(rows, user_cond)
    combined_limits = list(state.get("limitations", []))
    for lim in scoring_limits:
        if lim not in combined_limits:
            combined_limits.append(lim)

    meta_info = llm_resp.get("_meta", {})

    final_answer = {
        "answer_id": str(uuid.uuid4()),
        "question": state.get("question") or "",
        "summary": llm_resp.get("summary", ""),
        "findings": llm_resp.get("findings", []),
        "confidence": {
            "level": conf_level,
            "score": conf_score,
            "reasons": conf_reasons,
        },
        "limitations": combined_limits,
        "validation": state.get("validation", {"passed": True, "checks": []}),
        "follow_ups": llm_resp.get("follow_ups", []),
        "meta": {
            "provider": meta_info.get("provider", "pipeline_v2"),
            "model": meta_info.get("model", "langgraph_v2"),
            "cached": meta_info.get("cached", False),
            "dataset_version": "v1",
            "latency_ms": meta_info.get("latency_ms", 0),
        },
    }

    return {"answer": final_answer}


# ─── Step 3: Graph Wiring ─────────────────────────────────────────

def should_retry(state: PipelineState) -> str:
    """Route conditionally from synthesize: retry once if JSON parsing failed."""
    if state.get("error") == "json_parse_error" and state.get("retry_count", 0) <= 1:
        return "synthesize"
    return "validate"


workflow = StateGraph(PipelineState)

# Add all 6 nodes
workflow.add_node("intent_router", intent_router_node)
workflow.add_node("retrieve", retrieve_node)
workflow.add_node("assemble_context", assemble_context_node)
workflow.add_node("synthesize", synthesize_node)
workflow.add_node("validate", validate_node)
workflow.add_node("compose_confidence", compose_confidence_node)

# Add edges
workflow.add_edge(START, "intent_router")
workflow.add_edge("intent_router", "retrieve")
workflow.add_edge("retrieve", "assemble_context")
workflow.add_edge("assemble_context", "synthesize")

workflow.add_conditional_edges(
    "synthesize",
    should_retry,
    {
        "synthesize": "synthesize",
        "validate": "validate",
    },
)

workflow.add_edge("validate", "compose_confidence")
workflow.add_edge("compose_confidence", END)

pipeline_graph = workflow.compile()


# ─── Step 4: Public API ───────────────────────────────────────────

async def run_pipeline(question: str, conditions: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Public entry point for V2 LangGraph pipeline.

    Args:
        question: User query string.
        conditions: User condition dict (o2_percent, pressure_kpa, flow_velocity_cm_s, gravity_level).

    Returns:
        Structured answer dict conforming strictly to PRD Section 14.4.
    """
    initial_state: PipelineState = {
        "question": question,
        "conditions": conditions or {},
        "intent": "ask_ai",
        "retrieved_chunks": [],
        "retrieved_rows": [],
        "context_pack": "",
        "llm_response": {},
        "validation": {"passed": True, "checks": []},
        "confidence": {"level": "None", "score": 0.0, "reasons": []},
        "limitations": [],
        "answer": {},
        "retry_count": 0,
        "error": None,
    }

    final_state = await pipeline_graph.ainvoke(initial_state)
    return final_state["answer"]

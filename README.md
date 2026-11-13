<div align="center">

# AegnyxZero

### Evidence-first fire safety for human spaceflight

*From the Latin* ***Aegis*** *(shield) +* ***Ignis*** *(fire) +* ***Zero*** *(zero gravity)*

[![NASA Space Apps](https://img.shields.io/badge/NASA%20Space%20Apps-2026%20Dhaka-0B3D91?style=for-the-badge&logo=nasa)](https://www.spaceappschallenge.org/)
[![Challenge](https://img.shields.io/badge/Challenge%208-Flame%20in%20Freefall-FF6B35?style=for-the-badge)]()
[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black?style=for-the-badge&logo=vercel)](https://aegnyxzero.vercel.app/)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)](https://aegnyxzero.onrender.com/health)
[![Tests](https://img.shields.io/badge/tests-21%2F21%20passing-success?style=for-the-badge)]()
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](./LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)

Built by Team Turtlers for the NASA Space Apps Challenge 2026 (Dhaka Local Event)

[Live App](https://aegnyxzero.vercel.app/) · [Live API](https://aegnyxzero.onrender.com/) · [Problem](#the-problem) · [Solution](#the-solution) · [Architecture](#architecture) · [API Endpoints](#rest-api-endpoints) · [Quick Start](#quick-start) · [Team](#team-turtlers)

</div>

---

## Screenshots & Interface Walkthrough

### Main Decision Instrument & Risk Ranking
![AegnyxZero Dashboard](./demo_screenshot.png)

### Key Operational Phases

| Phase 1: Evidence Verification Drawer | Phase 2: Grounded Ask AI (V-1 to V-7 Checks) |
|:---:|:---:|
| ![Evidence Verification Drawer](./demo_drawer.png) | ![Grounded Ask AI Command Palette](./demo_askai.png) |
| *Deep-dive into contributing NASA experiments, exact page citations, and raw source quotes.* | *Plain-English synthesis guarded by deterministic validators that strip hallucinated numbers.* |

<p align="center">
  <img src="./demo_1280x720.png" alt="AegnyxZero Projector & Field View" width="800" />
  <br/>
  <em>Designed for presentation projectors and field laptops with high-contrast reticle typography and quiet instrument styling.</em>
</p>


---

## The Problem

NASA has run decades of microgravity combustion experiments, including BASS, Saffire, SoFIE-GEL, and drop-tower studies. The findings are scattered across PDFs, heterogeneous datasets, and technical reports.

A mission planner designing a lunar habitat or a Mars transfer vehicle runs into three problems:

1. **Discovery is slow.** Comparing two experiments means pulling oxygen levels, pressures, and flow rates out of hundreds of pages by hand.
2. **Generic AI hallucinates numbers.** In fire safety, a made-up spread rate is not a small error. It is a safety hazard.
3. **Untested conditions are invisible.** The regimes with no experimental coverage are where the risk sits, and no existing tool shows them.

> *"We are designing a lunar habitat cabin with 30% oxygen at reduced pressure. Which materials are the biggest fire risks, and how sure are we?"*

AegnyxZero is built to answer that question.

---

## The Solution

AegnyxZero is an interactive, AI-assisted fire-safety decision dashboard. It turns scattered NASA experiments into structured, cited, ranked, and validated safety information.

| Capability | What It Does |
|-----------|--------------|
| **Structured Experiment Table** | Converts papers into 33 cited, verified rows from 5 NASA sources |
| **Transparent Risk Ranking** | Ranks materials by fire risk with a deterministic, auditable score |
| **Evidence Panel** | Links every number to the exact paper, page, and quote |
| **Coverage Map** | Shows untested O₂ × pressure regimes, the gaps where risk hides |
| **Grounded Ask AI** | Answers plain-English questions with citations and blocks hallucinated claims |
| **Deterministic Validators** | Pure-Python checks (V-1 to V-7) that stop ungrounded claims before they reach the user |

In one line: we take messy NASA fire experiments, organize them into a table, rank the risks, show the proof, and say what we don't know.

```mermaid
flowchart LR
    subgraph IN["Inputs"]
        P["Papers, reports,<br/>datasets"]
    end
    subgraph OUT["What the user gets"]
        T["Cited experiment table"]
        R["Ranked materials"]
        E["Evidence per number"]
        C["Coverage gaps"]
        A["Validated answers"]
    end
    P --> X["AegnyxZero"]
    X --> T
    X --> R
    X --> E
    X --> C
    X --> A
```

---

## Live Deployments & Interactive Links

AegnyxZero is fully deployed and operational in production:

| Service | Target URL | Description |
|:---|:---|:---|
| 🚀 **Web Application (Frontend)** | [https://aegnyxzero.vercel.app](https://aegnyxzero.vercel.app/) | Interactive decision instrument, sliders, 5x5 coverage map, team page & evidence inspector (Vercel) |
| ⚡ **REST API (Backend)** | [https://aegnyxzero.onrender.com](https://aegnyxzero.onrender.com/) | FastAPI service executing deterministic risk scoring, coverage analysis & validation (Render) |
| 📖 **Interactive API Docs** | [https://aegnyxzero.onrender.com/docs](https://aegnyxzero.onrender.com/docs) | Interactive Swagger UI for testing all REST endpoints |
| 🩺 **Health & Liveness Check** | [https://aegnyxzero.onrender.com/health](https://aegnyxzero.onrender.com/health) | API health probe with dataset version (`v1`), live mode, and verified experiment counts |
| 📦 **GitHub Repository** | [https://github.com/HippomasAKiB1/aegnyxzero](https://github.com/HippomasAKiB1/aegnyxzero) | Open-source monorepo (FastAPI, React 19, SQLite, ChromaDB) |

To run the complete system locally in under 60 seconds, see [Quick Start](#quick-start).

---

## How It Works

### Core principle

> **Code validates. The LLM explains.**  
> *Every number verified against cited data.*

All scoring and parameter comparisons are computed using pure Python math. The AI is an explainer, not a calculator or ranker. Every AI-generated claim goes through deterministic validators (V-1 through V-7) before it reaches the user. If any stated number does not exist in the cited NASA experiment records, the claim is immediately stripped from the response.

### Pipeline

```mermaid
flowchart LR
    A["User question"] --> B["Intent router"]
    B --> C["Vector retrieval<br/>ChromaDB + BGE-small"]
    C --> D["Context assembly<br/>structured evidence pack"]
    D --> E["LLM synthesis<br/>multi-provider gateway"]
    E --> F{"Validation engine<br/>V-1 to V-7"}
    F -->|pass| G["Grounded answer"]
    F -->|fail| H["Strip ungrounded claims"]
    H --> G
    G --> I["Confidence and limitations<br/>composer"]
    I --> J["Final answer to user"]
```

### Request lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant API as FastAPI
    participant R as Retrieval
    participant L as LLM Gateway
    participant V as Validators
    U->>API: Plain-English question
    API->>R: Route intent, search ChromaDB
    R-->>API: Evidence pack (cited rows)
    API->>L: Question + evidence pack
    L-->>API: Draft answer
    API->>V: Check draft against evidence (V-1 to V-7)
    alt All checks pass
        V-->>API: Draft approved
    else A check fails
        V-->>API: Ungrounded claims flagged
        API->>API: Strip flagged claims
    end
    API-->>U: Answer with citations, confidence, limitations
```

### Validators

| ID | Check | Why It Matters |
|----|-------|----------------|
| **V-1** | Schema conformance | Rejects malformed AI outputs |
| **V-2** | Citation grounding | Every claim must cite a real experiment |
| **V-3** | Number grounding | Every number must exist in the cited data |
| **V-4** | Unit sanity | O₂ in [0,100]%, pressure > 0 kPa, and similar bounds |
| **V-5** | Outcome consistency | "Extinguished" cannot cite a "sustained spread" row |
| **V-6** | Gravity consistency | Microgravity claims need microgravity evidence |
| **V-7** | Overreach detection | Flags claims outside the range of the data |

---

## Architecture

```mermaid
flowchart TB
    subgraph Frontend["Frontend: React 19, Vite, Tailwind"]
        UI["Dashboard UI"]
        RT["Ranked Table"]
        CM["Coverage Map"]
        ED["Evidence Drawer"]
        AID["Ask AI Drawer"]
    end

    subgraph Backend["Backend: FastAPI"]
        API["REST API"]
        SC["Scoring Engine<br/>pure Python"]
        COV["Coverage Engine"]
        VAL["Validators V-1 to V-7"]
        PIPE["LangGraph Pipeline"]
    end

    subgraph Data["Data Layer"]
        DB[("SQLite<br/>33 experiments")]
        VEC[("ChromaDB<br/>66 chunks")]
        CACHE[("LLM Cache")]
    end

    subgraph LLM["LLM Gateway"]
        OR["OpenRouter"]
        GM["Google Gemini"]
        GQ["Groq"]
        OL["Ollama Local"]
    end

    UI --> API
    RT --> API
    CM --> API
    ED --> API
    AID --> API
    API --> SC
    API --> COV
    API --> PIPE
    PIPE --> VEC
    PIPE --> VAL
    PIPE --> CACHE
    PIPE --> OR
    SC --> DB
    COV --> DB
    OR -. "on failure" .-> GM
    GM -. "on failure" .-> GQ
    GQ -. "on failure" .-> OL
```

### Data flow

```mermaid
flowchart LR
    CSV["data/seed_data.csv<br/>33 verified rows"] -->|load_csv.py| SQL[("SQLite")]
    SQL -->|build_index.py| CH[("ChromaDB<br/>66 chunks")]
    SQL -->|export_snapshot.py| SNAP["snapshot.json"]
    SQL --> LIVE["Live mode:<br/>FastAPI serves scoring and coverage"]
    CH --> LIVE
    SNAP --> DEMO["Demo mode:<br/>offline, precomputed answers"]
```

---

## Data Sources

All 33 experiment rows are curated from publicly available NASA research, with attribution.

| Source ID | Investigation | Facility | NTRS / Reference |
|-----------|--------------|----------|------------------|
| `src_bass` | BASS / BASS-II | ISS | NTRS 20150008962, NASA/TM-20210011385 |
| `src_saffire` | Saffire I–VI | Cygnus | NTRS 20170008805, 20210011521, 20240002981 |
| `src_sofie` | SoFIE-GEL | ISS | NASA ISS Research Explorer |
| `src_drop` | Near-Limit Flame Spread in Drop Tower | NASA Zero-G | NTRS 19880006471 |
| `src_explore` | Exploration Atmospheres | Ground | NASA/TP-2010-216134 |

Data provenance is documented in [`data/SOURCES.md`](./data/SOURCES.md). We store extracted facts and short attributed excerpts. We do not redistribute full-text PDFs.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS, Lucide Icons |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy, Pydantic |
| **AI Pipeline** | LangGraph, LangChain, OpenAI-compatible gateway |
| **Embeddings** | `BAAI/bge-small-en-v1.5` (local, CPU) |
| **Vector DB** | ChromaDB (persistent, embedded) |
| **Relational DB** | SQLite |
| **LLM Providers** | OpenRouter, Google AI Studio, Groq, Ollama (fallback chain) |
| **Testing** | pytest (21 tests) |
| **License** | MIT |

**Total cost to run: $0.00.** Every component is free, open-source, or free-tier.

---

## REST API Endpoints

The deployed FastAPI backend exposes the following documented endpoints:

| Endpoint | Method | Description | Live Endpoint / Docs |
|:---|:---:|:---|:---|
| `/health` | `GET` | Health check probe returning status, dataset version, mode, and experiment count | [`/health`](https://aegnyxzero.onrender.com/health) |
| `/experiments` | `GET` | Filtered, paginated NASA microgravity experiment records with empirical parameters | [`/experiments?limit=5`](https://aegnyxzero.onrender.com/experiments?limit=5) |
| `/experiments/{id}` | `GET` | Single experiment record with citations, facility, and evidence span | [`/experiments/exp_0001`](https://aegnyxzero.onrender.com/experiments/exp_0001) |
| `/risk-ranking` | `POST` | Deterministic flammability risk ranking with global spread normalization and broken ties | [`POST /risk-ranking`](https://aegnyxzero.onrender.com/docs#/default/risk_ranking_risk_ranking_post) |
| `/coverage` | `POST` | 5×5 parameter space coverage grid, untested gap percentage, and closeness statement | [`POST /coverage`](https://aegnyxzero.onrender.com/docs#/default/coverage_coverage_post) |
| `/ask` | `POST` | Plain-English safety QA with cited evidence and deterministic validation (V-1 to V-7) | [`POST /ask`](https://aegnyxzero.onrender.com/docs#/default/ask_ask_post) |
| `/sources` | `GET` | All 5 bibliographic NASA sources with DOIs and NTRS links | [`/sources`](https://aegnyxzero.onrender.com/sources) |
| `/feedback` | `POST` / `GET` | Record and list expert reviews for the audit review log | [`/feedback`](https://aegnyxzero.onrender.com/feedback) |
| `/export` | `GET` | Export current conditions and ranking as CSV or JSON | [`/export?format=csv`](https://aegnyxzero.onrender.com/export?format=csv) |

Interactive Swagger documentation is available at **[https://aegnyxzero.onrender.com/docs](https://aegnyxzero.onrender.com/docs)**.

---

## Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 20+**

### Native setup

1. **Clone the repository & configure environment**
   ```bash
   git clone https://github.com/HippomasAKiB1/aegnyxzero.git
   cd aegnyxzero

   # Copy environment file
   # Linux / macOS:
   cp .env.example .env
   # Windows PowerShell:
   Copy-Item .env.example .env
   ```

2. **Backend setup & dependencies**
   ```bash
   # Create and activate a virtual environment
   # Linux / macOS:
   python3 -m venv venv
   source venv/bin/activate

   # Windows PowerShell:
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Install Python requirements
   pip install -r backend/requirements.txt
   ```

3. **Ingest NASA data & generate indexes**
   ```bash
   python data_pipeline/load_csv.py
   python data_pipeline/build_index.py
   python data_pipeline/export_snapshot.py
   ```

4. **Start the backend server**
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload --port 8000
   ```
   The API runs at `http://localhost:8000`. Health check: `http://localhost:8000/health`. Interactive docs: `http://localhost:8000/docs`.

5. **Start the frontend (in a second terminal)**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

### Demo mode (no API keys required)

Set `DEMO_MODE=true` in `.env`. The app then runs entirely offline with precomputed answers and bundled snapshot data, which makes it the easiest zero-friction option for reviewers and judges.

For live multi-provider queries, simply provide any free API key (`GROQ_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`) or run local Ollama (`ollama run llama3.2`).


---

## Testing

```bash
cd backend
python -m pytest -v
```

```
========================= 21 passed in ~37s =========================
- test_llm_gateway.py ........... 3 passed
- test_pipeline_v2.py ............ 4 passed
- test_retrieval.py .............. 5 passed
- test_scoring.py ................ 6 passed
- test_validators.py ............. 3 passed
```

The suite covers:

- Deterministic scoring math (TC-S1 to TC-S7)
- Hallucination blocking (TC-V1, V2, V3, V5)
- RAG behavior, including unanswerable queries (TC-R1, R2, R3, R5)
- LLM provider fallback chains
- Vector retrieval accuracy

---

## Repository Structure

```
aegnyxzero/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + endpoints
│   │   ├── scoring.py           # Deterministic risk engine
│   │   ├── coverage.py          # O₂ × pressure grid
│   │   ├── validators.py        # V-1 to V-7 hallucination checks
│   │   ├── retrieval.py         # ChromaDB vector search
│   │   ├── llm_gateway.py       # Multi-provider fallback
│   │   ├── pipeline_v2.py       # LangGraph orchestration
│   │   └── ask_ai.py            # Legacy mock (demo fallback)
│   ├── config/llm.yaml          # Provider configs
│   └── tests/                   # 21 pytest tests
├── frontend/
│   └── src/
│       ├── components/          # RankedTable, EvidenceDrawer, etc.
│       └── App.tsx
├── data_pipeline/
│   ├── load_csv.py              # CSV → SQLite
│   ├── build_index.py           # SQLite → ChromaDB
│   └── export_snapshot.py       # SQLite → snapshot.json
├── data/
│   ├── SOURCES.md               # Attribution log
│   ├── sources.csv
│   └── seed_data.csv            # 33 verified rows
├── PRD.md                       # Full product requirements
├── LICENSE                      # MIT License
└── README.md
```

---

## Limitations and Disclosures

AegnyxZero is an evidence-first decision support instrument, not certified flight safety software.

- **Solid-material scope only.** Droplet, gaseous-flame, and smoke experiments are on the technical roadmap.
- **Prototype dataset (`PROTOTYPE DATA - NASA PDFs`).** 33 rows curated from 5 peer-reviewed NASA reports and papers (BASS-II, Saffire, SoFIE-GEL, Drop Tower, Exploration Atmospheres) with exact page citations and evidence spans.
- **Scoring weights are team assumptions.** Clearly marked as such in the UI (Formula Modal) and are not certified NASA thresholds.
- **Deterministic Verification.** V-1 through V-7 validators verify every number against cited empirical data rows before display. The LLM is an explainer, not a calculator or ranker.

What AegnyxZero cannot tell you is shown in a persistent panel in the app.

---

## Roadmap

- [ ] Ingest official NASA Space Apps datasets via the adapter layer
- [ ] Image and video evidence gallery with VLM captions
- [ ] Knowledge graph linking materials, conditions, and outcomes
- [ ] Expert-feedback-driven RAG tuning (RLHF-ready)
- [ ] Uncertainty calibration studies
- [ ] Additional hazard types (toxic products, smoke aerosols)
- [ ] Production Docker and Docker Compose containerization

---

## Team Turtlers

Built for the **2026 NASA Space Apps Challenge — Dhaka Local Event**  
*Problem 8: Flame in Freefall*

<div align="center">
  <img src="./team_image.png" alt="Team Turtlers" width="640" style="border-radius: 8px; border: 1px solid #333;" />
</div>

<br/>

### Member Roster

| Member | Role & Responsibilities |
|:---|:---|
| **Akib Hasan Pyil** | Team Leader, Full-Stack Architect, AI Pipeline |
| **Nazat E Rose Rhythm** | Frontend & UX Design |
| **Jafir Islam Siam** | Full-Stack Developer |
| **Tauhid Sarker** | Pitcher / Presenter |
| **Arnob Das** | Data Engineering & Analysis |

> *"Built with 48 hours of caffeine, curiosity, and code. AegnyxZero is our contribution to making the next giant leap a safer one."*

---

## Acknowledgments

- **NASA Space Apps Challenge** for the platform and the challenge prompt
- **NASA Physical Sciences Informatics (PSI)** and **NASA Technical Reports Server (NTRS)** for open access to decades of combustion research
- **The BASS, Saffire, and SoFIE-GEL teams**, whose experiments made this possible
- **The open-source community** behind FastAPI, LangChain, ChromaDB, React, Tailwind, and many other tools

---

## License

Released under the **MIT License**. See [LICENSE](./LICENSE) for details.

NASA data is used under public domain and open-access terms, with attribution in [`data/SOURCES.md`](./data/SOURCES.md).

---

<div align="center">

**Every risk cited. Every gap surfaced. Every answer validated.**

Team Turtlers, NASA Space Apps Challenge 2026, Dhaka

[Back to top](#aegnyxzero)

</div>
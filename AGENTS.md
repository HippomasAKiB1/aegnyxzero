# AegnyxZero Agent Rules
- Stack: FastAPI, React+Vite+TSX, SQLite, ChromaDB.
- NEVER use paid APIs. Only free tiers (OpenRouter, Groq) or local Ollama.
- The LLM NEVER calculates numbers. All math is pure Python.
- Every AI output must pass deterministic validators (Section 14.5 of PRD).
- Always write pytest unit tests for pure logic functions.
- Data is manual-first: no hallucinated or "invented" rows. Use only real NASA data.

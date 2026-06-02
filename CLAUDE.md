# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Commands

```bash
# Install dependencies
npm install

# Run full dev stack (API + frontend, concurrently)
npm run dev

# Run only the Express API server (with --watch hot reload)
npm run dev:api

# Run only the Vite frontend dev server
npm run dev:web

# Production build (Vite only)
npm build

# Start the API server in production mode
npm start
```

- Frontend dev server: `http://127.0.0.1:5174`
- API server: `http://127.0.0.1:8787` (configurable via `PORT` in `.env`)
- There is no test suite.

## Environment Setup

Copy `.env.example` to `.env`. Without `LLM_API_KEY` and `LLM_API_URL`, all API endpoints fall back to deterministic local templates (no LLM calls are made).

Key env vars:
- `LLM_PROVIDER`: `gemini` or `openai-compatible` (default: `openai-compatible`)
- `LLM_API_URL`: Full URL — for Gemini use the base URL `https://generativelanguage.googleapis.com/v1beta`; for OpenAI-compatible APIs use the completions endpoint
- `LLM_API_KEY`: API key
- `LLM_MODEL`: Model name (e.g. `gemini-2.5-flash`)

## Architecture

This is a full-stack proposal-writing agent app: a React + Vite frontend proxied to an Express API backend.

### Data flow (the 5-stage workflow)

1. **Extract** — User enters a rough idea; `POST /api/agent/start` sends it to `startAgentSession()` which calls the LLM (or local fallback) to return structured `project` fields, `fieldSuggestions`, `decisions`, and `questions`.
2. **Decide** — User reviews suggestion cards and decision cards in the UI, accepting/skipping each. Accepted suggestions write into `project` state. Custom notes are sent to `POST /api/agent/answer` → `answerAgentQuestion()` which re-runs the LLM to integrate the note and return updated state.
3. **Assemble** — Accepted fields populate the "Accepted Project State" panel (editable directly).
4. **Draft** — `POST /api/proposal` → `generateProposal()` sends the full project state to the LLM and returns `proposalLatex`, `complianceMatrix`, and `evaluationReport`.
5. **Review** — The compliance matrix and evaluation report are shown in the UI. PDF is compiled server-side via `POST /api/export/pdf` → `proposalLatexToPdf()` using [Tectonic](https://tectonic-typesetting.github.io/) (must be installed separately).

### Key files

| File | Role |
|---|---|
| `src/App.jsx` | Entire frontend — all state, workflow stages, and UI in one component |
| `server/index.js` | Express server; 4 API routes: `/api/agent/start`, `/api/agent/answer`, `/api/proposal`, `/api/export/pdf` |
| `server/proposalGenerator.js` | LLM integration and local fallback logic; provider routing (Gemini vs OpenAI-compatible) |
| `server/pdfExport.js` | Converts LaTeX to PDF via `tectonic` CLI; sanitizes `\includegraphics` to inline placeholders |

### LLM provider routing

`proposalGenerator.js` detects the provider from `LLM_PROVIDER` env var or by matching the URL against `generativelanguage.googleapis.com`. Gemini uses its own request shape (`systemInstruction` + `generationConfig.responseMimeType`); everything else uses the OpenAI chat completions format.

### Frontend state persistence

Workspace state (topic, project fields, suggestions, decisions, run log, generated artifacts) is serialized to `localStorage` under the key `proposal-agent-final-project-memory-v1`. It auto-saves on any state change and can be manually saved/reloaded/cleared via the Memory bar.

### PDF compilation

`pdfExport.js` requires `tectonic` on `PATH`. It writes LaTeX to a temp directory, runs `tectonic`, reads back the PDF, and cleans up. If the LLM returns `\includegraphics` references, they are replaced with a LaTeX-native text box placeholder before compilation.

## Project context

This is a UCR CS222 final project (Spring 2026). The deliverables (not part of the app code) belong at the repo root:
- `workflow_usage.md` — Stage 2 usage evidence
- `AI_USAGE.md` — AI tool disclosure
- `proposal.pdf` / `proposal.tex` — Stage 3 final proposal
- `evidence/` — Screenshots, logs, transcripts

Templates for these files are in `templates/`. Grading rubric and proposal requirements are in `docs/`.

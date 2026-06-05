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

Copy `.env.example` to `.env`.

Key env vars:
- `LLM_PROVIDER`: `gemini` or `openai-compatible` (default: `openai-compatible`)
- `LLM_API_URL`: For Gemini use `https://generativelanguage.googleapis.com/v1beta`; for OpenAI-compatible APIs use the completions endpoint
- `LLM_API_KEY`: API key
- `LLM_MODEL`: Model name (e.g. `gemini-2.5-flash`)
- `MOCK_LLM=true`: Skips all real API calls in `claudeRefine.js` and returns hard-coded mock responses. Useful for UI development without an API key. The `proposalGenerator.js` fallback is separate — it activates automatically when `LLM_API_KEY` or `LLM_MODEL` is absent.

## Architecture

Full-stack proposal-writing agent app: React + Vite frontend proxied to an Express API backend. The app has two parallel interaction patterns that feed the same "Research Proposal Draft" output section, followed by a multi-agent Review Dashboard.

### Two interaction paths

**Path A — 6-step guided stepper (primary):**
Each step opens a modal popup. Saving a step writes structured data into the `proposalOutput` state object, marks the step complete, and populates the matching draft fields in the main panel.

1. **Project Details** (`ProjectDetailsModal`) — research title, student/supervisor info, degree program, research area, budget, objectives. "LLM Generate" calls `POST /api/refine/title-intro` → `refineTitleAndIntro()`.
2. **Research Problem** (`ResearchProblemModal`) — problem description, motivation, primary question, hypotheses. AI actions call `/api/research/enhance-problem`, `/api/research/motivation`, `/api/research/suggest-question`, `/api/research/suggest-hypotheses`.
3. **Methodology** (`MethodologyModal`) — research type, data source, tools (tag input), experiment description, contributions. "Generate Methodology" calls `POST /api/research/generate-methodology` → `generateMethodology()`.
4. **Timeline** (`TimelineModal`) — duration (weeks), team size, budget, activity list. "Generate Timeline" calls `POST /api/research/generate-timeline` → `generateTimeline()`.
5. **Risks & Mitigation** (`RisksModal`) — risk category, description, likelihood/impact, mitigation. AI actions call `/api/research/structure-risk` and `/api/research/suggest-mitigation`. Multiple risks can be saved in a list.
6. **References** (`ReferencesModal`) — DOI lookup via `POST /api/research/fetch-doi` → `fetchDoiReference()` which first hits the CrossRef public API (`api.crossref.org`) then falls back to an LLM call. References can also be typed manually.

**Path B — LLM suggestion workflow (secondary):**
User enters a rough idea in the topic input. "Structure Idea" calls `POST /api/agent/start` → `startAgentSession()` which returns `fieldSuggestions`, `decisions`, and `questions`. The user accepts/skips suggestions using card decks. Custom notes can be submitted via `POST /api/agent/answer` → `answerAgentQuestion()`. Accepted fields populate the "Accepted Project State" panel and `project` state.

### Generate Proposal

The "Generate Proposal" button (bottom of draft section) opens `GenerateFormatPopup`, which calls `POST /api/generate-from-output` → `buildLatexFromOutput()` to assemble a LaTeX document from `proposalOutput` state. The modal then calls `POST /api/export/pdf` to compile it and displays a live PDF preview with download buttons for both PDF and LaTeX.

The legacy "Generate Proposal" path in the suggestion workflow calls `POST /api/proposal` → `generateProposal()` which uses the LLM (or local fallback) to generate LaTeX + a `complianceMatrix` + `evaluationReport`.

### Workspace Memory bar

Sits immediately below the Research Proposal Draft section. Save / Reload / Clear persist the full proposal state to `localStorage` under `proposal-agent-final-project-memory-v1`. The snapshot covers both Path A state (proposalOutput, completedSteps, projectDetails, researchProblemData, methodologyData, timelineActivities, risksData, referencesData) and Path B state (topic, project, fieldSuggestions, decisions, etc.). Auto-save fires on any state change once the initial load has completed.

### Review Dashboard

Sits below the Research Proposal Draft and Workspace Memory bar. "Review Proposal" runs `computeReviewScores(proposalOutput)` — a **client-side** function that reads the 11 `proposalOutput` fields and produces an integer score for each of six dimensions (Completeness, Methodology, Novelty, References, Writing Quality, Consistency) plus an overall score. No API call is made for this step.

The dashboard shows:
- An overall score bar with color coding (green ≥ 85, amber ≥ 65, red below)
- Six dimension score bars
- "View Issues" — lists detected field-level issues
- "Auto Fix" — calls `POST /api/review/auto-fix` → `autoFixField()` to patch fields inline

### 6 Review Agents

Each agent is an independent LLM call that appears as its own card below the Review Dashboard. All agents call `POST /api/review/<name>` → the corresponding function in `claudeRefine.js`. Each agent section includes:
- A **Run Agent** button (or **Run Consolidation** for the Final agent)
- A collapsible **Prompt** panel showing the exact system prompt
- Structured results rendered with agent-specific UI
- A **Correct Proposal** button that appears once results are available

| # | Agent | Route | What It Checks |
|---|---|---|---|
| 1 | Completeness Reviewer | `POST /api/review/completeness` | Presence and quality of all 11 proposal sections |
| 2 | Research Quality Reviewer | `POST /api/review/quality` | Novelty, Research Gap, Contribution, Scientific Merit |
| 3 | Methodology Reviewer *(Critical)* | `POST /api/review/methodology` | Dataset, Experimental Design, Evaluation Metrics, Baseline Comparisons, Reproducibility |
| 4 | Consistency Reviewer | `POST /api/review/consistency` | Cross-section alignment (title ↔ contributions, methodology ↔ timeline, etc.) |
| 5 | CS Academic Reviewer | `POST /api/review/cs-academic` | Technical Clarity, Research Gap Articulation, Methodology Completeness, Problem–Method Alignment, Academic Writing Quality, CS Research Standards |
| Final | Consolidation Agent | `POST /api/review/consolidate` | Aggregates all prior agent reports, removes duplicates, outputs Top 5 prioritised improvements |

### Correction workflow

After any review agent produces results, a **"Correct Proposal"** button appears. Clicking it calls `POST /api/review/correct` → `correctFromReview(proposalOutput, agentName, feedback)`. The LLM returns `{ corrections: { field: revisedText }, explanation }` — only the fields the reviewer flagged. A correction preview panel then shows:
- A brief explanation of the changes
- Each corrected field with its revised text
- **Accept Changes** — applies all corrections to `proposalOutput` via `updateOutput()`
- **Discard** — clears the preview without saving

### Export Actions bar

Centered row of three buttons below the Final Consolidation Agent:
- **LaTeX** — calls `POST /api/generate-from-output` and triggers a `.tex` file download
- **PDF** — opens `GenerateFormatPopup` (live PDF preview + download)
- **Review Checklist** — opens a modal summarising 6-step completion status and all 11 proposal section statuses

### Key files

| File | Role |
|---|---|
| `src/App.jsx` | Entire frontend — all state, 6 modal components, `ProposalStepper`, `GenerateFormatPopup`, `CorrectionPanel`, and the main App component. No sub-files. |
| `server/index.js` | Express server; 28 API routes covering agent workflow, all 6 stepper section helpers, DOI lookup, LaTeX assembly, PDF export, 6 review agents, auto-fix, and proposal correction |
| `server/proposalGenerator.js` | `startAgentSession`, `answerAgentQuestion`, `generateProposal`, `buildLatexFromOutput`; provider routing (Gemini vs OpenAI-compatible); deterministic local fallback when `LLM_API_KEY` or `LLM_MODEL` is absent |
| `server/claudeRefine.js` | All per-section LLM helpers called by the 6-step modal popups, all 6 review agent functions, `autoFixField`, and `correctFromReview`; respects `MOCK_LLM=true`; `fetchDoiReference` hits CrossRef first |
| `server/pdfExport.js` | Converts LaTeX to PDF via `tectonic` CLI; sanitizes `\includegraphics` to inline placeholders |

### LLM provider routing (proposalGenerator.js)

Detects provider from `LLM_PROVIDER` env var or by matching the URL against `generativelanguage.googleapis.com`. Gemini uses its own request shape (`systemInstruction` + `generationConfig.responseMimeType`); everything else uses the OpenAI chat completions format. Both paths fall back to deterministic local templates when the API key or model is missing.

### claudeRefine.js mock mode

`MOCK_LLM=true` short-circuits every exported function in `claudeRefine.js` to return a static `MOCK` object (hard-coded network-ops themed sample data). The `fetchDoiReference` function always tries CrossRef first regardless of `MOCK_LLM`. The `MOCK` object includes entries for all 6 review agents (`completeness`, `quality`, `methodology`, `consistency`, `csReview`, `consolidation`), the review dashboard (`review`), and the correction workflow (`corrections`, `methodologyText`).

### Frontend state

The main `App` component holds all state. Key state buckets:
- `projectDetails` / `researchProblemData` / `methodologyData` / `timelineActivities` / `risksData` / `referencesData` — per-modal data
- `proposalOutput` — flat object with 11 string fields that populate the "Research Proposal Draft" section
- `completedSteps` — `{ projectDetails, researchProblem, methodology, timeline, risks, references }` booleans driving stepper appearance
- `project` / `fieldSuggestions` / `decisions` — Path B (LLM suggestion workflow) state
- `reviewResult` — output of `computeReviewScores(proposalOutput)` (client-side, no API)
- Per-agent state triplets: `[agent]Loading` / `[agent]Result` / `[agent]Error` for each of the 6 review agents
- Per-agent correction state pairs: `[agent]Correcting` / `[agent]Corrections` for each of the 6 review agents

Workspace state (all Path A + Path B fields) is serialized to `localStorage` under `proposal-agent-final-project-memory-v1`. Auto-save fires on any change once the initial load completes.

### PDF compilation

`pdfExport.js` requires `tectonic` on `PATH`. It writes LaTeX to a temp directory, runs `tectonic`, reads back the PDF, and cleans up. If `tectonic` is not installed, `POST /api/export/pdf` returns a 500 and the UI shows a hint to download the LaTeX source instead.

## Project context

This is a UCR CS222 final project (Spring 2026). The deliverables (not part of the app code) belong at the repo root:
- `workflow_usage.md` — Stage 2 usage evidence
- `AI_USAGE.md` — AI tool disclosure
- `proposal.pdf` / `proposal.tex` — Stage 3 final proposal
- `evidence/` — Screenshots, logs, transcripts

Templates for these files are in `templates/`. Grading rubric and proposal requirements are in `docs/`.

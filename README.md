# Research Proposal Agent

A full-stack web app that guides a researcher through writing a structured research proposal using a 6-step workflow assisted by an LLM. It then runs a multi-agent review pipeline that scores, critiques, and automatically corrects the draft. The final output is a compiled LaTeX/PDF document.

## What It Does

The app has three main stages: **draft**, **review**, and **export**.

---

### Stage 1 — Draft

**6-step guided stepper**

Each step opens a modal form. Filling in and saving a step populates the corresponding section of the "Research Proposal Draft" panel. LLM-powered helper buttons appear inside each modal.

| Step | What You Fill In | LLM Helpers Available |
|---|---|---|
| 1. Project Details | Title, student/supervisor info, degree program, research area, budget, objectives | Generate title and objective from a rough idea |
| 2. Research Problem | Problem description, motivation, primary question, hypotheses | Enhance problem, generate motivation, suggest question and hypotheses |
| 3. Methodology | Research type, data source, tools (tag input), experiment design, contributions | Generate full methodology (phase-based bullets in draft panel) |
| 4. Timeline | Duration (weeks), team size, budget, activity list | Standard activity list auto-generated from the duration — no LLM button |
| 5. Risks & Mitigation | Risk category, description, likelihood, impact, mitigation (multiple risks) | AI-structure a risk description, suggest a mitigation strategy |
| 6. References | DOI lookup (via CrossRef) or manual entry | CrossRef public API; LLM fallback if CrossRef fails |

The **Research Proposal Draft** panel shows the following fields once each step is saved:
- 1a. Research Title, 1b. Objective
- 2a. Problem Statement, 2b. Hypothesis, 2c. Motivation (Primary Question not shown in draft)
- 3a. Methodology, **3b. Data Source**, 3c. Tools, 3d. Expected Contributions
- 4. Timeline, 5. Risks & Mitigation, 6. References

**Workspace Memory**

A Save / Reload / Clear bar sits below the Research Proposal Draft section. Each button asks for confirmation before acting:
- **Save** — snapshots all 6 stepper forms and the proposal output to browser localStorage.
- **Reload** — restores the last saved snapshot.
- **Clear** — resets all draft fields, clears step completion, and removes the saved snapshot.

Auto-save fires on every state change.

---

### Stage 2 — Review Dashboard + 6 AI Review Agents

After filling in the draft, click **Review Proposal** to run a client-side analysis of the 11 proposal fields. No API call is made — the score is computed instantly from the actual text content and reported across six dimensions:

| Dimension | What Is Measured |
|---|---|
| Completeness | Are all 11 fields present and non-trivial? |
| Methodology | Does the methodology describe experiment design, tools, and approach? |
| Novelty | Does the proposal contain research-gap and contribution language? |
| References | Are there multiple properly-formatted citations? |
| Writing Quality | Are sentences complete and professional in length? |
| Consistency | Do title keywords appear in the problem statement? |

**View Issues** lists field-level problems. **Auto Fix** calls the LLM to patch flagged fields in place. Scores **automatically refresh** whenever a per-issue fix is accepted.

**5 Specialist Review Agents + 1 Consolidation Agent**

Each agent is an independent LLM call. Run them in any order after the review dashboard. A green **"Review complete"** badge appears next to the agent title as soon as a run succeeds. Re-running the agent clears and resets the badge.

| Agent | What It Checks | Output |
|---|---|---|
| 1 — Completeness Reviewer | Presence and quality of all 11 sections | Present / Weak / Missing lists with detail |
| 2 — Research Quality Reviewer | Novelty, Research Gap, Contribution, Scientific Merit | Per-dimension issue + suggestion cards |
| 3 — Methodology Reviewer *(Critical)* | Dataset, Experimental Design, Evaluation Metrics, Baseline Comparisons, Reproducibility | Pass / Warn / Fail cards with weakness + recommendation |
| 4 — Consistency Reviewer | Cross-section alignment (title ↔ contributions, methodology ↔ timeline, etc.) | Side-by-side inconsistency cards with severity |
| 5 — CS Academic Reviewer | Technical Clarity, Research Gap Articulation, Methodology Completeness, Problem–Method Alignment, Academic Writing Quality, CS Research Standards | Overall score (0–100), dimension scores, major recommendations |
| Final — Consolidation Agent | All prior agent reports combined | Top 5 prioritised improvements, deduped across agents |

**Per-issue Fix + Accept / Discard (optional)**

Every issue, suggestion, and improvement card has a **Fix** button. Clicking it sends just that item's text to the LLM (`POST /api/review/correct`), which returns a targeted correction for the relevant proposal field(s). An inline preview appears showing the revised text; **Accept Changes** applies only that fix to the draft and refreshes the Review Dashboard scores — the button becomes a green **Fixed** badge. **Discard** clears the preview without saving.

Fix is entirely optional — the "Review complete" badge appears as soon as the agent run completes, regardless of whether any fixes are accepted.

---

### Stage 3 — Export

A centered action bar below the Final Consolidation Agent provides:

- **LaTeX** — downloads the assembled `.tex` source file
- **PDF** — opens a live preview popup and compiles via Tectonic, with download buttons for both PDF and LaTeX
- **Review Checklist** — modal summarising 6-step completion status and all proposal field statuses

**PDF format:** The generated document uses a styled template matching the CS222 proposal format:
- Dark navy (`#1B3A5C`) title block with course header, bold title, and author line
- Navy-boxed section headings with white text
- **Hypothesis** rendered as a bulleted list (H1/H2/H3 labels stripped)
- **Problem Statement** and **Motivation** as separate sections
- **Methodology** as bulleted phases (Phase/Step/Stage markers bolded), preceded by a **Data Source** line
- **Risks & Mitigation** as nested bullets: `• Risk N [Category]: desc. Likelihood/Impact.` with `◦ Mitigation:` sub-bullet
- **Timeline** as a full-width navy-header table
- **References** as a two-column table with navy citation keys
- Footer on every page: `CS 222 Spring 2026 — <title> — <author>`

---

## How to Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5174`

The API server listens on `http://127.0.0.1:8787`.

## Environment Setup

Copy `.env.example` to `.env` and fill in your API key:

```bash
cp .env.example .env
```

```text
LLM_PROVIDER=gemini
LLM_API_URL=https://generativelanguage.googleapis.com/v1beta
LLM_API_KEY=your_key_here
LLM_MODEL=gemini-2.5-flash
```

Without `LLM_API_KEY` and `LLM_MODEL` the app runs in local-fallback mode — all proposal generation uses deterministic templates and no API calls are made.

Set `MOCK_LLM=true` to short-circuit the per-section modal helpers and all review agent API calls with hard-coded sample responses. Each per-issue **Fix** action also returns agent-specific mock corrections. Useful for UI development without an API key.

## PDF Generation Requirement

Tectonic must be installed and available on `PATH` for PDF compilation to work. If it is not installed, the Generate Proposal popup will show a hint to download the LaTeX source instead and compile manually.

Install Tectonic: https://tectonic-typesetting.github.io/

## How to Use

### Writing the Proposal

1. Open the app and click **Project Details** (step 1). Fill in your research title, student info, and objectives. Use "LLM Generate" to draft a title and objective from a rough idea. Click Save.
2. Click **Research Problem** (step 2). Describe the problem, then use the AI buttons to enhance it, generate a motivation paragraph, and suggest a research question and hypotheses. Click Save.
3. Click **Methodology** (step 3). Select a research type, fill in the data source field, add tools as tags, and describe the experiment. Click "Generate Methodology" to produce a phase-based methodology. Add expected contributions. Click Save. The draft panel shows Data Source (3b) alongside the methodology.
4. Click **Timeline** (step 4). A standard activity list is automatically generated for the duration shown in the weeks box (default 8 weeks). Change the duration to regenerate the list. Edit any activity name or week range directly — once you make an edit, the list is locked to your version and changing the duration no longer regenerates it. Add or remove rows as needed. Click Save.
5. Click **Risks & Mitigation** (step 5). Add one or more risks — each with category, description, likelihood, impact, and mitigation. Use "AI Structure Risk" and "AI Suggest Mitigation" to refine each entry. Multiple risks can be added and saved to the list. Click Save. Risks appear in the draft as nested bullets with mitigation sub-bullets.
6. Click **References** (step 6). Enter a DOI and click "Fetch" to auto-populate a formatted citation from CrossRef, or type one manually. Add as many references as needed. Click Save.
7. Review the **Research Proposal Draft** fields in the main panel. Edit any field directly inline. The title heading above the draft always reflects the current value of the "1a. Research Project Title" field — editing it inline updates the heading immediately.
8. Click **Save** in the Workspace Memory bar. Confirm the dialog to persist all draft state to localStorage. Use **Reload** to restore a saved snapshot, or **Clear** to reset all fields.

### Reviewing and Correcting

9. Click **Review Proposal** in the Review Dashboard. Scores appear instantly — no API call needed.
10. Click **View Issues** to see which fields need attention, or **Auto Fix** to let the LLM patch flagged fields automatically.
11. Run each review agent (Completeness → Research Quality → Methodology → Consistency → CS Academic) using its **Run Agent** button. Read the structured feedback in each card.
12. For any agent with issues, click **Fix** next to a specific issue or suggestion to have the LLM generate a targeted correction for just that item. Review the inline preview and click **Accept Changes** to apply it — only that fix's fields are updated, and the Review Dashboard scores refresh automatically. Click **Discard** to ignore. The green **"Review complete"** badge appears as soon as the agent run completes; fixing issues is optional.
13. Once all agents have run, click **Run Consolidation** in the Final Consolidation Agent to get a unified, prioritised Top 5 improvement list. Use the **Fix** button on individual improvements if desired.

### Exporting

14. Click **LaTeX** to download the assembled `.tex` source, or **PDF** to open the live preview popup and download the compiled PDF.
15. Click **Review Checklist** to verify all steps are complete before submitting.

---

## API Routes (28 total)

| Route | Purpose |
|---|---|
| `GET /api/health` | Server status |
| `POST /api/agent/start` | Start LLM suggestion workflow |
| `POST /api/agent/answer` | Submit answer in suggestion workflow |
| `POST /api/proposal` | Generate full proposal (legacy path) |
| `POST /api/refine/title-intro` | LLM generate title and objective |
| `POST /api/refine/problem` | Refine problem statement |
| `POST /api/research/enhance-problem` | Enhance problem description |
| `POST /api/research/motivation` | Generate motivation paragraph |
| `POST /api/research/suggest-question` | Suggest primary research question |
| `POST /api/research/suggest-hypotheses` | Suggest testable hypotheses |
| `POST /api/research/generate-methodology` | Generate methodology paragraph |
| `POST /api/research/generate-timeline` | Generate distributed timeline |
| `POST /api/research/structure-risk` | AI-structure a risk description |
| `POST /api/research/suggest-mitigation` | Suggest mitigation strategy |
| `POST /api/research/fetch-doi` | Fetch reference from CrossRef / LLM |
| `POST /api/research/generate-references` | Format references list |
| `POST /api/research/validate-citations` | Validate citation style |
| `POST /api/review/proposal` | Review proposal (legacy, LLM-based) |
| `POST /api/review/auto-fix` | Auto-fix flagged fields |
| `POST /api/review/completeness` | Agent 1: Completeness review |
| `POST /api/review/quality` | Agent 2: Research quality review |
| `POST /api/review/methodology` | Agent 3: Methodology review |
| `POST /api/review/consistency` | Agent 4: Consistency review |
| `POST /api/review/cs-academic` | Agent 5: CS academic review |
| `POST /api/review/consolidate` | Final consolidation of all reviews |
| `POST /api/review/correct` | LLM-generate corrections from review |
| `POST /api/generate-from-output` | Assemble LaTeX from proposal output |
| `POST /api/export/pdf` | Compile LaTeX to PDF via Tectonic |

---

## Deadlines And Submission Requirements

All deadlines use Pacific Time.

| Stage | Due Date | Submit | Notes |
| --- | --- | --- | --- |
| Stage 1: Initial Agent + Workflow Design | Friday, June 5, 2026, 11:59 PM | 5-minute presentation video, initial agent/prototype artifact, optional screenshots or interaction trace. | Stage 1 is graded from the video. The in-person presentation is mandatory but not separately graded. Late submissions accepted until Sunday, June 7, 2026, 11:59 PM with a 20% penalty. |
| Stage 2: Refined Agent + Workflow Usage | Friday, June 12, 2026, 11:59 PM | Refined agent/workflow, `workflow_usage.md`, run evidence, `AI_USAGE.md`. | Late submissions accepted until Sunday, June 14, 2026, 11:59 PM with a 20% penalty. |
| Stage 3: Final Proposal | Friday, June 12, 2026, 11:59 PM | `proposal.pdf`, proposal source, references or source notes, figure/diagram source if applicable. | Late submissions accepted until Sunday, June 14, 2026, 11:59 PM with a 20% penalty. |

## Stage 1 Deliverables

Stage 1 focuses on initial agent design and workflow thinking. A polished proposal is not required.

Submit:

- initial agent or prototype demo artifact;
- 5-minute presentation video or link;
- mandatory in-person presentation for demonstration and feedback;
- optional screenshots or interaction trace.

Details: [docs/stage_1_workflow_design.md](docs/stage_1_workflow_design.md)

## Stage 2 Deliverables

Stage 2 focuses on refined agent behavior and workflow usage evidence.

Submit:

- refined agent implementation or reproducible workflow artifact;
- `workflow_usage.md`;
- run transcript, screenshots, logs, or demo;
- `AI_USAGE.md`;

Details: [docs/stage_2_workflow_usage.md](docs/stage_2_workflow_usage.md)

## Stage 3 Deliverables

Stage 3 focuses on final proposal quality.

Submit:

- `proposal.pdf`;
- `proposal.tex` or equivalent proposal source;
- references or source notes;
- figure or diagram source if applicable.

Details: [docs/stage_3_final_proposal.md](docs/stage_3_final_proposal.md)

## Required Proposal Requirements

The final proposal requirements are in:

[docs/proposal_requirements.md](docs/proposal_requirements.md)

Detailed grading is in one file:

[docs/grading_rubric.md](docs/grading_rubric.md)

## Grading Overview

Total: 100 points.

Bonus: up to 5 subjective points for unusually impressive work.

| Stage | Points | What It Evaluates |
| --- | ---: | --- |
| Stage 1: Initial Agent + Workflow Design | 30 | Initial agent/prototype, vibe coding demo, proposal-writing research, workflow thinking, and presentation. |
| Stage 2: Refined Agent + Workflow Usage | 20 | Evidence that the refined agent/workflow was used to generate, revise, and evaluate proposal content. |
| Stage 3: Final Proposal | 50 | Quality of the submitted `proposal.pdf`, including format, figure, logic, novelty, method, evaluation, feasibility, and writing. |

Detailed grading: [docs/grading_rubric.md](docs/grading_rubric.md)

## Suggested Repo Layout

```text
.
├── README.md
├── workflow_usage.md
├── proposal.pdf
├── proposal.tex
├── AI_USAGE.md
├── evidence/
└── source-code-or-workflow/
```

## Bottom Line

Stage 1 asks: **What is your initial agent and proposal-writing workflow idea?**

Stage 2 asks: **Did you refine and actually use that agent/workflow to produce proposal artifacts?**

Stage 3 asks: **Is the final proposal itself strong?**

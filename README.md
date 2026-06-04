# Research Proposal Agent

A full-stack web app that guides a researcher through writing a structured research proposal using a 6-step workflow assisted by an LLM. It generates a LaTeX document and compiles it to PDF.

## What It Does

The app provides two parallel ways to build a proposal:

**Primary: 6-step guided stepper**
Each step opens a modal form. Filling in and saving a step populates the corresponding section of the "Research Proposal Draft" panel. LLM-powered helper buttons appear inside each modal.

| Step | What You Fill In | LLM Helpers Available |
|---|---|---|
| 1. Project Details | Title, student/supervisor info, degree, research area, budget, objectives | Generate title and objective from a rough idea |
| 2. Research Problem | Problem description, motivation, primary question, hypotheses | Enhance problem statement, generate motivation, suggest question, suggest hypotheses |
| 3. Methodology | Research type, data source, tools, experiment design, contributions | Generate full methodology paragraph |
| 4. Timeline | Duration (weeks), team size, budget, activity list | Generate a distributed timeline |
| 5. Risks & Mitigation | Risk category, description, likelihood, impact, mitigation | AI-structure a risk description, suggest a mitigation strategy |
| 6. References | DOI lookup (via CrossRef) or manual entry | CrossRef public API; LLM fallback if CrossRef fails |

**Secondary: LLM suggestion workflow**
Enter a rough idea and click "Structure Idea" to have the LLM return suggested field values and decision cards. Accept or skip suggestions, submit custom notes, then draft a proposal from the assembled fields.

**Generate Proposal**
The "Generate Proposal" button assembles all draft section content into a LaTeX document and attempts to compile it to PDF via Tectonic. A preview popup shows the PDF inline with download buttons for PDF and LaTeX source.

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

Set `MOCK_LLM=true` to short-circuit the per-section modal helpers (`claudeRefine.js`) with hard-coded sample responses. Useful for UI development without an API key.

## PDF Generation Requirement

Tectonic must be installed and available on `PATH` for PDF compilation to work. If it is not installed, the Generate Proposal popup will show a hint to download the LaTeX source instead and compile manually.

Install Tectonic: https://tectonic-typesetting.github.io/

## How to Use (6-Step Workflow)

1. Open the app and click **Project Details** (step 1 in the stepper). Fill in your research title, student info, and objectives. Use "LLM Generate" to draft a title and objective from a rough idea. Click Save.
2. Click **Research Problem** (step 2). Describe the problem, then use the AI buttons to enhance it, generate a motivation paragraph, and suggest a research question and hypotheses. Click Save.
3. Click **Methodology** (step 3). Select a research type, describe your data source, add tools as tags, and describe the experiment. Click "Generate Methodology" to produce a paragraph. Add expected contributions. Click Save.
4. Click **Timeline** (step 4). Set the duration in weeks and list your activities. Use "Generate Timeline" to distribute activities across the duration. Click Save.
5. Click **Risks & Mitigation** (step 5). Add one or more risks with category, description, likelihood, and impact. Use "AI Structure Risk" and "AI Suggest Mitigation" to refine each entry. Click Save.
6. Click **References** (step 6). Enter a DOI and click "Fetch" to auto-populate a formatted citation from CrossRef, or type one manually. Add as many references as needed. Click Save.
7. Review the **Research Proposal Draft** fields in the main panel. Edit any field directly.
8. Click **Generate Proposal** to produce LaTeX and a compiled PDF. Download either format.

## Deadlines And Submission Requirements

All deadlines use Pacific Time.

| Stage | Due Date | Submit | Notes |
| --- | --- | --- | --- |
| Stage 1: Initial Agent + Workflow Design | Friday, June 5, 2026, 11:59 PM | 5-minute presentation video, initial agent/prototype artifact, optional screenshots or interaction trace. | Stage 1 is graded from the video. The in-person presentation is mandatory but not separately graded; it is for showing motivation, ideas, goals, and peer feedback. Late submissions accepted until Sunday, June 7, 2026, 11:59 PM with a 20% penalty. |
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

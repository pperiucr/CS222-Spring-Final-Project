const IS_MOCK = process.env.MOCK_LLM === 'true';

const MOCK = {
  titleAndIntro: {
    research_title: 'Intelligent Network Operations via NLP Agents',
    introduction: 'This research aims to design and evaluate an NLP-driven agent framework for automating network operations tasks. The proposed system will interpret natural language commands, map them to network control actions, and reduce manual intervention in complex infrastructure management. The work addresses a critical gap between human-expressed operational intent and machine-executable network policies.'
  },
  problemStatement: 'Modern network operations require skilled engineers to interpret alerts, diagnose faults, and execute remediation steps manually, leading to slow response times and human error. Existing automation tools lack the ability to understand high-level natural language intent and translate it into precise, context-aware network actions. This research proposes an NLP-driven agent that bridges the gap between natural language operational commands and automated network control.',
  enhancedProblem: 'Contemporary network operations centers (NOCs) face a critical scalability challenge: the volume and complexity of network events far exceeds the capacity of human operators to respond in real time. Current rule-based automation systems are brittle and cannot interpret the nuanced, context-dependent intent expressed in natural language by network engineers. This research addresses the fundamental problem of translating free-form operational commands into precise, verifiable network control actions.',
  motivation: 'Network infrastructure underpins every digital service, yet its management remains largely manual and error-prone. As networks grow in scale and complexity, the gap between human cognitive capacity and operational demands widens. An NLP-driven agent can dramatically reduce mean-time-to-resolution for network incidents, lower operational costs, and enable smaller teams to manage larger, more complex infrastructures — directly impacting service reliability and business continuity.',
  primaryQuestion: 'How can a large language model-based agent accurately interpret natural language network operation commands and execute them with measurable reliability across heterogeneous network environments?',
  hypotheses: [
    'An NLP agent fine-tuned on network operation logs will achieve higher command-to-action accuracy than a zero-shot baseline model.',
    'Integrating retrieval-augmented generation (RAG) with network topology context will reduce hallucination rate in generated configuration commands by at least 40%.',
    'The proposed agent will reduce average incident response time by 30% compared to manual operator workflows in simulated NOC scenarios.'
  ],
  methodologyText: {
    methodology: 'This study adopts an experimental research design combining dataset construction, model fine-tuning, and controlled simulation testing. A corpus of annotated network operation transcripts will be constructed from open NOC logs and synthetic examples. A transformer-based agent will be fine-tuned and evaluated against baseline models using intent accuracy, execution correctness, and latency metrics. Experiments will be conducted in a simulated network environment using GNS3 with representative enterprise topologies.',
    contributions: [
      'A publicly released corpus of 500+ annotated NOC transcripts for NLP-based network automation research.',
      'A RAG-augmented transformer agent achieving state-of-the-art command-to-action accuracy on heterogeneous topologies.',
      'An open-source evaluation benchmark with three baselines and standardised metrics (Precision, Recall, F1, MTTR).'
    ]
  },
  timelineActivities: [
    { name: 'Literature Review & Dataset Collection', months: 'Week 1' },
    { name: 'Model Design & Fine-Tuning', months: 'Week 2' },
    { name: 'Simulation Setup & Experiments', months: 'Week 3' },
    { name: 'Evaluation, Writing & Revision', months: 'Week 4' }
  ],
  reference: 'Y. Yu, X. Li, X. Leng, et al., "Fault Management in Software-Defined Networking: A Survey," IEEE Communications Surveys & Tutorials, vol. 21, no. 1, pp. 349-392, 2019.',
  consolidation: {
    top_improvements: [
      {
        rank: 1,
        title: 'Add explicit research gap',
        description: 'No section clearly states the gap in existing knowledge. Add a dedicated paragraph citing 2–3 papers and showing precisely where each falls short of the proposed approach.',
        source_agents: ['Agent 1: Completeness', 'Agent 2: Research Quality'],
        priority: 'critical'
      },
      {
        rank: 2,
        title: 'Strengthen evaluation methodology',
        description: 'Quantitative metrics are entirely absent. Define Precision, Recall, F1 Score, Recovery Time, and Network Availability as primary success criteria, and specify the statistical tests that will validate results.',
        source_agents: ['Agent 3: Methodology', 'Agent 5: CS Academic'],
        priority: 'critical'
      },
      {
        rank: 3,
        title: 'Add RL baseline comparison',
        description: 'No baseline methods are identified. Compare the proposed approach against rule-based diagnosis, static recovery, and existing RL-based SDN approaches to demonstrate novelty and measure improvement.',
        source_agents: ['Agent 2: Research Quality', 'Agent 3: Methodology'],
        priority: 'high'
      },
      {
        rank: 4,
        title: 'Include ethics discussion',
        description: 'Proposals involving automated network control and operational data must address data privacy, potential misuse, and responsible deployment. Add a dedicated risks section covering these concerns.',
        source_agents: ['Agent 5: CS Academic'],
        priority: 'high'
      },
      {
        rank: 5,
        title: 'Expand expected contributions',
        description: 'The stated contributions are too broad and overlap with existing literature. Enumerate 3–4 specific, testable contributions and tie each one directly to a research question or hypothesis.',
        source_agents: ['Agent 1: Completeness', 'Agent 2: Research Quality', 'Agent 5: CS Academic'],
        priority: 'medium'
      }
    ],
    summary: 'The proposal has a solid foundation but requires significant strengthening in evaluation methodology and novelty articulation before it would be competitive for academic submission.'
  },
  csReview: {
    overall_score: 86,
    dimensions: [
      { name: 'Technical Clarity',   score: 9, max: 10, notes: 'Algorithms and system components are well described. Minor improvements needed in formal notation.' },
      { name: 'Research Gap',        score: 8, max: 10, notes: 'Gap is identified but needs stronger contrast against specific recent work.' },
      { name: 'Methodology',         score: 7, max: 10, notes: 'Tools and approach described but datasets and baselines are absent.' },
      { name: 'Experimental Design', score: 8, max: 10, notes: 'Experimental framework is reasonable but evaluation metrics need specification.' },
      { name: 'Academic Writing',    score: 9, max: 10, notes: 'Well-structured with clear language. Minor redundancy in the motivation section.' },
      { name: 'Technical Merit',     score: 8, max: 10, notes: 'Approach is sound and feasible. Threats to validity not addressed.' }
    ],
    major_recommendations: [
      'Explicitly compare the proposed NLP-RL framework against existing SDN self-healing approaches.',
      'Define baseline methods for fault diagnosis and recovery.',
      'Add evaluation metrics such as Precision, Recall, F1 Score, Recovery Time, and Network Availability.',
      'Clarify dataset generation and fault injection procedures.',
      'Strengthen the novelty statement by highlighting the integration of NLP-based diagnosis and RL-based remediation.'
    ]
  },
  consistency: {
    inconsistencies: [
      {
        section_a: 'Research Question',
        value_a: 'Reduce packet loss',
        section_b: 'Methodology',
        value_b: 'Measures latency only',
        description: 'The research question targets packet loss reduction but the evaluation plan measures only latency. No packet loss metric is defined anywhere in the methodology.',
        severity: 'high'
      },
      {
        section_a: 'Timeline',
        value_a: 'Timeline says 12 months',
        section_b: 'Methodology',
        value_b: 'Methodology implies 24 months of experiments',
        description: 'Dataset collection, three fine-tuning rounds, and multi-topology simulation described in the methodology cannot realistically be completed in 12 months. Scope must be reduced or timeline extended.',
        severity: 'high'
      },
      {
        section_a: 'Title',
        value_a: 'NLP-Driven Network Operations Agent',
        section_b: 'Contributions',
        value_b: 'Contributions focus solely on fault detection',
        description: 'The title implies broad network operations coverage but the stated contributions are scoped only to fault detection and recovery. Other operations aspects are not addressed.',
        severity: 'medium'
      }
    ],
    consistent_pairs: ['Hypothesis ↔ Problem Statement', 'References ↔ Research Area'],
    overall: 'Inconsistencies Found'
  },
  methodology: {
    checks: [
      {
        name: 'Dataset',
        status: 'warn',
        weakness: 'Dataset source is mentioned but size, provenance, and preprocessing steps are not described.',
        recommendation: 'Specify:\n- Dataset name and source (public / synthetic)\n- Number of samples\n- Preprocessing and filtering steps applied'
      },
      {
        name: 'Experimental Design',
        status: 'warn',
        weakness: 'The experimental setup lacks detail on train/test splits, cross-validation strategy, and number of independent runs.',
        recommendation: 'Define:\n- Train/test split ratio (e.g. 80/20)\n- Cross-validation folds (e.g. 5-fold)\n- Number of independent runs for statistical reliability'
      },
      {
        name: 'Evaluation Metrics',
        status: 'fail',
        weakness: 'No quantitative evaluation metrics are defined. Success criteria are vague.',
        recommendation: 'Define primary metrics:\n- Accuracy / F1-score for classification tasks\n- Latency (ms) for response time\n- Mean Time to Resolution (MTTR) reduction %'
      },
      {
        name: 'Baseline Comparisons',
        status: 'fail',
        weakness: 'No baseline methods identified.',
        recommendation: 'Compare against:\n- Rule-based diagnosis\n- Static recovery\n- Existing RL approach'
      },
      {
        name: 'Reproducibility',
        status: 'warn',
        weakness: 'Code and data availability are not mentioned. Hyperparameters and environment specifications are absent.',
        recommendation: 'Commit to:\n- Open-sourcing the implementation\n- Documenting all hyperparameters\n- Providing a reproducibility checklist'
      }
    ],
    critical_issues: 2,
    overall: 'Major Revisions Required'
  },
  quality: {
    dimensions: [
      {
        name: 'Novelty',
        rating: 'weak',
        issue: 'Proposal discusses SDN fault management but novelty compared to existing RL-based solutions is unclear.',
        suggestion: 'Clearly explain how NLP-enhanced diagnosis differs from prior work and quantify the expected improvement over RL baselines.'
      },
      {
        name: 'Research Gap',
        rating: 'adequate',
        issue: 'A gap is implied but not explicitly stated with reference to the current state of the art.',
        suggestion: 'Add a dedicated paragraph citing 2–3 key papers and showing precisely where each falls short of the proposed approach.'
      },
      {
        name: 'Contribution',
        rating: 'adequate',
        issue: 'The contributions listed are broad and overlap with existing NLP-for-networking literature.',
        suggestion: 'Enumerate 3 specific, testable contributions and tie each directly to a research question or hypothesis.'
      },
      {
        name: 'Scientific Merit',
        rating: 'strong',
        issue: 'Experimental setup is reasonable but lacks detail on statistical significance testing.',
        suggestion: 'Specify sample sizes, test protocols, and the statistical tests that will be used to validate results.'
      }
    ],
    overall_verdict: 'Needs Revision'
  },
  completeness: {
    sections: [
      { name: 'Problem Statement',  present: true,  quality: 'strong'   },
      { name: 'Literature Review',  present: true,  quality: 'adequate' },
      { name: 'Methodology',        present: true,  quality: 'adequate' },
      { name: 'Research Questions', present: true,  quality: 'strong'   },
      { name: 'Timeline',           present: true,  quality: 'strong'   },
      { name: 'References',         present: true,  quality: 'adequate' },
      { name: 'Research Gap',       present: false, quality: 'missing'  },
      { name: 'Evaluation Metrics', present: false, quality: 'missing'  }
    ],
    missing: ['Research Gap', 'Evaluation Metrics'],
    weak: ['Literature Review lacks recent citations (post-2022)', 'Methodology missing quantitative evaluation detail'],
    details_missing: ['Quantitative success criteria', 'Baseline comparison methods', 'Dataset description and size']
  },
  review: {
    overallScore: 82,
    dimensions: {
      completeness: 90,
      methodology: 75,
      novelty: 78,
      references: 85,
      writingQuality: 88,
      consistency: 80
    },
    issues: [
      { field: 'methodology_text', severity: 'medium', message: 'Evaluation metrics are not clearly defined. Specify quantitative benchmarks for measuring success.' },
      { field: 'hypothesis', severity: 'low', message: 'Hypotheses could be more specific and measurable — add baseline comparisons.' },
      { field: 'references', severity: 'low', message: 'Consider adding more recent references (post-2022) to strengthen novelty claims.' },
      { field: 'contributions', severity: 'medium', message: 'Contributions overlap with existing work — clarify the novel aspect more explicitly.' },
      { field: 'risks_mitigation', severity: 'low', message: 'Mitigation strategies lack specificity. Add concrete fallback plans for each risk.' }
    ]
  },
  correctionsCompleteness: {
    corrections: {
      objective: 'This research aims to design, implement, and evaluate an NLP-driven agent framework for automating network operations tasks. Specific objectives are: (1) build an annotated NOC transcript corpus; (2) fine-tune a transformer model with RAG-based topology context; (3) evaluate against rule-based and RL baselines; (4) achieve a 30% reduction in mean-time-to-resolution in simulated enterprise environments.',
      hypothesis: 'H1: An NLP agent fine-tuned on annotated NOC logs will achieve ≥85% command-to-action accuracy versus a zero-shot baseline. H2: Integrating RAG with live topology context will reduce configuration-command hallucination rate by ≥40%. H3: The proposed agent will reduce average incident response time by ≥30% compared to manual operator workflows in GNS3 simulated scenarios.'
    },
    explanation: 'Completeness review found the Objective lacked specific measurable goals and the Hypotheses lacked quantitative thresholds. Both sections have been expanded with concrete targets and numbered sub-objectives.'
  },
  correctionsQuality: {
    corrections: {
      problem_statement: 'Network operations centers process thousands of alerts daily, yet 78% of resolution time is consumed by manual diagnosis — a gap that existing automation cannot close because rule-based systems cannot interpret context-dependent natural language intent. Prior work (Yu et al. 2019; Wang et al. 2021) addresses fault detection but not end-to-end natural language command execution. This research fills that gap by proposing an NLP agent that translates free-form operational commands directly into verified network control actions, representing a novel contribution at the intersection of NLP and network automation.',
      contributions: '1. A publicly released corpus of 500+ annotated NOC transcripts for NLP-based network automation research.\n2. A novel RAG-augmented transformer agent that achieves state-of-the-art command-to-action accuracy on heterogeneous network topologies.\n3. An open-source evaluation framework with three baselines (rule-based, static recovery, RL-SDN) and standardised metrics (Precision, Recall, F1, MTTR reduction).\n4. Empirical evidence that NLP-driven automation reduces incident response time by ≥30% in realistic enterprise simulations.'
    },
    explanation: 'Research Quality review found no explicit research gap citation and contributions overlapped with prior work. Problem statement now cites specific gaps in the literature; contributions list is rewritten to be concrete, novel, and distinct from existing approaches.'
  },
  correctionsMethodology: {
    corrections: {
      methodology_text: 'This study employs a four-phase experimental design to ensure rigorous evaluation and reproducibility. Phase 1 (Corpus Construction): collect and annotate 500+ NOC transcripts from public logs and synthetic generation, applying quality filtering and 80/20 train/test split. Phase 2 (Model Development): fine-tune a transformer model augmented with retrieval-augmented generation (RAG) for topology context; hyperparameter search via 5-fold cross-validation across 3 independent runs. Phase 3 (Controlled Evaluation): compare against three baselines — rule-based diagnosis, static recovery, and an RL-based SDN controller — using Precision, Recall, F1-score, MTTR reduction (%), and Network Availability as primary metrics; statistical significance tested with Wilcoxon signed-rank test (α=0.05). Phase 4 (Reproducibility): all code, datasets, model checkpoints, and GNS3 topology configs will be publicly released under MIT licence.'
    },
    explanation: 'Methodology review identified missing evaluation metrics, no defined train/test split, no baseline comparisons, and no reproducibility commitment. All four gaps are now explicitly addressed.'
  },
  correctionsConsistency: {
    corrections: {
      objective: 'This research aims to design and evaluate an NLP-driven agent for network operations automation, with the following objectives: (1) construct an annotated NOC corpus; (2) develop a RAG-augmented transformer agent; (3) measure command-to-action accuracy, MTTR reduction, and Network Availability against three baselines over a 24-week timeline; (4) publicly release all artefacts.',
      timeline: 'Week 1–4: Literature review and dataset collection (500+ NOC transcripts). Week 5–8: Data annotation, preprocessing, and 80/20 corpus split. Week 9–12: Model design, RAG integration, and initial fine-tuning. Week 13–16: Baseline implementation (rule-based, static recovery, RL-SDN). Week 17–20: Controlled evaluation and statistical analysis. Week 21–22: Reproducibility packaging (code, data, configs). Week 23–24: Proposal writing, revision, and submission.'
    },
    explanation: 'Consistency review found the Objective referenced a 12-week plan while the Timeline listed 24 weeks, and evaluation metrics in Objectives did not match the metrics described in the Methodology. Both sections are now aligned on a 24-week schedule with matching metrics.'
  },
  correctionsCs: {
    corrections: {
      problem_statement: 'Network operations automation is an open problem in systems research: existing approaches rely on rigid rule sets that cannot generalise across heterogeneous topologies or interpret the ambiguous, context-rich language used by network engineers. This research addresses the technical gap in NLP-to-network-control translation by designing an agent that grounds natural language commands in live topology state via retrieval-augmented generation, then executes verified configuration actions. The agent is evaluated on intent accuracy, execution correctness, and latency metrics — standard CS evaluation criteria for autonomous decision-making systems.',
      hypothesis: 'H1: A RAG-augmented NLP agent trained on domain-specific NOC transcripts will outperform a zero-shot GPT-4 baseline by ≥15 percentage points in command-to-action accuracy (F1). H2: Topology-grounded generation will reduce hallucinated configuration commands by ≥40% versus generation without retrieval context. H3: End-to-end MTTR in GNS3 simulations will decrease by ≥30% relative to manual operator workflows, measured over 100 incident scenarios.'
    },
    explanation: 'CS Academic review found the problem statement lacked technical precision and did not situate the work within CS research standards. Hypotheses lacked quantitative baselines and comparison anchors. Both sections have been revised to use formal CS evaluation language and explicit numerical targets.'
  },
  correctionsConsolidation: {
    corrections: {
      problem_statement: 'Network operations centers process thousands of alerts daily, yet incident resolution remains largely manual — a bottleneck rooted in the inability of existing automation to interpret context-dependent natural language intent. Prior work addresses fault detection (Yu et al. 2019) and static recovery (Wang et al. 2021) but no prior system translates free-form NLC commands into verified, topology-aware network control actions. This research closes that gap with an NLP-driven agent that achieves ≥85% command-to-action accuracy and ≥30% MTTR reduction in heterogeneous simulated environments.',
      methodology_text: 'Phase 1: Corpus — 500+ annotated NOC transcripts, 80/20 split, 5-fold CV. Phase 2: Model — transformer + RAG topology context, hyperparameter search, 3 independent runs. Phase 3: Evaluation — vs. rule-based, static-recovery, and RL-SDN baselines; metrics: Precision, Recall, F1, MTTR reduction, Network Availability; Wilcoxon signed-rank significance test (α=0.05). Phase 4: Reproducibility — code, datasets, model checkpoints, and GNS3 configs released under MIT licence.',
      contributions: '1. First publicly released annotated NOC transcript corpus (500+ entries) for NLP-based network automation.\n2. RAG-augmented transformer agent achieving state-of-the-art command-to-action F1 on heterogeneous topologies.\n3. Open-source evaluation benchmark with three baselines and standardised metrics.\n4. Empirical evidence of ≥30% MTTR reduction in realistic GNS3 enterprise simulations.'
    },
    explanation: 'Consolidation of all agent reports: added explicit research gap with citations (Completeness + Quality), strengthened evaluation metrics and baseline list (Methodology), and rewrote contributions to be novel and distinct (Quality + CS Academic).'
  }
};

const REVIEW_SYSTEM_PROMPT = `You are a rigorous research proposal reviewer. Evaluate the given proposal and return a JSON assessment with this exact shape:
{
  "overallScore": <integer 0-100>,
  "dimensions": {
    "completeness": <integer 0-100>,
    "methodology": <integer 0-100>,
    "novelty": <integer 0-100>,
    "references": <integer 0-100>,
    "writingQuality": <integer 0-100>,
    "consistency": <integer 0-100>
  },
  "issues": [
    { "field": "<field_key>", "severity": "high|medium|low", "message": "<concise actionable issue description>" }
  ]
}

Scoring guide:
- completeness: Are all required sections present and adequately filled?
- methodology: Is the research approach sound, detailed, and appropriate?
- novelty: Does the proposal identify a genuine gap and propose novel contributions?
- references: Are citations present, relevant, and properly formatted?
- writingQuality: Is the writing clear, professional, and academically rigorous?
- consistency: Are all sections aligned and internally consistent?

Return 3-6 specific, actionable issues. field should be one of: research_title, objective, problem_statement, hypothesis, motivation, methodology_text, tools, contributions, timeline_budget, risks_mitigation, references. Return only the JSON object.`;

const AUTO_FIX_SYSTEM_PROMPT = `You are a research proposal editor. Given a proposal field name, its current content, and an issue to fix, return an improved version of the content that addresses the issue while preserving correct existing content.
Return strict JSON: { "improved": "..." }
Keep it concise and professional. Return only the JSON.`;

const PROBLEM_SYSTEM_PROMPT = `You are a research proposal writing expert. Take a rough, informal research idea and rewrite it as a crisp, sharp, professional problem statement.

The problem statement must be:
- 2-4 sentences, clear and concise
- Specific about the research gap or need being addressed
- Professional and academic in tone
- Free of vague or informal language

Return only the problem statement text, nothing else.`;

const TITLE_INTRO_SYSTEM_PROMPT = `You are a research proposal writing expert. Given a rough research idea, generate two things and return strict JSON in this exact shape:
{
  "research_title": "...",
  "introduction": "..."
}

Rules:
- "research_title": 4-8 words, crisp academic paper title, no jargon overload
- "introduction": 3-5 sentences stating the research objective — what it aims to achieve, why it matters, and what gap it fills. Professional, academic tone.
- Return only the JSON object, nothing else.`;

async function callGemini(systemPrompt, userText) {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = (process.env.LLM_API_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
  const model = process.env.LLM_MODEL || 'gemini-2.5-flash';

  if (!apiKey) throw new Error('LLM_API_KEY is not configured.');

  const response = await fetch(`${baseUrl}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generationConfig: { temperature: 0.2 }
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Gemini API returned ${response.status}`);

  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('');
  if (!text) throw new Error('Gemini returned no content.');
  return text.trim();
}

async function callGeminiJson(systemPrompt, userText) {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = (process.env.LLM_API_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
  const model = process.env.LLM_MODEL || 'gemini-2.5-flash';

  if (!apiKey) throw new Error('LLM_API_KEY is not configured.');

  const response = await fetch(`${baseUrl}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Gemini API returned ${response.status}`);

  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('');
  if (!text) throw new Error('Gemini returned no content.');
  return JSON.parse(text.trim());
}

export async function enhanceProblemStatement(problemDescription) {
  if (IS_MOCK) return MOCK.enhancedProblem;
  return callGemini(
    `You are a research proposal expert. Enhance the given research problem description to be clear, specific, and academically rigorous. Keep it 3-5 sentences. Return only the enhanced text, nothing else.`,
    `Research problem: ${problemDescription}`
  );
}

export async function generateMotivation(problemDescription) {
  if (IS_MOCK) return MOCK.motivation;
  return callGemini(
    `You are a research proposal expert. Write a compelling motivation paragraph (4-6 sentences) for the given research problem. Explain why this problem matters, its real-world impact, and why it needs to be solved now. Return only the motivation paragraph, nothing else.`,
    `Research problem: ${problemDescription}`
  );
}

export async function suggestResearchQuestion(problemDescription) {
  if (IS_MOCK) return MOCK.primaryQuestion;
  return callGemini(
    `You are a research proposal expert. Generate one clear, focused primary research question for the given research problem. It should be specific, measurable, and answerable through research. Return only the question, nothing else.`,
    `Research problem: ${problemDescription}`
  );
}

function decodeHtml(str) {
  return String(str)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}

function formatCrossRefCitation(work) {
  const authors = (work.author || []).map((a) =>
    `${a.given ? a.given.charAt(0) + '. ' : ''}${a.family || ''}`.trim()
  ).filter(Boolean);

  const authorStr = authors.length > 3
    ? `${authors.slice(0, 3).join(', ')}, et al.`
    : authors.join(', ');

  const title = decodeHtml(work.title?.[0] || '');
  const journal = decodeHtml(work['container-title']?.[0] || work.publisher || '');
  const year = work.published?.['date-parts']?.[0]?.[0] || work['published-print']?.['date-parts']?.[0]?.[0] || '';
  const volume = work.volume || '';
  const issue = work.issue || '';
  const pages = work.page || '';
  const doiStr = work.DOI || '';

  const parts = [];
  if (authorStr) parts.push(authorStr);
  if (title) parts.push(`"${title}"`);
  if (journal) parts.push(journal);
  if (volume) parts.push(`vol. ${volume}`);
  if (issue) parts.push(`no. ${issue}`);
  if (pages) parts.push(`pp. ${pages}`);
  if (year) parts.push(String(year));
  if (doiStr) parts.push(`doi: ${doiStr}`);

  return parts.join(', ') + '.';
}

export async function fetchDoiReference(doi) {
  // Always use CrossRef API — free, accurate, no API key needed
  try {
    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi.trim())}`, {
      headers: { 'User-Agent': 'ResearchProposalAgent/1.0 (mailto:sachinperimbeti123@gmail.com)' }
    });

    if (response.ok) {
      const data = await response.json();
      return formatCrossRefCitation(data.message);
    }
  } catch (_) { /* fall through */ }

  // Fall back to Gemini if CrossRef fails
  if (IS_MOCK) return MOCK.reference;
  return callGemini(
    `You are a citation formatter. Given a DOI, return only the full formatted academic citation in IEEE style. Include authors, title, journal/conference, volume, pages, and year. Return only the citation text, nothing else.`,
    `DOI: ${doi}`
  );
}

export async function generateReferences(citationStyle, references) {
  if (IS_MOCK) return `[1] ${MOCK.reference}`;
  const refList = references.map((r, i) => {
    if (r.bibtex.trim()) return `Entry ${i + 1} (BibTeX): ${r.bibtex}`;
    if (r.doi.trim()) return `Entry ${i + 1} (DOI): ${r.doi}`;
    return null;
  }).filter(Boolean).join('\n');

  return callGemini(
    `You are a research citation expert. Format the given references into a properly formatted reference list using the specified citation style. Number each entry. If a DOI is provided, construct a plausible formatted citation. If BibTeX is provided, format it correctly. Return only the formatted reference list, nothing else.`,
    `Citation style: ${citationStyle}\nReferences:\n${refList}`
  );
}

export async function validateCitations(citationStyle, references) {
  if (IS_MOCK) return `Entry 1: Valid — DOI format correct and citation well-formed.\nEntry 2: Valid — BibTeX fields complete.`;
  const refList = references.map((r, i) => {
    if (r.bibtex.trim()) return `Entry ${i + 1} (BibTeX): ${r.bibtex}`;
    if (r.doi.trim()) return `Entry ${i + 1} (DOI): ${r.doi}`;
    return `Entry ${i + 1}: (empty)`;
  }).join('\n');

  return callGemini(
    `You are a research citation expert. Validate the following references for the given citation style. For each entry, state whether it is Valid, Incomplete, or Invalid, and briefly explain why. Return a short validation report, nothing else.`,
    `Citation style: ${citationStyle}\nReferences:\n${refList}`
  );
}

export async function structureRisk(category, description) {
  if (IS_MOCK) return `[${category}] ${description.trim() || 'The identified risk poses a potential threat to project timelines and data quality if not addressed proactively through systematic mitigation strategies.'}`;
  return callGemini(
    `You are a research proposal expert. Rewrite the given risk description to be clear, specific, and professionally framed for a research proposal. 2-3 sentences max. Return only the rewritten description, nothing else.`,
    `Risk category: ${category}\nRisk description: ${description}`
  );
}

export async function suggestMitigation(category, description, likelihood, impact) {
  if (IS_MOCK) return `To mitigate this ${likelihood.toLowerCase()}-likelihood, ${impact.toLowerCase()}-impact ${category.toLowerCase()} risk, implement a proactive monitoring protocol with weekly checkpoints. Maintain a fallback dataset and document all assumptions explicitly. Allocate a 15% timeline buffer to absorb unexpected delays.`;
  return callGemini(
    `You are a research proposal expert. Suggest a concrete, actionable mitigation strategy for the given research risk. 2-4 sentences. Return only the mitigation text, nothing else.`,
    `Risk category: ${category}\nRisk: ${description}\nLikelihood: ${likelihood}\nImpact: ${impact}`
  );
}

export async function generateTimeline(durationMonths, activities) {
  if (IS_MOCK) return MOCK.timelineActivities.slice(0, activities.length);
  const activityList = activities.map((a) => `- ${a.name}: ${a.months}`).join('\n');
  const result = await callGeminiJson(
    `You are a research proposal expert. Given a research duration in weeks and a list of activities, generate a realistic, well-paced timeline. Return strict JSON:
{
  "activities": [
    { "name": "activity name", "months": "Week X" }
  ]
}
Distribute all activities across the full duration. Keep existing activity names. Use "Week X" or "Week X-Y" format. Return only the JSON.`,
    `Total duration: ${durationMonths} weeks\nActivities:\n${activityList}`
  );
  return Array.isArray(result.activities) ? result.activities : activities;
}

export async function generateMethodology(researchType, dataSource, tools, experimentDescription) {
  if (IS_MOCK) return MOCK.methodologyText;
  const result = await callGeminiJson(
    `You are a research proposal expert. Given the methodology inputs, return a JSON object with two fields:
1. "methodology": a clear, structured methodology section (4-6 sentences) covering the approach, data collection, tools, and experiment design. Professional academic tone.
2. "contributions": an array of 2-3 concise, specific expected contributions that follow directly from this methodology. Each contribution should be one sentence, novel, and tied to a concrete deliverable or finding.

Return strict JSON: { "methodology": "...", "contributions": ["...", "...", "..."] }`,
    `Research type: ${researchType}\nData source: ${dataSource}\nTools: ${tools.join(', ')}\nExperiment description: ${experimentDescription}`
  );
  return {
    methodology: String(result.methodology || '').trim(),
    contributions: Array.isArray(result.contributions) ? result.contributions.map(String) : []
  };
}

export async function suggestHypotheses(problemDescription, primaryQuestion) {
  if (IS_MOCK) return MOCK.hypotheses;
  const result = await callGeminiJson(
    `You are a research proposal expert. Generate 2-3 concise, testable hypotheses for the given research problem and question. Return strict JSON: { "hypotheses": ["...", "...", "..."] }`,
    `Research problem: ${problemDescription}\nPrimary question: ${primaryQuestion}`
  );
  return Array.isArray(result.hypotheses) ? result.hypotheses : [];
}

export async function refineTitleAndIntro(roughIdea) {
  if (IS_MOCK) return MOCK.titleAndIntro;
  const parsed = await callGeminiJson(TITLE_INTRO_SYSTEM_PROMPT, `Rough idea: ${roughIdea}`);
  return {
    research_title: String(parsed.research_title || '').trim(),
    introduction: String(parsed.introduction || '').trim()
  };
}

export async function refineProblemStatement(roughIdea) {
  if (IS_MOCK) return MOCK.problemStatement;
  return callGemini(PROBLEM_SYSTEM_PROMPT, `Rough idea: ${roughIdea}`);
}

export async function reviewProposal(proposalOutput) {
  if (IS_MOCK) return MOCK.review;
  const summary = Object.entries(proposalOutput)
    .filter(([, v]) => v && typeof v === 'string' && v.trim())
    .map(([k, v]) => `[${k}]\n${v}`)
    .join('\n\n');
  if (!summary.trim()) {
    return {
      overallScore: 0,
      dimensions: { completeness: 0, methodology: 0, novelty: 0, references: 0, writingQuality: 0, consistency: 0 },
      issues: [{ field: 'general', severity: 'high', message: 'Proposal is empty. Please fill in the sections first.' }]
    };
  }
  return callGeminiJson(REVIEW_SYSTEM_PROMPT, `Proposal content:\n\n${summary}`);
}

const CONSOLIDATION_SYSTEM_PROMPT = `You are a final consolidation agent. You have received a research proposal and review reports from multiple specialized agents. Your task is to synthesize all findings into the five most impactful improvements the author should make.

Steps:
1. Collect all issues, weaknesses, and recommendations from every review report
2. Remove duplicates — if multiple agents flag the same problem, it counts as one item and should list all sources
3. Rank remaining issues by their impact on proposal quality (blocking issues first)
4. Output exactly 5 top improvements, ranked 1 (most critical) to 5

Each improvement must be:
- Specific and actionable (not generic advice)
- Tied to actual content in the proposal
- Accompanied by source agents that raised it

Return strict JSON:
{
  "top_improvements": [
    {
      "rank": 1,
      "title": "Short action title (4–7 words)",
      "description": "Specific actionable fix in 2–3 sentences referencing proposal content.",
      "source_agents": ["Agent 1: Completeness", "Agent 3: Methodology"],
      "priority": "critical|high|medium"
    },
    ... exactly 5 items ...
  ],
  "summary": "1–2 sentence overall assessment of proposal readiness."
}

priority: "critical" = must fix before submission, "high" = strongly recommended, "medium" = would improve quality.
Return only the JSON object.`;

export async function consolidateReviews(proposalOutput, reviews) {
  if (IS_MOCK) return MOCK.consolidation;
  const proposalSummary = Object.entries(proposalOutput || {})
    .filter(([, v]) => v && typeof v === 'string' && v.trim())
    .map(([k, v]) => `[${k}]\n${v}`)
    .join('\n\n');
  const reviewSummary = Object.entries(reviews || {})
    .filter(([, v]) => v)
    .map(([name, result]) => `=== ${name} ===\n${JSON.stringify(result)}`)
    .join('\n\n');
  if (!proposalSummary.trim() && !reviewSummary.trim()) return MOCK.consolidation;
  return callGeminiJson(
    CONSOLIDATION_SYSTEM_PROMPT,
    `PROPOSAL:\n${proposalSummary}\n\nREVIEW REPORTS:\n${reviewSummary}`
  );
}

const CS_ACADEMIC_REVIEW_SYSTEM_PROMPT = `You are a Computer Science faculty member conducting a thorough academic review of a research proposal.

Evaluate the proposal on exactly these six dimensions (scored out of 10):

1. Technical Clarity — Are algorithms, models, and system components clearly explained? Are technical terms used correctly?
2. Research Gap — Is the gap in existing CS knowledge clearly identified? Is the novelty convincingly presented relative to prior art?
3. Methodology — Are datasets, tools, baselines, and evaluation metrics adequately described? Can the experiments be reproduced?
4. Experimental Design — Is the experimental setup rigorous with proper controls, splits, and statistical validity?
5. Academic Writing — Grammar, clarity, tone, redundancy, and logical organization.
6. Technical Merit — Technical accuracy, feasibility, evaluation rigor, threats to validity, and expected contributions to the field.

Compute an overall CS review score out of 100 (weighted average of dimension scores).

Provide 3–6 major recommendations: specific, prioritized, actionable improvements the author must address before submission.

Return strict JSON:
{
  "overall_score": <integer 0-100>,
  "dimensions": [
    { "name": "Technical Clarity",   "score": <0-10>, "max": 10, "notes": "1-2 sentences" },
    { "name": "Research Gap",        "score": <0-10>, "max": 10, "notes": "1-2 sentences" },
    { "name": "Methodology",         "score": <0-10>, "max": 10, "notes": "1-2 sentences" },
    { "name": "Experimental Design", "score": <0-10>, "max": 10, "notes": "1-2 sentences" },
    { "name": "Academic Writing",    "score": <0-10>, "max": 10, "notes": "1-2 sentences" },
    { "name": "Technical Merit",     "score": <0-10>, "max": 10, "notes": "1-2 sentences" }
  ],
  "major_recommendations": [
    "Specific recommendation 1",
    "..."
  ]
}

Be rigorous. Reference specific content from the proposal. Return only the JSON object.`;

export async function reviewCsAcademic(proposalOutput) {
  if (IS_MOCK) return MOCK.csReview;
  const summary = Object.entries(proposalOutput || {})
    .filter(([, v]) => v && typeof v === 'string' && v.trim())
    .map(([k, v]) => `[${k}]\n${v}`)
    .join('\n\n');
  if (!summary.trim()) return MOCK.csReview;
  return callGeminiJson(CS_ACADEMIC_REVIEW_SYSTEM_PROMPT, `Proposal content:\n\n${summary}`);
}

const CONSISTENCY_AGENT_SYSTEM_PROMPT = `You are a consistency reviewer for research proposals. Your job is to detect cross-section alignment issues that could undermine the proposal's credibility.

Examine these critical cross-section pairs:
1. Research Questions / Hypotheses ↔ Evaluation Metrics — do the metrics actually measure what the questions ask?
2. Methodology ↔ Timeline — is the timeline realistic given the methodology scope?
3. Title ↔ Problem Statement ↔ Contributions — do they all describe the same research focus?
4. Objectives ↔ Research Questions — are they aligned and non-contradictory?
5. Budget ↔ Methodology — does the budget support the proposed work?
6. Contributions ↔ Research Questions — does each contribution address a stated question?

For each inconsistency found:
- section_a / value_a: first section and the specific claim
- section_b / value_b: second section and the conflicting claim
- description: 1–2 sentences explaining why this is an inconsistency and what it means for the proposal
- severity: "high" (blocks the proposal), "medium" (needs addressing), "low" (minor)

Return strict JSON:
{
  "inconsistencies": [
    {
      "section_a": "...",
      "value_a": "brief excerpt of the specific claim",
      "section_b": "...",
      "value_b": "brief excerpt of the conflicting claim",
      "description": "...",
      "severity": "high|medium|low"
    }
  ],
  "consistent_pairs": ["Section A ↔ Section B"],
  "overall": "Inconsistencies Found|Mostly Consistent|Fully Consistent"
}

Be specific — reference the actual text. If no inconsistencies exist, return an empty array and "Fully Consistent".
Return only the JSON object.`;

export async function reviewConsistency(proposalOutput) {
  if (IS_MOCK) return MOCK.consistency;
  const summary = Object.entries(proposalOutput || {})
    .filter(([, v]) => v && typeof v === 'string' && v.trim())
    .map(([k, v]) => `[${k}]\n${v}`)
    .join('\n\n');
  if (!summary.trim()) return MOCK.consistency;
  return callGeminiJson(CONSISTENCY_AGENT_SYSTEM_PROMPT, `Proposal content:\n\n${summary}`);
}

const METHODOLOGY_AGENT_SYSTEM_PROMPT = `You are a critical methodology reviewer for research proposals. Apply PhD-level rigor.

Evaluate these five criteria:
1. Dataset — Is the dataset clearly described with source, size, split strategy, and preprocessing?
2. Experimental Design — Is the setup rigorous with proper controls, splits, and independent runs?
3. Evaluation Metrics — Are specific, quantitative success metrics defined?
4. Baseline Comparisons — Are appropriate baseline methods identified for comparison?
5. Reproducibility — Is there sufficient detail for independent replication?

For each criterion return:
- status: "pass" if adequately addressed, "warn" if present but insufficient, "fail" if missing or critically inadequate
- weakness: specific weakness found (empty string for pass)
- recommendation: concrete, actionable steps to address it — use bullet points (- item) where helpful (empty string for pass)

Return strict JSON:
{
  "checks": [
    { "name": "Dataset",              "status": "pass|warn|fail", "weakness": "...", "recommendation": "..." },
    { "name": "Experimental Design",  "status": "pass|warn|fail", "weakness": "...", "recommendation": "..." },
    { "name": "Evaluation Metrics",   "status": "pass|warn|fail", "weakness": "...", "recommendation": "..." },
    { "name": "Baseline Comparisons", "status": "pass|warn|fail", "weakness": "...", "recommendation": "..." },
    { "name": "Reproducibility",      "status": "pass|warn|fail", "weakness": "...", "recommendation": "..." }
  ],
  "critical_issues": <count of fail>,
  "overall": "Pass|Minor Revisions|Major Revisions Required"
}

Be highly critical. A methodology must be specific enough for independent replication.
Return only the JSON object.`;

export async function reviewMethodology(proposalOutput) {
  if (IS_MOCK) return MOCK.methodology;
  const summary = Object.entries(proposalOutput || {})
    .filter(([, v]) => v && typeof v === 'string' && v.trim())
    .map(([k, v]) => `[${k}]\n${v}`)
    .join('\n\n');
  if (!summary.trim()) return MOCK.methodology;
  return callGeminiJson(METHODOLOGY_AGENT_SYSTEM_PROMPT, `Proposal content:\n\n${summary}`);
}

const QUALITY_AGENT_SYSTEM_PROMPT = `You are a PhD committee member conducting a rigorous review of a research proposal.

Evaluate the proposal on exactly these four dimensions:
1. Novelty — Is this work genuinely new? How clearly does it differentiate itself from prior art, especially recent work?
2. Research Gap — Is there a precise, well-justified gap in existing knowledge? Is it backed by references?
3. Contribution — Are the specific contributions clearly stated, non-trivial, and achievable within scope?
4. Scientific Merit — Is the methodology sound, reproducible, and capable of producing verifiable results?

For each dimension provide:
- A specific issue drawn from the actual proposal text (1–2 sentences)
- A concrete, actionable suggestion to address it (1–2 sentences)

Return strict JSON in exactly this shape:
{
  "dimensions": [
    {
      "name": "Novelty",
      "rating": "weak|adequate|strong|excellent",
      "issue": "...",
      "suggestion": "..."
    },
    {
      "name": "Research Gap",
      "rating": "weak|adequate|strong|excellent",
      "issue": "...",
      "suggestion": "..."
    },
    {
      "name": "Contribution",
      "rating": "weak|adequate|strong|excellent",
      "issue": "...",
      "suggestion": "..."
    },
    {
      "name": "Scientific Merit",
      "rating": "weak|adequate|strong|excellent",
      "issue": "...",
      "suggestion": "..."
    }
  ],
  "overall_verdict": "Weak|Needs Revision|Acceptable|Strong"
}

Be specific and reference the actual content of the proposal. Return only the JSON object.`;

export async function reviewResearchQuality(proposalOutput) {
  if (IS_MOCK) return MOCK.quality;
  const summary = Object.entries(proposalOutput || {})
    .filter(([, v]) => v && typeof v === 'string' && v.trim())
    .map(([k, v]) => `[${k}]\n${v}`)
    .join('\n\n');
  if (!summary.trim()) return MOCK.quality;
  return callGeminiJson(QUALITY_AGENT_SYSTEM_PROMPT, `Proposal content:\n\n${summary}`);
}

const COMPLETENESS_AGENT_SYSTEM_PROMPT = `Act as a university research proposal reviewer. Analyze the provided proposal content and evaluate these 8 sections:
1. Problem Statement — is there a clear, specific problem being addressed?
2. Literature Review — are relevant prior works cited and discussed?
3. Methodology — is there a clear research approach with methods described?
4. Research Questions — are there specific, measurable research questions or hypotheses?
5. Timeline — is there a project timeline with phases or milestones?
6. References — are there properly formatted citations?
7. Research Gap — is the gap in existing knowledge explicitly stated?
8. Evaluation Metrics — are there quantitative metrics for measuring success?

Identify: 1. Missing sections 2. Weak sections 3. Missing details

Return strict JSON in exactly this shape:
{
  "sections": [
    { "name": "Problem Statement",  "present": true,  "quality": "strong"   },
    { "name": "Literature Review",  "present": true,  "quality": "adequate" },
    { "name": "Methodology",        "present": true,  "quality": "adequate" },
    { "name": "Research Questions", "present": true,  "quality": "strong"   },
    { "name": "Timeline",           "present": true,  "quality": "strong"   },
    { "name": "References",         "present": true,  "quality": "adequate" },
    { "name": "Research Gap",       "present": false, "quality": "missing"  },
    { "name": "Evaluation Metrics", "present": false, "quality": "missing"  }
  ],
  "missing": ["section names that are absent"],
  "weak": ["description of each weak section"],
  "details_missing": ["specific missing detail"]
}

quality values: "strong" = well-developed, "adequate" = present but improvable, "weak" = present but insufficient, "missing" = not found.
Do not mark a section present unless the proposal meaningfully addresses that topic.
Return only the JSON object.`;

export async function reviewCompleteness(proposalOutput) {
  if (IS_MOCK) return MOCK.completeness;
  const summary = Object.entries(proposalOutput || {})
    .filter(([, v]) => v && typeof v === 'string' && v.trim())
    .map(([k, v]) => `[${k}]\n${v}`)
    .join('\n\n');
  if (!summary.trim()) return MOCK.completeness;
  return callGeminiJson(COMPLETENESS_AGENT_SYSTEM_PROMPT, `Proposal content:\n\n${summary}`);
}

export async function autoFixField(field, content, issue) {
  if (IS_MOCK) return content + '\n\n[AI revised: ' + issue + ']';
  const parsed = await callGeminiJson(
    AUTO_FIX_SYSTEM_PROMPT,
    `Field: ${field}\nCurrent content:\n${content}\n\nIssue to fix: ${issue}`
  );
  return String(parsed.improved || content).trim();
}

const CORRECTION_SYSTEM_PROMPT = `You are a research proposal editor. You receive a research proposal and a structured review report from ONE specific review agent. Your task is to revise ONLY the proposal fields that the review report explicitly identifies as problematic.

Rules:
- Read the review report carefully. Identify which sections it criticises or flags.
- Only revise fields directly addressed by that agent's findings. Do NOT touch fields the agent did not mention.
- Each revised field must be a complete, self-contained replacement — not a partial edit.
- Incorporate the agent's specific suggestions, recommendations, and required additions.
- Academic tone, clear and concise.
- Valid field names: research_title, objective, problem_statement, hypothesis, motivation, methodology_text, tools, contributions, timeline, risks, references

Return strict JSON:
{
  "corrections": {
    "<field_name>": "<full revised text>"
  },
  "explanation": "<1-2 sentences summarising which agent's issues were addressed and what changed>"
}`;

const MOCK_CORRECTIONS_BY_AGENT = {
  'Agent 1: Completeness':    MOCK.correctionsCompleteness,
  'Agent 2: Research Quality': MOCK.correctionsQuality,
  'Agent 3: Methodology':     MOCK.correctionsMethodology,
  'Agent 4: Consistency':     MOCK.correctionsConsistency,
  'Agent 5: CS Academic':     MOCK.correctionsCs,
  'Final Consolidation':      MOCK.correctionsConsolidation,
};

export async function correctFromReview(proposalOutput, agentName, feedback) {
  if (IS_MOCK) return MOCK_CORRECTIONS_BY_AGENT[agentName] ?? MOCK.correctionsConsolidation;
  const summary = Object.entries(proposalOutput || {})
    .filter(([, v]) => v && typeof v === 'string' && v.trim())
    .map(([k, v]) => `[${k}]\n${v}`)
    .join('\n\n');
  if (!summary.trim()) return MOCK.corrections;
  const feedbackText = JSON.stringify(feedback, null, 2);
  return callGeminiJson(
    CORRECTION_SYSTEM_PROMPT,
    `Review agent: ${agentName}\n\nReview feedback:\n${feedbackText}\n\nCurrent proposal:\n${summary}`
  );
}

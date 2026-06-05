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
  methodology: 'This study adopts an experimental research design combining dataset construction, model fine-tuning, and controlled simulation testing. A corpus of annotated network operation transcripts will be constructed from open NOC logs and synthetic examples. A transformer-based agent will be fine-tuned and evaluated against baseline models using intent accuracy, execution correctness, and latency metrics. Experiments will be conducted in a simulated network environment using GNS3 with representative enterprise topologies.',
  timelineActivities: [
    { name: 'Literature Review & Dataset Collection', months: 'Week 1' },
    { name: 'Model Design & Fine-Tuning', months: 'Week 2' },
    { name: 'Simulation Setup & Experiments', months: 'Week 3' },
    { name: 'Evaluation, Writing & Revision', months: 'Week 4' }
  ],
  reference: 'Y. Yu, X. Li, X. Leng, et al., "Fault Management in Software-Defined Networking: A Survey," IEEE Communications Surveys & Tutorials, vol. 21, no. 1, pp. 349-392, 2019.',
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

function formatCrossRefCitation(work) {
  const authors = (work.author || []).map((a) =>
    `${a.given ? a.given.charAt(0) + '. ' : ''}${a.family || ''}`.trim()
  ).filter(Boolean);

  const authorStr = authors.length > 3
    ? `${authors.slice(0, 3).join(', ')}, et al.`
    : authors.join(', ');

  const title = work.title?.[0] || '';
  const journal = work['container-title']?.[0] || work.publisher || '';
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
  if (IS_MOCK) return MOCK.methodology;
  return callGemini(
    `You are a research proposal expert. Write a clear, structured methodology section (4-6 sentences) for a research proposal. Cover the approach, data collection, tools used, and how the experiment is designed. Professional academic tone. Return only the methodology text, nothing else.`,
    `Research type: ${researchType}\nData source: ${dataSource}\nTools: ${tools.join(', ')}\nExperiment description: ${experimentDescription}`
  );
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

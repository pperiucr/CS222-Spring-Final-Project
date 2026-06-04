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
  return callGemini(
    `You are a research proposal expert. Enhance the given research problem description to be clear, specific, and academically rigorous. Keep it 3-5 sentences. Return only the enhanced text, nothing else.`,
    `Research problem: ${problemDescription}`
  );
}

export async function generateMotivation(problemDescription) {
  return callGemini(
    `You are a research proposal expert. Write a compelling motivation paragraph (4-6 sentences) for the given research problem. Explain why this problem matters, its real-world impact, and why it needs to be solved now. Return only the motivation paragraph, nothing else.`,
    `Research problem: ${problemDescription}`
  );
}

export async function suggestResearchQuestion(problemDescription) {
  return callGemini(
    `You are a research proposal expert. Generate one clear, focused primary research question for the given research problem. It should be specific, measurable, and answerable through research. Return only the question, nothing else.`,
    `Research problem: ${problemDescription}`
  );
}

export async function fetchDoiReference(doi) {
  return callGemini(
    `You are a citation formatter. Given a DOI, return only the full formatted academic citation in IEEE style. Include authors, title, journal/conference, volume, pages, and year. Return only the citation text, nothing else.`,
    `DOI: ${doi}`
  );
}

export async function generateReferences(citationStyle, references) {
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
  return callGemini(
    `You are a research proposal expert. Rewrite the given risk description to be clear, specific, and professionally framed for a research proposal. 2-3 sentences max. Return only the rewritten description, nothing else.`,
    `Risk category: ${category}\nRisk description: ${description}`
  );
}

export async function suggestMitigation(category, description, likelihood, impact) {
  return callGemini(
    `You are a research proposal expert. Suggest a concrete, actionable mitigation strategy for the given research risk. 2-4 sentences. Return only the mitigation text, nothing else.`,
    `Risk category: ${category}\nRisk: ${description}\nLikelihood: ${likelihood}\nImpact: ${impact}`
  );
}

export async function generateTimeline(durationMonths, activities) {
  const activityList = activities.map((a) => `- ${a.name}: ${a.months}`).join('\n');
  const result = await callGeminiJson(
    `You are a research proposal expert. Given a research duration and a list of activities, generate a realistic, well-paced timeline. Return strict JSON:
{
  "activities": [
    { "name": "activity name", "months": "Month X-Y" }
  ]
}
Distribute all activities across the full duration. Keep existing activity names. Return only the JSON.`,
    `Total duration: ${durationMonths} months\nActivities:\n${activityList}`
  );
  return Array.isArray(result.activities) ? result.activities : activities;
}

export async function generateMethodology(researchType, dataSource, tools, experimentDescription) {
  return callGemini(
    `You are a research proposal expert. Write a clear, structured methodology section (4-6 sentences) for a research proposal. Cover the approach, data collection, tools used, and how the experiment is designed. Professional academic tone. Return only the methodology text, nothing else.`,
    `Research type: ${researchType}\nData source: ${dataSource}\nTools: ${tools.join(', ')}\nExperiment description: ${experimentDescription}`
  );
}

export async function suggestHypotheses(problemDescription, primaryQuestion) {
  const result = await callGeminiJson(
    `You are a research proposal expert. Generate 2-3 concise, testable hypotheses for the given research problem and question. Return strict JSON: { "hypotheses": ["...", "...", "..."] }`,
    `Research problem: ${problemDescription}\nPrimary question: ${primaryQuestion}`
  );
  return Array.isArray(result.hypotheses) ? result.hypotheses : [];
}

export async function refineTitleAndIntro(roughIdea) {
  const parsed = await callGeminiJson(TITLE_INTRO_SYSTEM_PROMPT, `Rough idea: ${roughIdea}`);
  return {
    research_title: String(parsed.research_title || '').trim(),
    introduction: String(parsed.introduction || '').trim()
  };
}

export async function refineProblemStatement(roughIdea) {
  return callGemini(PROBLEM_SYSTEM_PROMPT, `Rough idea: ${roughIdea}`);
}

const SYSTEM_PROMPT = `You are a research proposal writing expert. Take a rough, informal research idea and rewrite it as a crisp, sharp, professional problem statement.

The problem statement must be:
- 2-4 sentences, clear and concise
- Specific about the research gap or need being addressed
- Professional and academic in tone
- Free of vague or informal language

Return only the problem statement text, nothing else.`;

export async function refineProblemStatement(roughIdea) {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = (process.env.LLM_API_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
  const model = process.env.LLM_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    throw new Error('LLM_API_KEY is not configured.');
  }

  const endpoint = `${baseUrl}/models/${encodeURIComponent(model)}:generateContent`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: `Rough idea: ${roughIdea}` }] }],
      generationConfig: { temperature: 0.2 }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || `Gemini API returned ${response.status}`);
  }

  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('\n');

  if (!text) {
    throw new Error('Gemini returned no text content.');
  }

  return text.trim();
}

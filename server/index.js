import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { proposalLatexToPdf } from './pdfExport.js';
import { answerAgentQuestion, generateProposal, startAgentSession, buildLatexFromOutput } from './proposalGenerator.js';
import { refineProblemStatement, refineTitleAndIntro, enhanceProblemStatement, generateMotivation, suggestResearchQuestion, suggestHypotheses, generateMethodology, generateTimeline, structureRisk, suggestMitigation, generateReferences, validateCitations, fetchDoiReference } from './claudeRefine.js';

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    mode: process.env.LLM_API_KEY ? 'api-ready' : 'local-fallback'
  });
});

app.post('/api/agent/start', async (request, response) => {
  try {
    const payload = request.body || {};

    if (!String(payload.topic || '').trim()) {
      response.status(400).json({ error: 'Topic is required.' });
      return;
    }

    response.json(await startAgentSession(payload));
  } catch (error) {
    response.status(500).json({
      error: 'Agent start failed.',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/api/agent/answer', async (request, response) => {
  try {
    const payload = request.body || {};

    if (!String(payload.answer || '').trim()) {
      response.status(400).json({ error: 'Answer is required.' });
      return;
    }

    response.json(await answerAgentQuestion(payload));
  } catch (error) {
    response.status(500).json({
      error: 'Answer integration failed.',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/api/proposal', async (request, response) => {
  try {
    const payload = request.body || {};

    if (!String(payload.topic || '').trim()) {
      response.status(400).json({ error: 'Topic is required.' });
      return;
    }

    const result = await generateProposal(payload);
    response.json(result);
  } catch (error) {
    response.status(500).json({
      error: 'Proposal generation failed.',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/api/refine/title-intro', async (request, response) => {
  try {
    const roughIdea = String(request.body?.roughIdea || '').trim();
    if (!roughIdea) { response.status(400).json({ error: 'roughIdea is required.' }); return; }
    const result = await refineTitleAndIntro(roughIdea);
    response.json(result);
  } catch (error) {
    response.status(500).json({ error: 'Title/intro generation failed.', detail: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/research/enhance-problem', async (request, response) => {
  try {
    const text = String(request.body?.problemDescription || '').trim();
    if (!text) { response.status(400).json({ error: 'problemDescription is required.' }); return; }
    response.json({ problemDescription: await enhanceProblemStatement(text) });
  } catch (error) {
    response.status(500).json({ error: 'Enhance failed.', detail: error.message });
  }
});

app.post('/api/research/motivation', async (request, response) => {
  try {
    const text = String(request.body?.problemDescription || '').trim();
    if (!text) { response.status(400).json({ error: 'problemDescription is required.' }); return; }
    response.json({ motivation: await generateMotivation(text) });
  } catch (error) {
    response.status(500).json({ error: 'Motivation generation failed.', detail: error.message });
  }
});

app.post('/api/research/suggest-question', async (request, response) => {
  try {
    const text = String(request.body?.problemDescription || '').trim();
    if (!text) { response.status(400).json({ error: 'problemDescription is required.' }); return; }
    response.json({ primaryQuestion: await suggestResearchQuestion(text) });
  } catch (error) {
    response.status(500).json({ error: 'Question suggestion failed.', detail: error.message });
  }
});

app.post('/api/research/suggest-hypotheses', async (request, response) => {
  try {
    const problem = String(request.body?.problemDescription || '').trim();
    const question = String(request.body?.primaryQuestion || '').trim();
    if (!problem) { response.status(400).json({ error: 'problemDescription is required.' }); return; }
    response.json({ hypotheses: await suggestHypotheses(problem, question) });
  } catch (error) {
    response.status(500).json({ error: 'Hypotheses suggestion failed.', detail: error.message });
  }
});

app.post('/api/research/fetch-doi', async (request, response) => {
  try {
    const doi = String(request.body?.doi || '').trim();
    if (!doi) { response.status(400).json({ error: 'doi is required.' }); return; }
    response.json({ reference: await fetchDoiReference(doi) });
  } catch (error) {
    response.status(500).json({ error: 'DOI fetch failed.', detail: error.message });
  }
});

app.post('/api/research/generate-references', async (request, response) => {
  try {
    const { citationStyle = 'APA', references = [] } = request.body || {};
    const filled = references.filter((r) => r.doi?.trim() || r.bibtex?.trim());
    if (!filled.length) { response.status(400).json({ error: 'At least one DOI or BibTeX entry is required.' }); return; }
    response.json({ formatted: await generateReferences(citationStyle, filled) });
  } catch (error) {
    response.status(500).json({ error: 'Reference generation failed.', detail: error.message });
  }
});

app.post('/api/research/validate-citations', async (request, response) => {
  try {
    const { citationStyle = 'APA', references = [] } = request.body || {};
    if (!references.length) { response.status(400).json({ error: 'At least one reference is required.' }); return; }
    response.json({ report: await validateCitations(citationStyle, references) });
  } catch (error) {
    response.status(500).json({ error: 'Validation failed.', detail: error.message });
  }
});

app.post('/api/research/structure-risk', async (request, response) => {
  try {
    const { category = '', description = '' } = request.body || {};
    if (!description.trim()) { response.status(400).json({ error: 'description is required.' }); return; }
    response.json({ description: await structureRisk(category, description) });
  } catch (error) {
    response.status(500).json({ error: 'Risk structuring failed.', detail: error.message });
  }
});

app.post('/api/research/suggest-mitigation', async (request, response) => {
  try {
    const { category = '', description = '', likelihood = '', impact = '' } = request.body || {};
    if (!description.trim()) { response.status(400).json({ error: 'description is required.' }); return; }
    response.json({ mitigation: await suggestMitigation(category, description, likelihood, impact) });
  } catch (error) {
    response.status(500).json({ error: 'Mitigation suggestion failed.', detail: error.message });
  }
});

app.post('/api/research/generate-timeline', async (request, response) => {
  try {
    const { durationMonths = 24, activities = [] } = request.body || {};
    const result = await generateTimeline(Number(durationMonths), activities);
    response.json({ activities: result });
  } catch (error) {
    response.status(500).json({ error: 'Timeline generation failed.', detail: error.message });
  }
});

app.post('/api/research/generate-methodology', async (request, response) => {
  try {
    const { researchType = '', dataSource = '', tools = [], experimentDescription = '' } = request.body || {};
    if (!experimentDescription.trim() && !researchType.trim()) {
      response.status(400).json({ error: 'At least experimentDescription or researchType is required.' });
      return;
    }
    const methodology = await generateMethodology(researchType, dataSource, Array.isArray(tools) ? tools : [], experimentDescription);
    response.json({ methodology });
  } catch (error) {
    response.status(500).json({ error: 'Methodology generation failed.', detail: error.message });
  }
});

app.post('/api/refine/problem', async (request, response) => {
  try {
    const roughIdea = String(request.body?.roughIdea || '').trim();

    if (!roughIdea) {
      response.status(400).json({ error: 'roughIdea is required.' });
      return;
    }

    const problemStatement = await refineProblemStatement(roughIdea);
    response.json({ problemStatement });
  } catch (error) {
    response.status(500).json({
      error: 'Problem statement refinement failed.',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/api/generate-from-output', async (request, response) => {
  try {
    const output = request.body || {};
    const proposalLatex = buildLatexFromOutput(output);
    response.json({ proposalLatex });
  } catch (error) {
    response.status(500).json({ error: 'LaTeX generation failed.', detail: error.message });
  }
});

app.post('/api/export/pdf', async (request, response) => {
  try {
    const payload = request.body || {};
    const latex = String(payload.proposalLatex || '').trim();

    if (!latex) {
      response.status(400).json({ error: 'proposalLatex is required.' });
      return;
    }

    const title = String(payload.title || 'proposal').trim();
    const pdf = await proposalLatexToPdf(latex, title);

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', 'attachment; filename="proposal.pdf"');
    response.send(pdf);
  } catch (error) {
    response.status(500).json({
      error: 'PDF export failed.',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
});

app.listen(port, () => {
  console.log(`Proposal API listening on http://127.0.0.1:${port}`);
});

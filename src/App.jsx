import { useEffect, useMemo, useState } from 'react';
import {
  BotMessageSquare,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ClipboardCheck,
  Lightbulb,
  Download,
  FileText,
  FolderOpen,
  ListChecks,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Wand2,
  X,
  XCircle
} from 'lucide-react';

const DEFAULT_REQUIREMENTS = `Proposal must include:
- Project title
- Abstract
- Motivation and gap
- Project goal
- Method or agent workflow
- Figure or diagram with caption
- Expected results
- Research milestones with timeline estimates
- Evaluation plan
- Risks and mitigation
- Resources or budget
- References, assumptions, or source notes`;

const EMPTY_PROJECT = {
  title: '',
  topic: '',
  problem: '',
  method: '',
  timeline: '',
  evaluation: '',
  resources: '',
  references: '',
  requirements: DEFAULT_REQUIREMENTS
};

const PROJECT_FIELDS = [
  ['problem', 'Problem'],
  ['method', 'Method'],
  ['evaluation', 'Evaluation'],
  ['timeline', 'Timeline'],
  ['resources', 'Resources'],
  ['references', 'Sources']
];

const TABS = [
  ['pdf', FileText, 'PDF'],
  ['latex', FileText, 'LaTeX'],
  ['matrix', ClipboardCheck, 'Matrix'],
  ['evaluation', ListChecks, 'Review']
];

const MEMORY_KEY = 'proposal-agent-final-project-memory-v1';

function methOverallKey(verdict) {
  return (verdict || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '');
}

function consistencyOverallKey(verdict) {
  return (verdict || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '');
}

const PROPOSAL_FIELD_LABELS = {
  research_title: 'Research Title',
  objective: 'Objective',
  problem_statement: 'Problem Statement',
  hypothesis: 'Hypothesis',
  motivation: 'Motivation',
  methodology_text: 'Methodology',
  tools: 'Tools',
  contributions: 'Expected Contributions',
  timeline: 'Timeline',
  risks: 'Risks & Mitigation',
  references: 'References',
};

function scoreColor(score) {
  if (score >= 85) return '#22c55e';
  if (score >= 65) return '#f59e0b';
  return '#ef4444';
}

function computeReviewScores(proposalOutput) {
  const po = proposalOutput || {};
  const get = (k) => (po[k] || '').trim();

  const fieldWeights = [
    ['research_title', 10], ['objective', 8], ['problem_statement', 12],
    ['hypothesis', 8], ['motivation', 8], ['methodology_text', 15],
    ['tools', 5], ['contributions', 8], ['timeline_budget', 8],
    ['risks_mitigation', 8], ['references', 10]
  ];

  // COMPLETENESS — weighted by field importance
  let completenessRaw = 0;
  for (const [f, w] of fieldWeights) {
    const len = get(f).length;
    if (len >= 50) completenessRaw += w;
    else if (len >= 10) completenessRaw += w * 0.4;
  }
  const completeness = Math.round(completenessRaw);

  // METHODOLOGY — length + keyword coverage + tools + contributions
  const meth = get('methodology_text');
  const tools = get('tools');
  const contribs = get('contributions');
  const methKws = ['experiment', 'evaluation', 'baseline', 'dataset', 'metric', 'approach', 'design', 'analysis', 'measure', 'compare', 'implement', 'test', 'model'];
  const methKwHits = methKws.filter(k => meth.toLowerCase().includes(k)).length;
  const methodology = Math.round(
    Math.min(meth.length / 500, 1) * 50 +
    Math.min(methKwHits / methKws.length, 1) * 30 +
    (tools.length > 5 ? 10 : 0) +
    (contribs.length > 20 ? 10 : 0)
  );

  // NOVELTY — gap/novelty keywords + hypothesis specificity + distinct contributions
  const noveltyCorpus = [get('problem_statement'), get('contributions'), get('hypothesis'), get('motivation')].join(' ').toLowerCase();
  const noveltyKws = ['novel', 'new', 'propose', 'gap', 'limitation', 'existing', 'challenge', 'address', 'improve', 'advance', 'lack', 'overcome', 'beyond'];
  const noveltyHits = noveltyKws.filter(k => noveltyCorpus.includes(k)).length;
  const contribLines = get('contributions').split('\n').filter(l => l.trim().length > 15);
  const novelty = Math.min(100, Math.round(
    Math.min(noveltyHits / 5, 1) * 50 +
    Math.min(contribLines.length / 3, 1) * 30 +
    (get('hypothesis').length > 30 ? 20 : 0)
  ));

  // REFERENCES — count + years present + DOI/URL present
  const refText = get('references');
  const refLines = refText.split('\n').filter(l => l.trim().length > 15);
  const hasYears = /\b(19|20)\d{2}\b/.test(refText);
  const hasDoi = /doi\.org|10\.\d{4}|https?:\/\//i.test(refText);
  const references = Math.min(100, Math.round(
    Math.min(refLines.length / 6, 1) * 60 +
    (hasYears ? 20 : 0) +
    (hasDoi ? 20 : 0)
  ));

  // WRITING QUALITY — sentence length normality + field coverage
  const allText = fieldWeights.map(([f]) => get(f)).join(' ');
  const words = allText.split(/\s+/).filter(Boolean);
  const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const avgSentLen = sentences.length > 0 ? words.length / sentences.length : 0;
  const filledMeaningfully = fieldWeights.filter(([f]) => get(f).length >= 40).length;
  const sentQuality = avgSentLen >= 8 && avgSentLen <= 35 ? 40 : (avgSentLen > 0 ? 20 : 0);
  const writingQuality = Math.round(sentQuality + (filledMeaningfully / fieldWeights.length) * 60);

  // CONSISTENCY — title keyword overlap with body + hypothesis/problem alignment
  const titleWords = get('research_title').toLowerCase().split(/\W+/).filter(w => w.length > 4);
  const bodyForConsistency = [get('problem_statement'), get('methodology_text'), get('motivation'), get('objective')].join(' ').toLowerCase();
  const titleHitRatio = titleWords.length > 0 ? titleWords.filter(w => bodyForConsistency.includes(w)).length / titleWords.length : 0;
  const hypothesisAligned = get('hypothesis').length > 20 && get('problem_statement').length > 20;
  const consistency = Math.round(
    titleHitRatio * 60 +
    (hypothesisAligned ? 25 : 0) +
    (meth.length > 0 && get('timeline_budget').length > 0 ? 15 : 0)
  );

  // OVERALL — weighted average
  const overall = Math.round(
    completeness * 0.20 +
    methodology * 0.20 +
    novelty * 0.15 +
    references * 0.15 +
    writingQuality * 0.15 +
    consistency * 0.15
  );

  // ISSUES — based on actual content gaps
  const issues = [];
  const emptyFields = fieldWeights.filter(([f]) => get(f).length < 10).map(([f]) => f.replace(/_/g, ' '));
  if (emptyFields.length > 0) {
    issues.push({
      field: emptyFields[0].replace(/ /g, '_'),
      severity: emptyFields.length >= 4 ? 'high' : 'medium',
      message: `${emptyFields.length} section(s) empty: ${emptyFields.slice(0, 3).join(', ')}${emptyFields.length > 3 ? '…' : ''}.`
    });
  }
  if (meth.length > 0 && meth.length < 150) {
    issues.push({ field: 'methodology_text', severity: 'medium', message: 'Methodology is too brief — expand with experimental design, evaluation metrics, and baselines.' });
  } else if (meth.length > 0 && methKwHits < 3) {
    issues.push({ field: 'methodology_text', severity: 'low', message: 'Methodology lacks key terms (evaluation, baselines, metrics). Add more experimental detail.' });
  }
  if (refText.length > 0 && refLines.length < 3) {
    issues.push({ field: 'references', severity: 'medium', message: `Only ${refLines.length} reference(s) found. A strong proposal needs at least 5 citations.` });
  } else if (refText.length > 0 && !hasYears) {
    issues.push({ field: 'references', severity: 'low', message: 'References appear to be missing publication years. Ensure full citation format.' });
  }
  if (contribs.length > 0 && contribLines.length < 2) {
    issues.push({ field: 'contributions', severity: 'low', message: 'List at least 2–3 distinct contributions to strengthen the novelty claim.' });
  }
  if (get('hypothesis').length > 0 && get('hypothesis').length < 60) {
    issues.push({ field: 'hypothesis', severity: 'low', message: 'Hypotheses are too vague. Make them specific and measurable with expected outcomes.' });
  }
  if (titleWords.length > 0 && titleHitRatio < 0.4) {
    issues.push({ field: 'research_title', severity: 'low', message: 'Title keywords do not appear consistently in the proposal body — check for alignment.' });
  }

  const clamp = (v) => Math.min(100, Math.max(0, v));
  return {
    overallScore: clamp(overall),
    dimensions: {
      completeness: clamp(completeness),
      methodology: clamp(methodology),
      novelty: clamp(novelty),
      references: clamp(references),
      writingQuality: clamp(writingQuality),
      consistency: clamp(consistency)
    },
    issues: issues.slice(0, 6)
  };
}

const RESEARCH_AREAS = ['AI/ML', 'Systems', 'Security', 'HCI', 'Networking', 'Databases', 'Theory', 'Bioinformatics', 'Other'];

const EMPTY_PROJECT_DETAILS = {
  rough_idea: '',
  research_title: '',
  introduction: '',
  student_name: 'Prakash Perimbeti',
  university: 'UC Riverside',
  department: 'Computer Science',
  supervisor: 'Prof. Yue Dong',
  degree_program: 'MS',
  research_area: 'AI/ML',
  budget: '$10,000',
  timeline: '6 weeks',
  team_size: '1',
  objectives: ['']
};

function App() {
  const [topicInput, setTopicInput] = useState('');
  const [project, setProject] = useState(EMPTY_PROJECT);
  const [fieldSuggestions, setFieldSuggestions] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [customNote, setCustomNote] = useState('');
  const [result, setResult] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [runLog, setRunLog] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pdf');
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [decisionIndex, setDecisionIndex] = useState(0);
  const [memorySavedAt, setMemorySavedAt] = useState('');
  const [memoryReady, setMemoryReady] = useState(false);
  const [refining, setRefining] = useState(false);
  const [projectDetailsOpen, setProjectDetailsOpen] = useState(false);
  const [projectDetails, setProjectDetails] = useState(EMPTY_PROJECT_DETAILS);
  const [researchProblemOpen, setResearchProblemOpen] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [risksOpen, setRisksOpen] = useState(false);
  const [referencesOpen, setReferencesOpen] = useState(false);

  const EMPTY_RESEARCH_PROBLEM_DATA = { problem_description: '', motivation: '', primary_question: '', hypotheses: [''] };
  const [researchProblemData, setResearchProblemData] = useState(EMPTY_RESEARCH_PROBLEM_DATA);
  const [methodologyData, setMethodologyData] = useState(null);
  const [timelineActivities, setTimelineActivities] = useState(DEFAULT_ACTIVITIES);
  const [risksData, setRisksData] = useState({ savedRisks: [] });
  const [referencesData, setReferencesData] = useState({ savedRefs: [] });
  const [generatePopupOpen, setGeneratePopupOpen] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);
  const [reviewIssuesOpen, setReviewIssuesOpen] = useState(false);
  const [autoFixing, setAutoFixing] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [completenessLoading, setCompletenessLoading] = useState(false);
  const [completenessResult, setCompletenessResult] = useState(null);
  const [completenessError, setCompletenessError] = useState('');
  const [completenessPromptOpen, setCompletenessPromptOpen] = useState(false);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [qualityResult, setQualityResult] = useState(null);
  const [qualityError, setQualityError] = useState('');
  const [qualityPromptOpen, setQualityPromptOpen] = useState(false);
  const [methodologyLoading, setMethodologyLoading] = useState(false);
  const [methodologyResult, setMethodologyResult] = useState(null);
  const [methodologyError, setMethodologyError] = useState('');
  const [methodologyPromptOpen, setMethodologyPromptOpen] = useState(false);
  const [consistencyLoading, setConsistencyLoading] = useState(false);
  const [consistencyResult, setConsistencyResult] = useState(null);
  const [consistencyError, setConsistencyError] = useState('');
  const [consistencyPromptOpen, setConsistencyPromptOpen] = useState(false);
  const [csReviewLoading, setCsReviewLoading] = useState(false);
  const [csReviewResult, setCsReviewResult] = useState(null);
  const [csReviewError, setCsReviewError] = useState('');
  const [csReviewPromptOpen, setCsReviewPromptOpen] = useState(false);
  const [consolidationLoading, setConsolidationLoading] = useState(false);
  const [consolidationResult, setConsolidationResult] = useState(null);
  const [consolidationError, setConsolidationError] = useState('');
  const [consolidationPromptOpen, setConsolidationPromptOpen] = useState(false);
  const [completenessCorrecting, setCompletenessCorrecting] = useState(false);
  const [completenessCorrections, setCompletenessCorrections] = useState(null);
  const [qualityCorrecting, setQualityCorrecting] = useState(false);
  const [qualityCorrections, setQualityCorrections] = useState(null);
  const [methodologyCorrecting, setMethodologyCorrecting] = useState(false);
  const [methodologyCorrections, setMethodologyCorrections] = useState(null);
  const [consistencyCorrecting, setConsistencyCorrecting] = useState(false);
  const [consistencyCorrections, setConsistencyCorrections] = useState(null);
  const [csReviewCorrecting, setCsReviewCorrecting] = useState(false);
  const [csReviewCorrections, setCsReviewCorrections] = useState(null);
  const [consolidationCorrecting, setConsolidationCorrecting] = useState(false);
  const [consolidationCorrections, setConsolidationCorrections] = useState(null);
  const [completenessAccepted, setCompletenessAccepted] = useState(false);
  const [qualityAccepted, setQualityAccepted] = useState(false);
  const [methodologyAccepted, setMethodologyAccepted] = useState(false);
  const [consistencyAccepted, setConsistencyAccepted] = useState(false);
  const [csReviewAccepted, setCsReviewAccepted] = useState(false);
  const [consolidationAccepted, setConsolidationAccepted] = useState(false);
  const [exportLatexLoading, setExportLatexLoading] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState({
    projectDetails: false, researchProblem: false, methodology: false,
    timeline: false, risks: false, references: false
  });

  function markComplete(key) {
    setCompletedSteps((prev) => ({ ...prev, [key]: true }));
  }

  const [proposalOutput, setProposalOutput] = useState({
    research_title: '', objective: '', problem_statement: '', hypothesis: '', motivation: '',
    methodology_text: '', tools: '', contributions: '',
    timeline_budget: '', timeline_structured: null, risks_mitigation: '', references: ''
  });

  function updateOutput(fields) {
    setProposalOutput((prev) => ({ ...prev, ...fields }));
  }

  function handleReviewProposal() {
    setReviewError('');
    setReviewResult(computeReviewScores(proposalOutput));
    setReviewIssuesOpen(false);
  }

  async function handleCorrectFromReview(agentName, reviewResult, setCorrecting, setCorrections, setError) {
    setCorrecting(true);
    setCorrections(null);
    setError('');
    try {
      const data = await postJson('/api/review/correct', { proposalOutput, agentName, feedback: reviewResult });
      setCorrections(data.corrections && Object.keys(data.corrections).length > 0 ? data : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCorrecting(false);
    }
  }

  function acceptCorrections(corrections, setCorrections, setAccepted) {
    if (!corrections?.corrections) return;
    const newOutput = { ...proposalOutput, ...corrections.corrections };
    updateOutput(corrections.corrections);
    setCorrections(null);
    if (setAccepted) setAccepted(true);
    if (reviewResult) setReviewResult(computeReviewScores(newOutput));
  }

  async function handleAutoFix() {
    if (!reviewResult?.issues?.length) return;
    setAutoFixing(true);
    setReviewError('');
    try {
      const { fixes } = await postJson('/api/review/auto-fix', {
        proposalOutput,
        issues: reviewResult.issues.filter((i) => i.field !== 'general')
      });
      if (Object.keys(fixes).length > 0) {
        const newOutput = { ...proposalOutput, ...fixes };
        updateOutput(fixes);
        setReviewResult(computeReviewScores(newOutput));
      }
    } catch (err) {
      setReviewError(err.message || 'Auto-fix failed.');
    } finally {
      setAutoFixing(false);
    }
  }

  async function handleExportLatex() {
    setExportLatexLoading(true);
    try {
      const { proposalLatex } = await postJson('/api/generate-from-output', { ...proposalOutput, projectDetails });
      const blob = new Blob([proposalLatex], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${(proposalOutput.research_title || 'proposal').replace(/\s+/g, '_')}.tex`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      // no-op — user can use the Generate Proposal popup as fallback
    } finally {
      setExportLatexLoading(false);
    }
  }

  async function handleConsolidation() {
    setConsolidationLoading(true);
    setConsolidationError('');
    setConsolidationAccepted(false);
    try {
      const reviews = {};
      if (completenessResult) reviews['Agent 1: Completeness'] = completenessResult;
      if (qualityResult)     reviews['Agent 2: Research Quality'] = qualityResult;
      if (methodologyResult) reviews['Agent 3: Methodology'] = methodologyResult;
      if (consistencyResult) reviews['Agent 4: Consistency'] = consistencyResult;
      if (csReviewResult)    reviews['Agent 5: CS Academic'] = csReviewResult;
      const result = await postJson('/api/review/consolidate', { proposalOutput, reviews });
      setConsolidationResult(result);
    } catch (err) {
      setConsolidationError(err.message || 'Consolidation failed.');
    } finally {
      setConsolidationLoading(false);
    }
  }

  async function handleCsReview() {
    setCsReviewLoading(true);
    setCsReviewError('');
    setCsReviewAccepted(false);
    try {
      const result = await postJson('/api/review/cs-academic', { proposalOutput });
      setCsReviewResult(result);
    } catch (err) {
      setCsReviewError(err.message || 'CS academic review failed.');
    } finally {
      setCsReviewLoading(false);
    }
  }

  async function handleConsistencyReview() {
    setConsistencyLoading(true);
    setConsistencyError('');
    setConsistencyAccepted(false);
    try {
      const result = await postJson('/api/review/consistency', { proposalOutput });
      setConsistencyResult(result);
    } catch (err) {
      setConsistencyError(err.message || 'Consistency review failed.');
    } finally {
      setConsistencyLoading(false);
    }
  }

  async function handleMethodologyReview() {
    setMethodologyLoading(true);
    setMethodologyError('');
    setMethodologyAccepted(false);
    try {
      const result = await postJson('/api/review/methodology', { proposalOutput });
      setMethodologyResult(result);
    } catch (err) {
      setMethodologyError(err.message || 'Methodology review failed.');
    } finally {
      setMethodologyLoading(false);
    }
  }

  async function handleQualityReview() {
    setQualityLoading(true);
    setQualityError('');
    setQualityAccepted(false);
    try {
      const result = await postJson('/api/review/quality', { proposalOutput });
      setQualityResult(result);
    } catch (err) {
      setQualityError(err.message || 'Quality review failed.');
    } finally {
      setQualityLoading(false);
    }
  }

  async function handleCompletenessReview() {
    setCompletenessLoading(true);
    setCompletenessError('');
    setCompletenessAccepted(false);
    try {
      const result = await postJson('/api/review/completeness', { proposalOutput });
      setCompletenessResult(result);
    } catch (err) {
      setCompletenessError(err.message || 'Completeness review failed.');
    } finally {
      setCompletenessLoading(false);
    }
  }

  const matrixStats = useMemo(() => {
    const rows = result?.complianceMatrix || [];
    const covered = rows.filter((row) => /^covered$/i.test(row.status)).length;
    return { covered, total: rows.length };
  }, [result]);

  const acceptedCount = PROJECT_FIELDS.filter(([field]) => Boolean(project[field])).length;
  const acceptedSuggestionCount = fieldSuggestions.filter((suggestion) => project[suggestion.field] === suggestion.value).length;
  const currentSuggestion = fieldSuggestions[suggestionIndex] || null;
  const currentDecision = decisions[decisionIndex] || null;
  const currentQuestion = questions[0];

  useEffect(() => {
    loadSavedMemory({ silent: true });
    setMemoryReady(true);
  }, []);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  useEffect(() => {
    if (!memoryReady) return;
    saveMemory({ silent: true });
  }, [
    memoryReady,
    // Path A
    proposalOutput,
    completedSteps,
    projectDetails,
    researchProblemData,
    methodologyData,
    timelineActivities,
    risksData,
    referencesData,
    // Path B
    topicInput,
    project,
    fieldSuggestions,
    decisions,
    questions,
    result,
    runLog,
    activeTab,
    suggestionIndex,
    decisionIndex
  ]);

  async function startAgent() {
    return startAgentForTopic(topicInput);
  }

  async function startSampleAgent() {
    const sampleTopic = 'Citation-grounded agent for literature review workflows';
    setTopicInput(sampleTopic);
    return startAgentForTopic(sampleTopic);
  }

  async function refineProblem() {
    const trimmed = topicInput.trim();
    if (!trimmed) return;

    setRefining(true);
    setError('');

    try {
      const data = await postJson('/api/refine/problem', { roughIdea: trimmed });
      updateProjectField('problem', data.problemStatement);
      setRunLog((current) => [...current, logEntry('Refine', 'Claude rewrote the rough idea into a problem statement.')]);
    } catch (requestError) {
      setError(readError(requestError));
    } finally {
      setRefining(false);
    }
  }

  async function startAgentForTopic(nextTopic) {
    setStatus('starting');
    setError('');
    clearArtifacts();

    try {
      const data = await postJson('/api/agent/start', {
        topic: nextTopic,
        requirements: DEFAULT_REQUIREMENTS
      });

      const suggestions = data.fieldSuggestions || [];
      const problemSuggestion = suggestions.find((s) => s.field === 'problem');
      const titleSuggestion = suggestions.find((s) => s.field === 'title');

      const generatedTitle = data.project.title || titleSuggestion?.value || '';
      const generatedProblem = data.project.problem || problemSuggestion?.value || '';

      setProject({
        ...EMPTY_PROJECT,
        ...data.project,
        title: generatedTitle,
        problem: generatedProblem
      });

      if (generatedTitle || generatedProblem) {
        setProjectDetails((prev) => ({
          ...prev,
          research_title: generatedTitle || prev.research_title,
          introduction: generatedProblem || prev.introduction
        }));
      }

      setFieldSuggestions(suggestions);
      setDecisions(data.decisions || []);
      setQuestions(data.questions || []);
      setSuggestionIndex(0);
      setDecisionIndex(0);
      setRunLog([
        logEntry('Extract', data.runMessage || 'LLM prepared structured suggestions.'),
        logEntry('Decide', `Review ${suggestions.length} fields and ${(data.decisions || []).length} decision card(s).`)
      ]);
      setCustomNote('');
    } catch (requestError) {
      setError(readError(requestError));
    } finally {
      setStatus('idle');
    }
  }

  async function submitCustomNote() {
    const trimmed = customNote.trim();
    if (!trimmed) return;

    setStatus('answering');
    setError('');

    try {
      const data = await postJson('/api/agent/answer', {
        project,
        question: currentQuestion || {
          field: 'method',
          question: 'Integrate this user note into the project state.',
          reason: 'The user provided a custom refinement.',
          priority: 'Medium'
        },
        answer: trimmed,
        requirements: DEFAULT_REQUIREMENTS
      });

      setProject({ ...EMPTY_PROJECT, ...data.project });
      setFieldSuggestions(data.fieldSuggestions || []);
      setDecisions(data.decisions || []);
      setQuestions(data.questions || []);
      setSuggestionIndex(0);
      setDecisionIndex(0);
      setRunLog((current) => [
        ...current,
        logEntry('Update', data.runMessage || 'Integrated custom note.'),
        logEntry('Decide', `Refreshed ${(data.fieldSuggestions || []).length} suggested field(s).`)
      ]);
      setCustomNote('');
      clearArtifacts();
    } catch (requestError) {
      setError(readError(requestError));
    } finally {
      setStatus('idle');
    }
  }

  async function generateProposal() {
    setStatus('drafting');
    setError('');

    try {
      const data = await postJson('/api/proposal', {
        ...project,
        topic: project.topic || project.title,
        requirements: DEFAULT_REQUIREMENTS
      });
      const nextPdfUrl = await exportPdfUrl(data.proposalLatex, project.title || 'proposal');

      setResult(data);
      updatePdfUrl(nextPdfUrl);
      setActiveTab('pdf');
      setRunLog((current) => [
        ...current,
        logEntry('Draft', `Generated proposal using ${data.mode}.`),
        logEntry('Review', `Coverage ${countCovered(data.complianceMatrix)}/${data.complianceMatrix?.length || 0}.`)
      ]);
    } catch (requestError) {
      setError(readError(requestError));
    } finally {
      setStatus('idle');
    }
  }

  function acceptSuggestion(suggestion) {
    updateProjectField(suggestion.field, suggestion.value);
    advanceSuggestion();
    setRunLog((current) => [...current, logEntry('Accept', `Accepted ${suggestion.label || suggestion.field}.`)]);
  }

  function skipSuggestion() {
    if (!currentSuggestion) return;
    advanceSuggestion();
    setRunLog((current) => [...current, logEntry('Skip', `Skipped ${currentSuggestion.label || currentSuggestion.field}.`)]);
  }

  function advanceSuggestion() {
    setSuggestionIndex((current) => Math.min(current + 1, Math.max(fieldSuggestions.length - 1, 0)));
  }

  function chooseOption(decision, option) {
    updateProjectField(decision.field, option.value);
    setDecisions((current) => {
      const next = current.filter((item) => item.id !== decision.id);
      setDecisionIndex((index) => Math.min(index, Math.max(next.length - 1, 0)));
      return next;
    });
    setRunLog((current) => [...current, logEntry('Decision', `Selected ${option.label} for ${decision.title}.`)]);
  }

  function skipDecision() {
    if (!currentDecision) return;
    advanceDecision();
    setRunLog((current) => [...current, logEntry('Skip', `Skipped ${currentDecision.title}.`)]);
  }

  function advanceDecision() {
    setDecisionIndex((current) => Math.min(current + 1, Math.max(decisions.length - 1, 0)));
  }

  function updateProjectField(field, value) {
    setProject((current) => ({
      ...current,
      [field]: value,
      topic: current.topic || current.title || topicInput
    }));
    clearArtifacts();
  }

  function clearArtifacts() {
    setResult(null);
    updatePdfUrl('');
  }

  function updatePdfUrl(nextUrl) {
    setPdfUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return nextUrl;
    });
  }

  function reset() {
    setTopicInput('');
    setProject(EMPTY_PROJECT);
    setFieldSuggestions([]);
    setDecisions([]);
    setQuestions([]);
    setCustomNote('');
    clearArtifacts();
    setRunLog([]);
    setError('');
    setActiveTab('pdf');
    setSuggestionIndex(0);
    setDecisionIndex(0);
  }

  function downloadLatex() {
    const proposal = result?.proposalLatex || '';
    const blob = new Blob([proposal], { type: 'text/x-tex;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = 'proposal.tex';
    anchor.click();
    URL.revokeObjectURL(href);
  }

  async function downloadPdf() {
    if (!result?.proposalLatex) return;

    setStatus('exporting');
    setError('');

    try {
      const href = pdfUrl || (await exportPdfUrl(result.proposalLatex, project.title || 'proposal'));
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = 'proposal.pdf';
      anchor.click();
      if (!pdfUrl) URL.revokeObjectURL(href);
      setRunLog((current) => [...current, logEntry('Export', 'Downloaded proposal.pdf.')]);
    } catch (requestError) {
      setError(readError(requestError));
    } finally {
      setStatus('idle');
    }
  }

  function saveMemory({ silent = false } = {}) {
    const snapshot = {
      savedAt: new Date().toISOString(),
      // Path A — proposal stepper
      proposalOutput,
      completedSteps,
      projectDetails,
      researchProblemData,
      methodologyData,
      timelineActivities,
      risksData,
      referencesData,
      // Path B — suggestion workflow
      topicInput,
      project,
      fieldSuggestions,
      decisions,
      questions,
      result: compactResult(result),
      runLog,
      activeTab,
      suggestionIndex,
      decisionIndex
    };

    localStorage.setItem(MEMORY_KEY, JSON.stringify(snapshot));
    setMemorySavedAt(snapshot.savedAt);

    if (!silent) {
      setRunLog((current) => [...current, logEntry('Memory', 'Saved workspace.')]);
    }
  }

  async function loadSavedMemory({ silent = false } = {}) {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) {
      if (!silent) setError('No saved memory found.');
      return;
    }

    try {
      const snapshot = JSON.parse(raw);

      // Path A — restore proposal stepper state
      if (snapshot.proposalOutput)     setProposalOutput((prev) => ({ ...prev, ...snapshot.proposalOutput }));
      if (snapshot.completedSteps)     setCompletedSteps((prev) => ({ ...prev, ...snapshot.completedSteps }));
      if (snapshot.projectDetails)     setProjectDetails((prev) => ({ ...prev, ...snapshot.projectDetails }));
      if (snapshot.researchProblemData) setResearchProblemData(snapshot.researchProblemData);
      if (snapshot.methodologyData)    setMethodologyData(snapshot.methodologyData);
      if (snapshot.timelineActivities && Array.isArray(snapshot.timelineActivities)) setTimelineActivities(snapshot.timelineActivities);
      if (snapshot.risksData)          setRisksData(snapshot.risksData);
      if (snapshot.referencesData)     setReferencesData(snapshot.referencesData);

      // Path B — restore suggestion workflow state
      if (snapshot.topicInput !== undefined) setTopicInput(snapshot.topicInput || '');
      setProject({ ...EMPTY_PROJECT, ...(snapshot.project || {}) });
      setFieldSuggestions(Array.isArray(snapshot.fieldSuggestions) ? snapshot.fieldSuggestions : []);
      setDecisions(Array.isArray(snapshot.decisions) ? snapshot.decisions : []);
      setQuestions(Array.isArray(snapshot.questions) ? snapshot.questions : []);
      setResult(snapshot.result || null);
      setRunLog(Array.isArray(snapshot.runLog) ? snapshot.runLog : []);
      setActiveTab(snapshot.activeTab || 'pdf');
      setSuggestionIndex(Number(snapshot.suggestionIndex || 0));
      setDecisionIndex(Number(snapshot.decisionIndex || 0));
      setMemorySavedAt(snapshot.savedAt || '');
      setError('');

      if (snapshot.result?.proposalLatex) {
        try {
          updatePdfUrl(await exportPdfUrl(snapshot.result.proposalLatex, snapshot.project?.title || 'proposal'));
        } catch {
          updatePdfUrl('');
        }
      } else {
        updatePdfUrl('');
      }

      if (!silent) {
        setRunLog((current) => [...current, logEntry('Memory', 'Reloaded saved workspace.')]);
      }
    } catch {
      setError('Saved memory is unreadable. Clear it and save again.');
    }
  }

  function clearSavedMemory() {
    localStorage.removeItem(MEMORY_KEY);
    setMemorySavedAt('');
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <h1>Research Proposal Agent</h1>
        <span className="status-pill">
          <Sparkles size={16} aria-hidden="true" />
          {result?.mode || (fieldSuggestions.length ? 'structuring' : 'ready')}
        </span>
      </header>

      <section className="workspace single-pane">
        <section className="workflow-artifact">

          <ProposalStepper
            completed={completedSteps}
            onOpen={(key) => {
              if (key === 'projectDetails') setProjectDetailsOpen(true);
              if (key === 'researchProblem') setResearchProblemOpen(true);
              if (key === 'methodology') setMethodologyOpen(true);
              if (key === 'timeline') setTimelineOpen(true);
              if (key === 'risks') setRisksOpen(true);
              if (key === 'references') setReferencesOpen(true);
            }}
          />

          {completedSteps.projectDetails && <div className="proposal-title-block">
            {projectDetails.research_title && (
              <h2 className="proposal-title-main">{projectDetails.research_title}</h2>
            )}
            <div className="proposal-title-meta">
              <span><strong>Student:</strong> {projectDetails.student_name || EMPTY_PROJECT_DETAILS.student_name}</span>
              <span><strong>Degree:</strong> {projectDetails.degree_program || EMPTY_PROJECT_DETAILS.degree_program}</span>
              <span><strong>Research Area:</strong> {projectDetails.research_area || EMPTY_PROJECT_DETAILS.research_area}</span>
              <span><strong>Supervisor:</strong> {projectDetails.supervisor || EMPTY_PROJECT_DETAILS.supervisor}</span>
              <span><strong>University:</strong> {projectDetails.university || EMPTY_PROJECT_DETAILS.university}</span>
              <span><strong>Department:</strong> {projectDetails.department || EMPTY_PROJECT_DETAILS.department}</span>
            </div>
          </div>}

          <div className="proposal-output-section">
            <h2 className="proposal-output-heading">Research Proposal Draft</h2>
            <div className="proposal-output-grid">
              {[
                { label: '1a. Research Project Title', key: 'research_title',  full: false },
                { label: '1b. Objective',              key: 'objective',        full: false },
                { label: '2a. Problem Statement',       key: 'problem_statement', full: false },
                { label: '2b. Hypothesis',             key: 'hypothesis',        full: false },
                { label: '2c. Motivation',             key: 'motivation',        full: true  },
                { label: '3a. Methodology',            key: 'methodology_text', full: true  },
                { label: '3b. Data Source',            key: 'data_source',      full: false },
                { label: '3c. Tools',                  key: 'tools',            full: false },
                { label: '3d. Contributions',          key: 'contributions',    full: false },
                { label: '4. Timeline',                key: 'timeline_budget',  full: true  },
                { label: '5. Risks and Mitigation',    key: 'risks_mitigation', full: true  },
                { label: '6. References',              key: 'references',       full: true  },
              ].map(({ label, key, full }) => (
                <label key={key} className={`proposal-output-field${full ? ' full-width' : ''}`}>
                  <span className="proposal-output-label">{label}</span>
                  <textarea
                    value={proposalOutput[key]}
                    onChange={(e) => updateOutput({ [key]: e.target.value })}
                    placeholder={`${label} will appear here after saving the relevant section above...`}
                  />
                </label>
              ))}
            </div>
            <div className="proposal-output-footer">
              <button className="primary" type="button" disabled={status === 'drafting'} onClick={() => setGeneratePopupOpen(true)}>
                {status === 'drafting' ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}
                Generate Proposal
              </button>
            </div>
          </div>

          <div className="memory-bar">
            <div className="memory-bar-info">
              <strong>Workspace Memory</strong>
              <span>{memorySavedAt ? `Last saved ${formatSavedAt(memorySavedAt)}` : 'Not saved yet'}</span>
            </div>
            <div className="memory-actions">
              <button className="secondary" type="button" onClick={() => saveMemory()}>
                Save
              </button>
              <button className="secondary" type="button" onClick={() => loadSavedMemory()}>
                Reload
              </button>
              <button className="secondary" type="button" onClick={clearSavedMemory}>
                Clear
              </button>
            </div>
          </div>

          <div className="review-dashboard-section">
            <div className="review-dashboard-header">
              <h2 className="review-dashboard-heading">Review Dashboard</h2>
              <button className="primary" type="button" onClick={handleReviewProposal}>
                <ClipboardCheck size={16} aria-hidden="true" />
                Review Proposal
              </button>
            </div>

            {reviewError && <p className="error-banner">{reviewError}</p>}

            {reviewResult && (
              <>
                <div className="review-overall">
                  <div className="review-overall-top">
                    <span className="review-overall-label">Overall Score</span>
                    <span className="review-overall-score">{reviewResult.overallScore}<span className="review-overall-max">/100</span></span>
                  </div>
                  <div className="review-score-bar-wrap">
                    <div className="review-score-bar" style={{ width: `${reviewResult.overallScore}%`, background: scoreColor(reviewResult.overallScore) }} />
                  </div>
                </div>

                <div className="review-dimensions">
                  {[
                    ['Completeness',   'completeness'],
                    ['Methodology',    'methodology'],
                    ['Novelty',        'novelty'],
                    ['References',     'references'],
                    ['Writing Quality','writingQuality'],
                    ['Consistency',    'consistency'],
                  ].map(([label, key]) => (
                    <div key={key} className="review-dimension-row">
                      <span className="review-dimension-label">{label}</span>
                      <div className="review-dimension-bar-wrap">
                        <div className="review-dimension-bar" style={{ width: `${reviewResult.dimensions?.[key] ?? 0}%`, background: scoreColor(reviewResult.dimensions?.[key] ?? 0) }} />
                      </div>
                      <span className="review-dimension-pct">{reviewResult.dimensions?.[key] ?? 0}%</span>
                    </div>
                  ))}
                </div>

                <div className="review-actions">
                  <button className="secondary" type="button" onClick={() => setReviewIssuesOpen((v) => !v)}>
                    <ListChecks size={16} aria-hidden="true" />
                    {reviewIssuesOpen ? 'Hide Issues' : 'View Issues'}
                  </button>
                  <button className="primary" type="button" onClick={handleAutoFix} disabled={autoFixing}>
                    {autoFixing ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Wand2 size={16} aria-hidden="true" />}
                    {autoFixing ? 'Fixing…' : 'Auto Fix'}
                  </button>
                </div>

                {reviewIssuesOpen && (
                  <div className="review-issues-list">
                    {(reviewResult.issues || []).length === 0
                      ? <p className="review-no-issues">No issues found — proposal looks great!</p>
                      : (reviewResult.issues || []).map((issue, i) => (
                        <div key={i} className={`review-issue-item review-issue-${issue.severity}`}>
                          <span className={`review-issue-badge review-issue-badge-${issue.severity}`}>{issue.severity}</span>
                          <span className="review-issue-msg">{issue.message}</span>
                        </div>
                      ))
                    }
                  </div>
                )}
              </>
            )}
          </div>

          <div className="agent-section">
            <div className="agent-header">
              <div className="agent-title-group">
                <span className="agent-badge">Agent 1</span>
                <h2 className="agent-heading">Completeness Reviewer</h2>
                {completenessAccepted && <span className="agent-review-complete-badge"><CheckCircle2 size={13} aria-hidden="true" />Review complete</span>}
              </div>
              <button className="primary" type="button" onClick={handleCompletenessReview} disabled={completenessLoading}>
                {completenessLoading ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <ClipboardCheck size={16} aria-hidden="true" />}
                {completenessLoading ? 'Reviewing…' : 'Run Agent'}
              </button>
            </div>

            <button className="agent-prompt-toggle" type="button" onClick={() => setCompletenessPromptOpen((v) => !v)}>
              <ChevronDown size={14} className={completenessPromptOpen ? 'agent-chevron-open' : ''} aria-hidden="true" />
              Prompt
            </button>

            {completenessPromptOpen && (
              <pre className="agent-prompt-box">{`Act as a university proposal reviewer.\n\nIdentify:\n1. Missing sections\n2. Weak sections\n3. Missing details\n\nReturn JSON.`}</pre>
            )}

            {completenessError && <p className="error-banner">{completenessError}</p>}

            {completenessResult && !completenessAccepted && (
              <div className="agent-results-grid">
                <div className="agent-checks-panel">
                  <h3 className="agent-panel-heading">Checks</h3>
                  <ul className="agent-checks-list">
                    {(completenessResult.sections || []).map((s) => (
                      <li key={s.name} className={`agent-check-item ${s.present ? 'agent-check-present' : 'agent-check-missing'}`}>
                        {s.present
                          ? <CheckCircle2 size={15} aria-hidden="true" />
                          : <XCircle size={15} aria-hidden="true" />}
                        <span className="agent-check-name">{s.name}</span>
                        {s.present && s.quality !== 'strong' && (
                          <span className={`agent-quality-tag agent-quality-${s.quality}`}>{s.quality}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="agent-findings-panel">
                  {(completenessResult.missing || []).length > 0 && (
                    <>
                      <h3 className="agent-panel-heading">Missing</h3>
                      <ul className="agent-findings-list">
                        {completenessResult.missing.map((item, i) => (
                          <li key={i} className="agent-finding-missing">— {item}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  {(completenessResult.weak || []).length > 0 && (
                    <>
                      <h3 className="agent-panel-heading" style={{ marginTop: '14px' }}>Weak</h3>
                      <ul className="agent-findings-list">
                        {completenessResult.weak.map((item, i) => (
                          <li key={i} className="agent-finding-weak">— {item}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  {(completenessResult.details_missing || []).length > 0 && (
                    <>
                      <h3 className="agent-panel-heading" style={{ marginTop: '14px' }}>Missing Details</h3>
                      <ul className="agent-findings-list">
                        {completenessResult.details_missing.map((item, i) => (
                          <li key={i} className="agent-finding-detail">— {item}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  {!(completenessResult.missing?.length) && !(completenessResult.weak?.length) && (
                    <p className="agent-all-good">All sections present and strong!</p>
                  )}
                </div>
              </div>
            )}
            <CorrectionPanel
              result={completenessResult}
              correcting={completenessCorrecting}
              corrections={completenessCorrections}
              accepted={completenessAccepted}
              error={completenessError}
              setError={setCompletenessError}
              onCorrect={() => handleCorrectFromReview('Agent 1: Completeness', completenessResult, setCompletenessCorrecting, setCompletenessCorrections, setCompletenessError)}
              onAccept={() => acceptCorrections(completenessCorrections, setCompletenessCorrections, setCompletenessAccepted)}
              onDiscard={() => setCompletenessCorrections(null)}
            />
          </div>

          <div className="agent-section">
            <div className="agent-header">
              <div className="agent-title-group">
                <span className="agent-badge">Agent 2</span>
                <h2 className="agent-heading">Research Quality Reviewer</h2>
                {qualityAccepted && <span className="agent-review-complete-badge"><CheckCircle2 size={13} aria-hidden="true" />Review complete</span>}
              </div>
              <button className="primary" type="button" onClick={handleQualityReview} disabled={qualityLoading}>
                {qualityLoading ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
                {qualityLoading ? 'Reviewing…' : 'Run Agent'}
              </button>
            </div>

            <button className="agent-prompt-toggle" type="button" onClick={() => setQualityPromptOpen((v) => !v)}>
              <ChevronDown size={14} className={qualityPromptOpen ? 'agent-chevron-open' : ''} aria-hidden="true" />
              Prompt
            </button>

            {qualityPromptOpen && (
              <pre className="agent-prompt-box">{`Act as a PhD committee member reviewing a research proposal.\n\nEvaluate:\n1. Novelty\n2. Research Gap\n3. Contribution\n4. Scientific Merit\n\nFor each: identify the issue and provide a concrete suggestion.\n\nReturn JSON.`}</pre>
            )}

            {qualityError && <p className="error-banner">{qualityError}</p>}

            {qualityResult && !qualityAccepted && (
              <>
                {qualityResult.overall_verdict && (
                  <div className="quality-verdict-row">
                    <span className="quality-verdict-label">Verdict</span>
                    <span className={`quality-verdict-badge quality-verdict-${qualityResult.overall_verdict.toLowerCase().replace(/\s+/g, '-')}`}>
                      {qualityResult.overall_verdict}
                    </span>
                  </div>
                )}

                <div className="quality-dimensions">
                  {(qualityResult.dimensions || []).map((dim) => (
                    <div key={dim.name} className="quality-dimension-card">
                      <div className="quality-dim-header">
                        <span className="quality-dim-name">{dim.name}</span>
                        <span className={`quality-rating-badge quality-rating-${dim.rating}`}>{dim.rating}</span>
                      </div>

                      {dim.issue && (
                        <div className="quality-issue-block">
                          <span className="quality-block-label">
                            <AlertTriangle size={13} aria-hidden="true" />
                            Issue
                          </span>
                          <p className="quality-block-text">{dim.issue}</p>
                        </div>
                      )}

                      {dim.suggestion && (
                        <div className="quality-suggestion-block">
                          <span className="quality-block-label">
                            <Lightbulb size={13} aria-hidden="true" />
                            Suggestion
                          </span>
                          <p className="quality-block-text">{dim.suggestion}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            <CorrectionPanel
              result={qualityResult}
              correcting={qualityCorrecting}
              corrections={qualityCorrections}
              accepted={qualityAccepted}
              error={qualityError}
              setError={setQualityError}
              onCorrect={() => handleCorrectFromReview('Agent 2: Research Quality', qualityResult, setQualityCorrecting, setQualityCorrections, setQualityError)}
              onAccept={() => acceptCorrections(qualityCorrections, setQualityCorrections, setQualityAccepted)}
              onDiscard={() => setQualityCorrections(null)}
            />
          </div>

          <div className="agent-section">
            <div className="agent-header">
              <div className="agent-title-group">
                <span className="agent-badge">Agent 3</span>
                <h2 className="agent-heading">Methodology Reviewer</h2>
                <span className="agent-critical-tag">Critical</span>
                {methodologyAccepted && <span className="agent-review-complete-badge"><CheckCircle2 size={13} aria-hidden="true" />Review complete</span>}
              </div>
              <button className="primary" type="button" onClick={handleMethodologyReview} disabled={methodologyLoading}>
                {methodologyLoading ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <ListChecks size={16} aria-hidden="true" />}
                {methodologyLoading ? 'Reviewing…' : 'Run Agent'}
              </button>
            </div>

            <button className="agent-prompt-toggle" type="button" onClick={() => setMethodologyPromptOpen((v) => !v)}>
              <ChevronDown size={14} className={methodologyPromptOpen ? 'agent-chevron-open' : ''} aria-hidden="true" />
              Prompt
            </button>

            {methodologyPromptOpen && (
              <pre className="agent-prompt-box">{`Act as a critical methodology reviewer.\n\nCheck:\n1. Dataset\n2. Experimental Design\n3. Evaluation Metrics\n4. Baseline Comparisons\n5. Reproducibility\n\nFor each weakness provide a concrete recommendation.\n\nReturn JSON.`}</pre>
            )}

            {methodologyError && <p className="error-banner">{methodologyError}</p>}

            {methodologyResult && !methodologyAccepted && (
              <>
                <div className="meth-summary-row">
                  {methodologyResult.critical_issues > 0 && (
                    <span className="meth-critical-count">
                      <AlertTriangle size={14} aria-hidden="true" />
                      {methodologyResult.critical_issues} critical issue{methodologyResult.critical_issues !== 1 ? 's' : ''}
                    </span>
                  )}
                  {methodologyResult.overall && (
                    <span className={`meth-overall-badge meth-overall-${methOverallKey(methodologyResult.overall)}`}>
                      {methodologyResult.overall}
                    </span>
                  )}
                </div>

                <div className="meth-checks">
                  {(methodologyResult.checks || []).map((check) => (
                    <div key={check.name} className={`meth-check-card meth-check-${check.status}`}>
                      <div className="meth-check-header">
                        {check.status === 'pass'
                          ? <CheckCircle2 size={16} className="meth-icon-pass" aria-hidden="true" />
                          : check.status === 'warn'
                            ? <AlertTriangle size={16} className="meth-icon-warn" aria-hidden="true" />
                            : <XCircle size={16} className="meth-icon-fail" aria-hidden="true" />}
                        <span className="meth-check-name">{check.name}</span>
                        <span className={`meth-status-tag meth-status-${check.status}`}>{check.status}</span>
                      </div>

                      {check.status !== 'pass' && check.weakness && (
                        <div className="meth-weakness-block">
                          <span className="meth-block-label">Weakness</span>
                          <p className="meth-block-text">{check.weakness}</p>
                        </div>
                      )}

                      {check.status !== 'pass' && check.recommendation && (
                        <div className="meth-recommendation-block">
                          <span className="meth-block-label">Recommendation</span>
                          <pre className="meth-rec-text">{check.recommendation}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            <CorrectionPanel
              result={methodologyResult}
              correcting={methodologyCorrecting}
              corrections={methodologyCorrections}
              accepted={methodologyAccepted}
              error={methodologyError}
              setError={setMethodologyError}
              onCorrect={() => handleCorrectFromReview('Agent 3: Methodology', methodologyResult, setMethodologyCorrecting, setMethodologyCorrections, setMethodologyError)}
              onAccept={() => acceptCorrections(methodologyCorrections, setMethodologyCorrections, setMethodologyAccepted)}
              onDiscard={() => setMethodologyCorrections(null)}
            />
          </div>

          <div className="agent-section">
            <div className="agent-header">
              <div className="agent-title-group">
                <span className="agent-badge">Agent 4</span>
                <h2 className="agent-heading">Consistency Reviewer</h2>
                {consistencyAccepted && <span className="agent-review-complete-badge"><CheckCircle2 size={13} aria-hidden="true" />Review complete</span>}
              </div>
              <button className="primary" type="button" onClick={handleConsistencyReview} disabled={consistencyLoading}>
                {consistencyLoading ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" />}
                {consistencyLoading ? 'Reviewing…' : 'Run Agent'}
              </button>
            </div>

            <button className="agent-prompt-toggle" type="button" onClick={() => setConsistencyPromptOpen((v) => !v)}>
              <ChevronDown size={14} className={consistencyPromptOpen ? 'agent-chevron-open' : ''} aria-hidden="true" />
              Prompt
            </button>

            {consistencyPromptOpen && (
              <pre className="agent-prompt-box">{`Check cross-section alignment.\n\nDetect inconsistencies between:\n- Research questions ↔ Evaluation metrics\n- Methodology ↔ Timeline\n- Title ↔ Contributions\n- Objectives ↔ Research questions\n\nFor each inconsistency: show which sections conflict and why.\n\nReturn JSON.`}</pre>
            )}

            {consistencyError && <p className="error-banner">{consistencyError}</p>}

            {consistencyResult && !consistencyAccepted && (
              <>
                <div className="meth-summary-row">
                  {(consistencyResult.inconsistencies || []).filter((i) => i.severity === 'high').length > 0 && (
                    <span className="meth-critical-count">
                      <AlertTriangle size={14} aria-hidden="true" />
                      {consistencyResult.inconsistencies.filter((i) => i.severity === 'high').length} high severity
                    </span>
                  )}
                  {consistencyResult.overall && (
                    <span className={`meth-overall-badge consistency-overall-${consistencyOverallKey(consistencyResult.overall)}`}>
                      {consistencyResult.overall}
                    </span>
                  )}
                </div>

                {(consistencyResult.inconsistencies || []).length === 0 ? (
                  <p className="agent-all-good">No inconsistencies detected — all sections are aligned!</p>
                ) : (
                  <div className="consistency-cards">
                    {consistencyResult.inconsistencies.map((item, i) => (
                      <div key={i} className={`consistency-card consistency-severity-${item.severity}`}>
                        <div className="consistency-comparison">
                          <div className="consistency-side">
                            <span className="consistency-section-name">{item.section_a}</span>
                            <p className="consistency-section-value">{item.value_a}</p>
                          </div>
                          <div className="consistency-vs" aria-hidden="true">vs</div>
                          <div className="consistency-side">
                            <span className="consistency-section-name">{item.section_b}</span>
                            <p className="consistency-section-value">{item.value_b}</p>
                          </div>
                        </div>
                        <div className="consistency-footer">
                          <span className={`consistency-detected-label consistency-detected-${item.severity}`}>
                            <AlertTriangle size={13} aria-hidden="true" />
                            Inconsistency detected
                            <span className={`consistency-severity-badge consistency-sev-${item.severity}`}>{item.severity}</span>
                          </span>
                          {item.description && (
                            <p className="consistency-description">{item.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(consistencyResult.consistent_pairs || []).length > 0 && (
                  <div className="consistency-pairs-row">
                    <span className="consistency-pairs-label">Consistent:</span>
                    {consistencyResult.consistent_pairs.map((pair, i) => (
                      <span key={i} className="consistency-pair-tag">{pair}</span>
                    ))}
                  </div>
                )}
              </>
            )}
            <CorrectionPanel
              result={consistencyResult}
              correcting={consistencyCorrecting}
              corrections={consistencyCorrections}
              accepted={consistencyAccepted}
              error={consistencyError}
              setError={setConsistencyError}
              onCorrect={() => handleCorrectFromReview('Agent 4: Consistency', consistencyResult, setConsistencyCorrecting, setConsistencyCorrections, setConsistencyError)}
              onAccept={() => acceptCorrections(consistencyCorrections, setConsistencyCorrections, setConsistencyAccepted)}
              onDiscard={() => setConsistencyCorrections(null)}
            />
          </div>

          <div className="agent-section">
            <div className="agent-header">
              <div className="agent-title-group">
                <span className="agent-badge">Agent 5</span>
                <h2 className="agent-heading">CS Academic Reviewer</h2>
                {csReviewAccepted && <span className="agent-review-complete-badge"><CheckCircle2 size={13} aria-hidden="true" />Review complete</span>}
              </div>
              <button className="primary" type="button" onClick={handleCsReview} disabled={csReviewLoading}>
                {csReviewLoading ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <ClipboardCheck size={16} aria-hidden="true" />}
                {csReviewLoading ? 'Reviewing…' : 'Run Agent'}
              </button>
            </div>

            <button className="agent-prompt-toggle" type="button" onClick={() => setCsReviewPromptOpen((v) => !v)}>
              <ChevronDown size={14} className={csReviewPromptOpen ? 'agent-chevron-open' : ''} aria-hidden="true" />
              Prompt
            </button>

            {csReviewPromptOpen && (
              <pre className="agent-prompt-box">{`Act as a Computer Science faculty reviewer.\n\nEvaluate:\n1. Technical Clarity\n   - Algorithms and models clearly explained?\n   - Technical terms used correctly?\n2. Research Gap Articulation\n   - Gap clearly identified?\n   - Novelty convincingly presented?\n3. Methodology Completeness\n   - Datasets, tools, baselines, metrics described?\n   - Experiments reproducible?\n4. Problem–Method Alignment\n   - Solution addresses the stated problem?\n   - Hypotheses align with methodology?\n5. Academic Writing Quality\n   - Grammar, clarity, tone, redundancy, organization\n6. CS Research Standards\n   - Technical accuracy, feasibility, evaluation\n     rigor, threats to validity, contributions\n\nScore each 1–10. Return overall score /100\nand major recommendations.\n\nReturn JSON.`}</pre>
            )}

            {csReviewError && <p className="error-banner">{csReviewError}</p>}

            {csReviewResult && !csReviewAccepted && (
              <>
                <div className="cs-overall-block">
                  <div className="cs-overall-top">
                    <span className="cs-overall-label">Overall CS Review Score</span>
                    <span className="cs-overall-score">
                      {csReviewResult.overall_score}
                      <span className="cs-overall-max">/100</span>
                    </span>
                  </div>
                  <div className="review-score-bar-wrap">
                    <div className="review-score-bar" style={{ width: `${csReviewResult.overall_score}%`, background: scoreColor(csReviewResult.overall_score) }} />
                  </div>
                </div>

                <div className="cs-dimensions">
                  {(csReviewResult.dimensions || []).map((dim) => {
                    const pct = Math.round((dim.score / dim.max) * 100);
                    return (
                      <div key={dim.name} className="cs-dimension-row">
                        <span className="cs-dimension-label">{dim.name}</span>
                        <div className="review-dimension-bar-wrap">
                          <div className="review-dimension-bar" style={{ width: `${pct}%`, background: scoreColor(pct) }} />
                        </div>
                        <span className="cs-dimension-score">{dim.score}<span className="cs-dimension-max">/{dim.max}</span></span>
                        {dim.notes && <p className="cs-dimension-notes">{dim.notes}</p>}
                      </div>
                    );
                  })}
                </div>

                {(csReviewResult.major_recommendations || []).length > 0 && (
                  <div className="cs-recommendations">
                    <h3 className="cs-rec-heading">Major Recommendations</h3>
                    <ol className="cs-rec-list">
                      {csReviewResult.major_recommendations.map((rec, i) => (
                        <li key={i} className="cs-rec-item">{rec}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            )}
            <CorrectionPanel
              result={csReviewResult}
              correcting={csReviewCorrecting}
              corrections={csReviewCorrections}
              accepted={csReviewAccepted}
              error={csReviewError}
              setError={setCsReviewError}
              onCorrect={() => handleCorrectFromReview('Agent 5: CS Academic', csReviewResult, setCsReviewCorrecting, setCsReviewCorrections, setCsReviewError)}
              onAccept={() => acceptCorrections(csReviewCorrections, setCsReviewCorrections, setCsReviewAccepted)}
              onDiscard={() => setCsReviewCorrections(null)}
            />
          </div>

          <div className="agent-section consolidation-section">
            <div className="agent-header">
              <div className="agent-title-group">
                <span className="agent-badge agent-badge-final">Final</span>
                <h2 className="agent-heading">Final Consolidation Agent</h2>
                {consolidationAccepted && <span className="agent-review-complete-badge"><CheckCircle2 size={13} aria-hidden="true" />Review complete</span>}
              </div>
              <button className="primary" type="button" onClick={handleConsolidation} disabled={consolidationLoading}>
                {consolidationLoading ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
                {consolidationLoading ? 'Consolidating…' : 'Run Consolidation'}
              </button>
            </div>

            <p className="consolidation-description">
              Aggregates all review reports, removes duplicate issues, and outputs the top 5 prioritized improvements.
            </p>

            <button className="agent-prompt-toggle" type="button" onClick={() => setConsolidationPromptOpen((v) => !v)}>
              <ChevronDown size={14} className={consolidationPromptOpen ? 'agent-chevron-open' : ''} aria-hidden="true" />
              Prompt
            </button>

            {consolidationPromptOpen && (
              <pre className="agent-prompt-box">{`You receive a proposal and review reports from multiple agents.\n\nTask:\n1. Aggregate all issues across all reports\n2. Remove duplicates (same issue from multiple agents = one item)\n3. Rank by impact on proposal quality\n4. Generate exactly 5 top actionable improvements\n\nReturn JSON.`}</pre>
            )}

            {consolidationError && <p className="error-banner">{consolidationError}</p>}

            {consolidationResult && !consolidationAccepted && (
              <>
                {consolidationResult.summary && (
                  <blockquote className="consolidation-summary">{consolidationResult.summary}</blockquote>
                )}

                <h3 className="consolidation-list-heading">Top 5 Improvements</h3>
                <div className="consolidation-list">
                  {(consolidationResult.top_improvements || []).map((item) => (
                    <div key={item.rank} className={`consolidation-item consolidation-priority-${item.priority}`}>
                      <div className="consolidation-rank">{item.rank}</div>
                      <div className="consolidation-body">
                        <div className="consolidation-item-header">
                          <span className="consolidation-item-title">{item.title}</span>
                          <span className={`consolidation-priority-badge cpb-${item.priority}`}>{item.priority}</span>
                        </div>
                        {item.description && (
                          <p className="consolidation-item-desc">{item.description}</p>
                        )}
                        {(item.source_agents || []).length > 0 && (
                          <div className="consolidation-sources">
                            {item.source_agents.map((src, i) => (
                              <span key={i} className="consolidation-source-tag">{src}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <CorrectionPanel
              result={consolidationResult}
              correcting={consolidationCorrecting}
              corrections={consolidationCorrections}
              accepted={consolidationAccepted}
              error={consolidationError}
              setError={setConsolidationError}
              onCorrect={() => handleCorrectFromReview('Final Consolidation', consolidationResult, setConsolidationCorrecting, setConsolidationCorrections, setConsolidationError)}
              onAccept={() => acceptCorrections(consolidationCorrections, setConsolidationCorrections, setConsolidationAccepted)}
              onDiscard={() => setConsolidationCorrections(null)}
            />
          </div>

          <div className="export-actions-bar">
            <button className="secondary" type="button" onClick={handleExportLatex} disabled={exportLatexLoading}>
              {exportLatexLoading ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
              LaTeX
            </button>
            <button className="primary" type="button" onClick={() => setGeneratePopupOpen(true)}>
              <FileText size={16} aria-hidden="true" />
              PDF
            </button>
            <button className="secondary" type="button" onClick={() => setChecklistOpen(true)}>
              <ClipboardCheck size={16} aria-hidden="true" />
              Review Checklist
            </button>
          </div>

          {checklistOpen && (
            <div className="checklist-overlay" onClick={() => setChecklistOpen(false)}>
              <div className="checklist-modal" onClick={(e) => e.stopPropagation()}>
                <div className="checklist-modal-header">
                  <h2 className="checklist-modal-title">Review Checklist</h2>
                  <button type="button" className="checklist-close" onClick={() => setChecklistOpen(false)}>
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>

                <div className="checklist-group">
                  <h3 className="checklist-group-title">6-Step Stepper</h3>
                  {[
                    ['projectDetails',  'Project Details'],
                    ['researchProblem', 'Research Problem'],
                    ['methodology',     'Methodology'],
                    ['timeline',        'Timeline'],
                    ['risks',           'Risks & Mitigation'],
                    ['references',      'References'],
                  ].map(([key, label]) => (
                    <div key={key} className={`checklist-item ${completedSteps[key] ? 'checklist-done' : 'checklist-todo'}`}>
                      {completedSteps[key] ? <CheckCircle2 size={15} aria-hidden="true" /> : <XCircle size={15} aria-hidden="true" />}
                      <span>{label}</span>
                    </div>
                  ))}
                </div>

                <div className="checklist-group">
                  <h3 className="checklist-group-title">Proposal Sections</h3>
                  {[
                    ['research_title',    'Research Title'],
                    ['objective',         'Objective'],
                    ['problem_statement', 'Problem Statement'],
                    ['hypothesis',        'Hypothesis'],
                    ['motivation',        'Motivation'],
                    ['methodology_text',  'Methodology'],
                    ['tools',             'Tools'],
                    ['contributions',     'Contributions'],
                    ['timeline_budget',   'Timeline & Budget'],
                    ['risks_mitigation',  'Risks & Mitigation'],
                    ['references',        'References'],
                  ].map(([key, label]) => {
                    const filled = (proposalOutput[key] || '').trim().length >= 20;
                    return (
                      <div key={key} className={`checklist-item ${filled ? 'checklist-done' : 'checklist-todo'}`}>
                        {filled ? <CheckCircle2 size={15} aria-hidden="true" /> : <XCircle size={15} aria-hidden="true" />}
                        <span>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {generatePopupOpen && (
            <GenerateFormatPopup
              proposalOutput={proposalOutput}
              projectDetails={projectDetails}
              onClose={() => setGeneratePopupOpen(false)}
            />
          )}

          {projectDetailsOpen && (
            <ProjectDetailsModal
              details={projectDetails}
              onSave={(saved) => {
                setProjectDetails(saved);
                if (saved.rough_idea) setTopicInput(saved.rough_idea);
                updateOutput({ research_title: saved.research_title || '', objective: saved.introduction || '' });
                markComplete('projectDetails');
                setProjectDetailsOpen(false);
              }}
              onClose={() => setProjectDetailsOpen(false)}
            />
          )}
          {researchProblemOpen && (
            <ResearchProblemModal
              initialData={researchProblemData}
              onSave={(data) => {
                setResearchProblemData(data);
                updateOutput({
                  problem_statement: data.problem_description || '',
                  hypothesis: (data.hypotheses || []).filter(Boolean).map((h, i) => `${i + 1}. ${h}`).join('\n'),
                  motivation: data.motivation || ''
                });
                markComplete('researchProblem');
                setResearchProblemOpen(false);
              }}
              onClose={() => setResearchProblemOpen(false)}
            />
          )}
          {methodologyOpen && (
            <MethodologyModal
              initialData={methodologyData}
              onSave={(data) => {
                setMethodologyData(data);
                updateOutput({
                  methodology_text: data.generated_methodology || '',
                  data_source: data.data_source || '',
                  tools: (data.tools || []).join(', '),
                  contributions: (data.contributions || []).filter(Boolean).map((c, i) => `${i + 1}. ${c}`).join('\n')
                });
                markComplete('methodology');
                setMethodologyOpen(false);
              }}
              onClose={() => setMethodologyOpen(false)}
            />
          )}
          {timelineOpen && (
            <TimelineModal
              initialDuration={parseInt(projectDetails.timeline, 10) || 6}
              initialTeamSize={projectDetails.team_size || '1'}
              initialBudget={projectDetails.budget || '$10,000'}
              initialActivities={timelineActivities}
              onSave={(data) => {
                setTimelineActivities(data.activities);
                const teamLine = data.teamSize ? `Team Size: ${data.teamSize}` : '';
                const activityLines = (data.activities || []).map((a) => `${a.name} | ${a.months}`).join('\n');
                const budgetLine = data.budget ? `Budget: ${data.budget}` : '';
                const text = [teamLine, activityLines, budgetLine].filter(Boolean).join('\n');
                updateOutput({
                  timeline_budget: text,
                  timeline_structured: { activities: data.activities, teamSize: data.teamSize, budget: data.budget, duration: data.duration }
                });
                markComplete('timeline');
                setTimelineOpen(false);
              }}
              onClose={() => setTimelineOpen(false)}
            />
          )}
          {risksOpen && (
            <RisksModal
              initialSavedRisks={risksData.savedRisks}
              onSave={(data) => {
                setRisksData({ savedRisks: data.risks || [] });
                const text = (data.risks || []).map((r, i) =>
                  `${i + 1}. [${r.category}] ${r.description}\n   Likelihood: ${r.likelihood} | Impact: ${r.impact}\n   Mitigation: ${r.mitigation || 'N/A'}`
                ).join('\n\n');
                updateOutput({ risks_mitigation: text, risks_structured: data.risks || [] });
                markComplete('risks');
                setRisksOpen(false);
              }}
              onClose={() => setRisksOpen(false)}
            />
          )}
          {referencesOpen && (
            <ReferencesModal
              initialSavedRefs={referencesData.savedRefs}
              onSave={(data) => {
                setReferencesData({ savedRefs: data.references || [] });
                updateOutput({ references: data.formatted || '' });
                markComplete('references');
                setReferencesOpen(false);
              }}
              onClose={() => setReferencesOpen(false)}
            />
          )}

          <div className="actions framework-actions">
            <button className="primary" disabled={!topicInput.trim() || status !== 'idle'} onClick={startAgent} type="button">
              {status === 'starting' ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
              Structure Idea
            </button>
            <button className="secondary" disabled={status !== 'idle'} onClick={startSampleAgent} type="button">
              <Sparkles size={18} aria-hidden="true" />
              Sample
            </button>
            <button className="secondary" disabled={!topicInput.trim() || refining || status !== 'idle'} onClick={refineProblem} type="button">
              {refining ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Wand2 size={18} aria-hidden="true" />}
              Refine to Problem
            </button>
            <button className="secondary icon-button" onClick={reset} type="button" aria-label="Reset">
              <RefreshCw size={18} aria-hidden="true" />
            </button>
          </div>

          {error ? <p className="error-banner">{error}</p> : null}

          <div className="workspace-grid">
            <section className="workspace-panel suggestions-panel">
              <PanelHeader title="LLM Suggested Structure" meta={`${fieldSuggestions.length} fields`} />
              {fieldSuggestions.length ? (
                <div className="suggestion-deck">
                  <div className="deck-progress">
                    <span>{Math.min(suggestionIndex + 1, fieldSuggestions.length)} / {fieldSuggestions.length}</span>
                    <strong>{acceptedSuggestionCount} accepted</strong>
                  </div>
                  {currentSuggestion ? (
                    <article className="suggestion-card active-card" key={`${currentSuggestion.field}-${currentSuggestion.value}`}>
                      <div className="card-line">
                        <h3>{currentSuggestion.label || labelForField(currentSuggestion.field)}</h3>
                        <span className={`priority ${String(currentSuggestion.confidence || 'medium').toLowerCase()}`}>
                          {currentSuggestion.confidence || 'Medium'}
                        </span>
                      </div>
                      <p>{currentSuggestion.value}</p>
                      <small>{currentSuggestion.reason}</small>
                      <div className="deck-actions">
                        <button
                          className={project[currentSuggestion.field] === currentSuggestion.value ? 'secondary accepted' : 'primary'}
                          type="button"
                          onClick={() => acceptSuggestion(currentSuggestion)}
                        >
                          <CheckCircle2 size={16} aria-hidden="true" />
                          {project[currentSuggestion.field] === currentSuggestion.value ? 'Accepted' : 'Accept and Next'}
                        </button>
                        <button className="secondary" type="button" onClick={skipSuggestion}>
                          Skip
                        </button>
                      </div>
                    </article>
                  ) : null}
                  <div className="deck-nav">
                    <button
                      className="secondary"
                      type="button"
                      disabled={suggestionIndex === 0}
                      onClick={() => setSuggestionIndex((current) => Math.max(current - 1, 0))}
                    >
                      Previous
                    </button>
                    <button
                      className="secondary"
                      type="button"
                      disabled={suggestionIndex >= fieldSuggestions.length - 1}
                      onClick={() => setSuggestionIndex((current) => Math.min(current + 1, fieldSuggestions.length - 1))}
                    >
                      Next
                    </button>
                  </div>
                  <div className="deck-strip" aria-label="Suggestion progress">
                    {fieldSuggestions.map((suggestion, index) => (
                      <button
                        key={`${suggestion.field}-${index}`}
                        className={[
                          'deck-dot',
                          index === suggestionIndex ? 'current' : '',
                          project[suggestion.field] === suggestion.value ? 'done' : ''
                        ].join(' ')}
                        type="button"
                        aria-label={`Open ${suggestion.label || labelForField(suggestion.field)}`}
                        onClick={() => setSuggestionIndex(index)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState text="Enter a rough idea, then let the model structure it." compact />
              )}
            </section>

            <section className="workspace-panel decisions-panel">
              <PanelHeader title="Decision Needed" meta={`${decisions.length} open`} />
              {decisions.length ? (
                <div className="decision-deck">
                  <div className="deck-progress">
                    <span>{Math.min(decisionIndex + 1, decisions.length)} / {decisions.length}</span>
                    <strong>{decisions.length} open</strong>
                  </div>
                  {currentDecision ? (
                    <article className="decision-card active-card" key={currentDecision.id}>
                      <h3>{currentDecision.title}</h3>
                      <p>{currentDecision.question}</p>
                      <div className="option-stack">
                        {currentDecision.options.map((option) => (
                          <button
                            className="option-button"
                            key={`${currentDecision.id}-${option.label}`}
                            type="button"
                            onClick={() => chooseOption(currentDecision, option)}
                          >
                            <strong>{option.label}</strong>
                            <span>{option.value}</span>
                            <small>{option.rationale}</small>
                          </button>
                        ))}
                      </div>
                      <div className="deck-actions">
                        <button className="secondary" type="button" onClick={skipDecision}>
                          Skip
                        </button>
                      </div>
                    </article>
                  ) : null}
                  <div className="deck-nav">
                    <button
                      className="secondary"
                      type="button"
                      disabled={decisionIndex === 0}
                      onClick={() => setDecisionIndex((current) => Math.max(current - 1, 0))}
                    >
                      Previous
                    </button>
                    <button
                      className="secondary"
                      type="button"
                      disabled={decisionIndex >= decisions.length - 1}
                      onClick={() => setDecisionIndex((current) => Math.min(current + 1, decisions.length - 1))}
                    >
                      Next
                    </button>
                  </div>
                  <div className="deck-strip" aria-label="Decision progress">
                    {decisions.map((decision, index) => (
                      <button
                        key={`${decision.id}-${index}`}
                        className={['deck-dot', index === decisionIndex ? 'current' : ''].join(' ')}
                        type="button"
                        aria-label={`Open ${decision.title}`}
                        onClick={() => setDecisionIndex(index)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState text="No major decision is open. Review the accepted state or draft the proposal." compact />
              )}

              <section className="custom-note">
                <h3>Extra Note</h3>
                <textarea
                  value={customNote}
                  onChange={(event) => setCustomNote(event.target.value)}
                  placeholder={currentQuestion?.question || 'Add a detail the options missed.'}
                />
                <button className="primary" disabled={!customNote.trim() || status !== 'idle'} onClick={submitCustomNote} type="button">
                  {status === 'answering' ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
                  Let LLM Integrate
                </button>
              </section>
            </section>

            <section className="workspace-panel state-panel">
              <PanelHeader title="Accepted Project State" meta={`${acceptedCount}/${PROJECT_FIELDS.length} ready`} />
              {PROJECT_FIELDS.map(([field, label]) => (
                <label key={field}>
                  {label}
                  <textarea value={project[field] || ''} onChange={(event) => updateProjectField(field, event.target.value)} />
                </label>
              ))}
            </section>
          </div>

          <div className="workflow-columns">
            <section className="workflow-panel">
              <h2>Run Log</h2>
              {runLog.length ? (
                <ol className="run-log">
                  {runLog.map((entry) => (
                    <li key={entry.id}>
                      <span>{entry.stage}</span>
                      <p>{entry.message}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState text="Run log appears after the idea is structured." compact />
              )}
            </section>

            <section className="workflow-panel artifacts-panel">
              <div className="artifact-toolbar">
                <nav className="tabs" aria-label="Generated artifacts">
                  {TABS.map(([id, Icon, label]) => (
                    <button
                      key={id}
                      className={activeTab === id ? 'tab active' : 'tab'}
                      type="button"
                      onClick={() => setActiveTab(id)}
                    >
                      <Icon size={17} aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </nav>
                <button className="secondary" type="button" disabled={!result?.proposalLatex} onClick={downloadLatex}>
                  <Download size={17} aria-hidden="true" />
                  LaTeX
                </button>
                <button
                  className="primary"
                  type="button"
                  disabled={!result?.proposalLatex || status !== 'idle'}
                  onClick={downloadPdf}
                >
                  {status === 'exporting' ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
                  PDF
                </button>
              </div>

              <div className="artifact-summary">
                <div>
                  <span>Coverage</span>
                  <strong>{matrixStats.total ? `${matrixStats.covered}/${matrixStats.total}` : '0/0'}</strong>
                </div>
                <div>
                  <span>Accepted</span>
                  <strong>{acceptedCount}/{PROJECT_FIELDS.length}</strong>
                </div>
                <div>
                  <span>Provider</span>
                  <strong>{result?.provider || 'waiting'}</strong>
                </div>
              </div>

              {renderArtifact(activeTab, result, pdfUrl)}
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || data.error || 'Request failed.');
  }

  return data;
}

async function exportPdfUrl(proposalLatex, title) {
  const response = await fetch('/api/export/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      proposalLatex
    })
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || data.error || 'PDF export failed.');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

function renderArtifact(activeTab, result, pdfUrl) {
  if (!result) {
    return <EmptyState text="Proposal artifacts appear after Generate Proposal." />;
  }

  if (activeTab === 'pdf') {
    return pdfUrl ? (
      <iframe className="pdf-preview" src={pdfUrl} title="Compiled proposal PDF" />
    ) : (
      <EmptyState text="PDF preview is rendering." />
    );
  }

  if (activeTab === 'matrix') {
    return (
      <div className="matrix-wrap">
        <table>
          <thead>
            <tr>
              <th>Requirement</th>
              <th>Status</th>
              <th>Evidence</th>
              <th>Fix</th>
            </tr>
          </thead>
          <tbody>
            {(result.complianceMatrix || []).map((row, index) => (
              <tr key={`${row.requirement}-${index}`}>
                <td>{row.requirement}</td>
                <td>
                  <span className={/^covered$/i.test(row.status) ? 'badge covered' : 'badge needs-work'}>{row.status}</span>
                </td>
                <td>{row.evidence}</td>
                <td>{row.fix}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (activeTab === 'evaluation') {
    return <pre>{result.evaluationReport}</pre>;
  }

  return <pre className="proposal-output">{result.proposalLatex}</pre>;
}

function PanelHeader({ title, meta }) {
  return (
    <div className="panel-header">
      <h2>{title}</h2>
      <span>{meta}</span>
    </div>
  );
}

function EmptyState({ text, compact = false }) {
  return (
    <div className={compact ? 'empty-state compact' : 'empty-state'}>
      <FileText size={compact ? 24 : 32} aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}


function countCovered(rows = []) {
  return rows.filter((row) => /^covered$/i.test(row.status)).length;
}

function labelForField(field) {
  const found = PROJECT_FIELDS.find(([key]) => key === field);
  return found?.[1] || 'Field';
}

function logEntry(stage, message) {
  return {
    id: `${stage}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    stage,
    message
  };
}

function readError(error) {
  return error instanceof Error ? error.message : String(error);
}

function compactResult(result) {
  if (!result) return null;

  return {
    mode: result.mode,
    provider: result.provider,
    proposalLatex: result.proposalLatex,
    complianceMatrix: result.complianceMatrix,
    evaluationReport: result.evaluationReport,
    questions: result.questions
  };
}

function GenerateFormatPopup({ proposalOutput, projectDetails, onClose }) {
  const [latex, setLatex] = useState('');
  const [localPdfUrl, setLocalPdfUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [view, setView] = useState('pdf');
  const [error, setError] = useState('');

  useEffect(() => {
    handleGenerate();
    return () => { if (localPdfUrl) URL.revokeObjectURL(localPdfUrl); };
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    try {
      const { proposalLatex } = await postJson('/api/generate-from-output', { ...proposalOutput, projectDetails });
      setLatex(proposalLatex);
      const pdfResponse = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalLatex, title: proposalOutput.research_title || 'proposal' })
      });
      if (pdfResponse.ok) {
        const blob = await pdfResponse.blob();
        setLocalPdfUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  function downloadLatex() {
    if (!latex) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([latex], { type: 'text/x-tex' }));
    a.download = 'proposal.tex';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function downloadPdf() {
    if (!localPdfUrl) return;
    const a = document.createElement('a');
    a.href = localPdfUrl;
    a.download = 'proposal.pdf';
    a.click();
  }

  return (
    <div className="modal-overlay gen-preview-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="gen-preview-card" role="dialog" aria-modal="true" aria-label="Research Proposal Preview">
        <div className="gen-preview-topbar">
          <div className="gen-preview-tabs">
            <button className={`tab ${view === 'pdf' ? 'active' : ''}`} type="button" onClick={() => setView('pdf')}>
              <FileText size={15} aria-hidden="true" /> PDF Preview
            </button>
            <button className={`tab ${view === 'latex' ? 'active' : ''}`} type="button" onClick={() => setView('latex')}>
              <FileText size={15} aria-hidden="true" /> LaTeX Source
            </button>
          </div>
          <div className="gen-preview-actions">
            {generating && <Loader2 className="spin" size={18} style={{ color: '#2f6f62' }} aria-hidden="true" />}
            {localPdfUrl && (
              <button className="secondary" type="button" onClick={downloadPdf}>
                <Download size={15} aria-hidden="true" /> Download PDF
              </button>
            )}
            {latex && (
              <button className="secondary" type="button" onClick={downloadLatex}>
                <Download size={15} aria-hidden="true" /> Download LaTeX
              </button>
            )}
            <button className="secondary icon-button" type="button" onClick={onClose} aria-label="Close">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="gen-preview-body">
          {error && <p className="error-banner" style={{ margin: '12px' }}>{error}</p>}
          {generating && !latex && (
            <div className="gen-preview-loading">
              <Loader2 className="spin" size={36} style={{ color: '#2f6f62' }} aria-hidden="true" />
              <p>Generating proposal…</p>
            </div>
          )}
          {!generating && view === 'pdf' && (
            localPdfUrl
              ? <iframe className="gen-preview-iframe" src={localPdfUrl} title="Proposal PDF" />
              : latex
                ? <p className="gen-preview-hint">PDF compilation requires Tectonic. Download the LaTeX source to compile manually.</p>
                : null
          )}
          {!generating && view === 'latex' && latex && (
            <pre className="gen-preview-latex">{latex}</pre>
          )}
        </div>
      </div>
    </div>
  );
}

const PROPOSAL_STEPS = [
  { key: 'projectDetails',   number: 1, label: 'Project Details',             hint: 'Research title, student info, objectives' },
  { key: 'researchProblem',  number: 2, label: 'Research Problem',            hint: 'Problem statement, questions, hypotheses' },
  { key: 'methodology',      number: 3, label: 'Methodology',                 hint: 'Research type, tools, experiment design' },
  { key: 'timeline',         number: 4, label: 'Timeline',                    hint: 'Duration and research activities' },
  { key: 'risks',            number: 5, label: 'Risks & Mitigation',          hint: 'Identify and mitigate project risks' },
  { key: 'references',       number: 6, label: 'References',                  hint: 'Citations in APA, IEEE or ACM format' },
];

function ProposalStepper({ completed, onOpen }) {
  const doneCount = PROPOSAL_STEPS.filter((s) => completed[s.key]).length;

  return (
    <div className="proposal-stepper-wrap">
      <div className="proposal-stepper-header">
        <span className="proposal-stepper-title">Research Proposal Sections</span>
        <span className="proposal-stepper-progress">{doneCount} / {PROPOSAL_STEPS.length} complete</span>
      </div>
      <div className="proposal-stepper">
        {PROPOSAL_STEPS.map((step, index) => {
          const done = completed[step.key];
          return (
            <div key={step.key} className="stepper-step-wrapper">
              <button
                className={`stepper-step ${done ? 'stepper-done' : 'stepper-pending'}`}
                type="button"
                onClick={() => onOpen(step.key)}
                title={step.hint}
              >
                <div className="stepper-circle">
                  {done ? <CheckCircle2 size={18} aria-hidden="true" /> : <span>{step.number}</span>}
                </div>
                <span className="stepper-label">{step.label}</span>
                <span className="stepper-status">{done ? 'Complete' : 'Click to fill'}</span>
              </button>
              {index < PROPOSAL_STEPS.length - 1 && (
                <div className={`stepper-connector ${done ? 'stepper-connector-done' : ''}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReferencesModal({ onSave, onClose, initialSavedRefs }) {
  const [doi, setDoi] = useState('');
  const [referenceText, setReferenceText] = useState('');
  const [savedRefs, setSavedRefs] = useState(initialSavedRefs || []);
  const [fetchBusy, setFetchBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleFetch() {
    if (!doi.trim()) { setError('Enter a DOI first.'); return; }
    setFetchBusy(true);
    setError('');
    try {
      const data = await postJson('/api/research/fetch-doi', { doi: doi.trim() });
      setReferenceText(data.reference);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setFetchBusy(false);
    }
  }

  function addReference() {
    if (!referenceText.trim()) { setError('Enter or fetch a reference first.'); return; }
    setSavedRefs((prev) => [...prev, { id: Date.now(), text: referenceText.trim() }]);
    setDoi('');
    setReferenceText('');
    setError('');
  }

  function removeRef(id) {
    setSavedRefs((prev) => prev.filter((r) => r.id !== id));
  }

  function shortTitle(text) {
    const quoted = text.match(/"([^"]+)"/);
    if (quoted) return quoted[1];
    return text.length > 80 ? text.slice(0, 80) + '…' : text;
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card modal-card-wide" role="dialog" aria-modal="true" aria-label="References">
        <div className="modal-header">
          <h2>References</h2>
          <button className="secondary icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="modal-body">
          {error && <p className="error-banner">{error}</p>}

          <div className="modal-field-group">
            <span className="modal-field-label">DOI</span>
            <div className="ref-doi-row">
              <input
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleFetch(); }}
                placeholder="e.g. 10.1109/COMST.2018.2868922"
              />
              <button className="secondary" type="button" disabled={fetchBusy || !doi.trim()} onClick={handleFetch}>
                {fetchBusy ? <Loader2 className="spin" size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
                Fetch
              </button>
            </div>
            <span className="ref-doi-hint">Example: 10.1109/COMST.2018.2868922</span>
          </div>

          <label>
            Reference
            <textarea
              value={referenceText}
              onChange={(e) => setReferenceText(e.target.value)}
              placeholder="Reference text will appear here after clicking Fetch, or type manually..."
              style={{ minHeight: '110px', fontFamily: 'inherit', fontSize: '0.88rem', lineHeight: '1.55' }}
            />
          </label>

          <div className="ref-add-center">
            <button className="secondary" type="button" onClick={addReference}>
              <Plus size={16} aria-hidden="true" />
              Add Reference
            </button>
          </div>

          {savedRefs.length > 0 && (
            <>
              <hr className="rp-divider" />
              <div className="modal-field-group">
                <span className="modal-field-label">Added References</span>
                <ol className="ref-saved-list">
                  {savedRefs.map((ref, index) => (
                    <li key={ref.id} className="ref-saved-item">
                      <span>{shortTitle(ref.text)}</span>
                      <button className="secondary icon-button" type="button" onClick={() => removeRef(ref.id)} aria-label="Remove">
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="secondary" type="button" onClick={onClose}>Cancel</button>
          <button
            className="primary"
            type="button"
            onClick={() => {
              const allRefs = [
                ...savedRefs,
                ...(referenceText.trim() ? [{ id: Date.now(), text: referenceText.trim() }] : [])
              ];
              onSave({ formatted: allRefs.map((r) => r.text).join('\n\n'), references: allRefs });
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

const RISK_CATEGORIES = ['Technical', 'Data Availability', 'Ethical', 'Financial', 'Resource', 'Timeline', 'Regulatory', 'Other'];
const LIKELIHOOD_OPTIONS = ['Low', 'Medium', 'High'];
const IMPACT_OPTIONS = ['Low', 'Medium', 'High'];

const EMPTY_RISK = { id: 0, category: 'Technical', description: '', likelihood: 'Low', impact: 'Medium', mitigation: '' };

function RisksModal({ onSave, onClose, initialSavedRisks }) {
  const [savedRisks, setSavedRisks] = useState(initialSavedRisks || []);
  const [form, setForm] = useState({ ...EMPTY_RISK, id: Date.now() });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleAiAction(action) {
    if (!form.description.trim()) { setError('Enter a risk description first.'); return; }
    setBusy(action);
    setError('');
    try {
      const body = { category: form.category, description: form.description, likelihood: form.likelihood, impact: form.impact };
      if (action === 'structure-risk') {
        const data = await postJson('/api/research/structure-risk', body);
        setField('description', data.description);
      } else {
        const data = await postJson('/api/research/suggest-mitigation', body);
        setField('mitigation', data.mitigation);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy('');
    }
  }

  function saveRisk() {
    if (!form.description.trim()) { setError('Enter a risk description before saving.'); return; }
    setSavedRisks((prev) => {
      const existing = prev.findIndex((r) => r.id === form.id);
      if (existing >= 0) { const next = [...prev]; next[existing] = form; return next; }
      return [...prev, form];
    });
    setForm({ ...EMPTY_RISK, id: Date.now() });
    setError('');
  }

  function editRisk(risk) {
    setForm(risk);
  }

  function deleteRisk(id) {
    setSavedRisks((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card modal-card-wide" role="dialog" aria-modal="true" aria-label="Risk and Mitigation">
        <div className="modal-header">
          <h2>Risk &amp; Mitigation</h2>
          <button className="secondary icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="modal-body">
          {error && <p className="error-banner">{error}</p>}

          {savedRisks.length > 0 && (
            <div className="risk-saved-list">
              {savedRisks.map((risk) => (
                <div key={risk.id} className="risk-saved-card">
                  <div className="risk-saved-header">
                    <span className={`risk-badge risk-${risk.likelihood.toLowerCase()}`}>{risk.likelihood} likelihood</span>
                    <span className={`risk-badge risk-impact-${risk.impact.toLowerCase()}`}>{risk.impact} impact</span>
                    <strong>{risk.category}</strong>
                  </div>
                  <p>{risk.description}</p>
                  <div className="risk-saved-actions">
                    <button className="secondary" type="button" onClick={() => editRisk(risk)}>Edit</button>
                    <button className="secondary" type="button" onClick={() => deleteRisk(risk.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="modal-field-group">
            <span className="modal-field-label">Risk Category</span>
            <div className="radio-group radio-group-wrap">
              {RISK_CATEGORIES.map((cat) => (
                <label key={cat} className="radio-label">
                  <input type="radio" name="risk_category" value={cat} checked={form.category === cat} onChange={() => setField('category', cat)} />
                  {cat}
                </label>
              ))}
            </div>
          </div>

          <label>
            Risk Description
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Example: Public datasets may not contain enough high-quality samples for training."
              style={{ minHeight: '110px' }}
            />
          </label>

          <hr className="rp-divider" />

          <div className="modal-grid">
            <div className="modal-field-group">
              <span className="modal-field-label">Likelihood</span>
              <div className="radio-group">
                {LIKELIHOOD_OPTIONS.map((opt) => (
                  <label key={opt} className="radio-label">
                    <input type="radio" name="likelihood" value={opt} checked={form.likelihood === opt} onChange={() => setField('likelihood', opt)} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-field-group">
              <span className="modal-field-label">Impact</span>
              <div className="radio-group">
                {IMPACT_OPTIONS.map((opt) => (
                  <label key={opt} className="radio-label">
                    <input type="radio" name="impact" value={opt} checked={form.impact === opt} onChange={() => setField('impact', opt)} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <hr className="rp-divider" />

          <label>
            Current Mitigation
            <textarea
              value={form.mitigation}
              onChange={(e) => setField('mitigation', e.target.value)}
              placeholder="Describe how you plan to mitigate this risk..."
              style={{ minHeight: '90px' }}
            />
          </label>

          <hr className="rp-divider" />

          <div className="rp-action-row">
            <button className="secondary" type="button" disabled={!form.description.trim() || !!busy} onClick={() => handleAiAction('structure-risk')}>
              {busy === 'structure-risk' ? <Loader2 className="spin" size={15} aria-hidden="true" /> : <Wand2 size={15} aria-hidden="true" />}
              AI Structure Risk
            </button>
            <button className="secondary" type="button" disabled={!form.description.trim() || !!busy} onClick={() => handleAiAction('suggest-mitigation')}>
              {busy === 'suggest-mitigation' ? <Loader2 className="spin" size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
              AI Suggest Mitigation
            </button>
            <button className="primary" type="button" onClick={saveRisk}>
              <CheckCircle2 size={15} aria-hidden="true" />
              Save Risk
            </button>
          </div>

          <button className="llm-help-button" style={{ marginTop: '4px' }} type="button" onClick={() => { setForm({ ...EMPTY_RISK, id: Date.now() }); setError(''); }}>
            <Plus size={16} aria-hidden="true" />
            Add Another Risk
          </button>
        </div>

        <div className="modal-footer">
          <button className="secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="primary" type="button" onClick={() => onSave({ risks: savedRisks })}>Save</button>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_ACTIVITIES = [
  { name: 'Literature Review', months: 'Week 1' },
  { name: 'Implementation', months: 'Week 2-3' },
  { name: 'Experiments', months: 'Week 4-5' },
  { name: 'Writing', months: 'Week 6' }
];

function TimelineModal({ onSave, onClose, initialDuration = 6, initialTeamSize = '1', initialBudget = '', initialActivities }) {
  const [duration, setDuration] = useState(initialDuration);
  const [teamSize, setTeamSize] = useState(initialTeamSize);
  const [budget, setBudget] = useState(initialBudget);
  const [activities, setActivities] = useState(initialActivities || DEFAULT_ACTIVITIES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function setActivity(index, field, value) {
    setActivities((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addActivity() {
    setActivities((prev) => [...prev, { name: '', months: '' }]);
  }

  function removeActivity(index) {
    setActivities((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleGenerate() {
    setBusy(true);
    setError('');
    try {
      const data = await postJson('/api/research/generate-timeline', { durationMonths: duration, activities });
      setActivities(data.activities);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label="Timeline">
        <div className="modal-header">
          <h2>Timeline</h2>
          <button className="secondary icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="modal-body">
          {error && <p className="error-banner">{error}</p>}

          <div className="modal-grid">
            <div className="timeline-duration-row">
              <span className="modal-field-label">Research Duration</span>
              <div className="timeline-duration-input">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  style={{ width: '72px', textAlign: 'center' }}
                />
                <span className="timeline-months-label">Weeks</span>
              </div>
            </div>
            <label>
              Team Size
              <input type="number" min="1" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} placeholder="1" style={{ width: '72px' }} />
            </label>
          </div>
          <label>
            Budget
            <input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. $5,000" />
          </label>

          <hr className="rp-divider" />

          <div className="modal-objectives">
            <div className="modal-objectives-header">
              <span>Activities</span>
              <button className="secondary" type="button" onClick={addActivity}>
                <Plus size={15} aria-hidden="true" />
                Add Activity
              </button>
            </div>
            {activities.map((activity, index) => (
              <div className="timeline-activity-row" key={index}>
                <input
                  className="timeline-activity-name"
                  value={activity.name}
                  onChange={(e) => setActivity(index, 'name', e.target.value)}
                  placeholder="Activity name"
                />
                <input
                  className="timeline-activity-months"
                  value={activity.months}
                  onChange={(e) => setActivity(index, 'months', e.target.value)}
                  placeholder="Week X"
                />
                <button
                  className="secondary icon-button"
                  type="button"
                  disabled={activities.length === 1}
                  onClick={() => removeActivity(index)}
                  aria-label="Remove"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <hr className="rp-divider" />

          <button className="llm-help-button" type="button" disabled={busy} onClick={handleGenerate}>
            {busy ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
            Generate Timeline
          </button>
        </div>

        <div className="modal-footer">
          <button className="secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="primary" type="button" onClick={() => onSave({ activities, duration, teamSize, budget })}>Save</button>
        </div>
      </div>
    </div>
  );
}

function CorrectionPanel({ result, correcting, corrections, accepted, onCorrect, onAccept, onDiscard, error, setError }) {
  if (!result) return null;
  return (
    <div className="correction-bar-wrap">
      {accepted ? (
        <div className="correction-accepted-banner">
          <CheckCircle2 size={15} aria-hidden="true" />
          Corrections applied to proposal — review section updated
          <button className="correction-accepted-redo" type="button" onClick={() => { setError(''); onCorrect(); }}>
            Correct again
          </button>
        </div>
      ) : (
        <button
          className="secondary correction-trigger-btn"
          type="button"
          disabled={correcting}
          onClick={onCorrect}
        >
          {correcting
            ? <Loader2 className="spin" size={14} aria-hidden="true" />
            : <Wand2 size={14} aria-hidden="true" />}
          {correcting ? 'Generating corrections…' : 'Correct Proposal'}
        </button>
      )}

      {error && <p className="error-banner correction-error">{error}</p>}

      {corrections && (
        <div className="correction-preview">
          <div className="correction-preview-header">
            <span className="correction-preview-title">Suggested Corrections</span>
            {corrections.explanation && (
              <p className="correction-explanation">{corrections.explanation}</p>
            )}
          </div>
          <div className="correction-fields">
            {Object.entries(corrections.corrections || {}).map(([field, text]) => (
              <div key={field} className="correction-field">
                <span className="correction-field-label">{PROPOSAL_FIELD_LABELS[field] || field}</span>
                <p className="correction-field-text">{text}</p>
              </div>
            ))}
          </div>
          <div className="correction-actions">
            <button className="primary" type="button" onClick={onAccept}>
              <CheckCircle2 size={14} aria-hidden="true" />
              Accept Changes
            </button>
            <button className="secondary" type="button" onClick={onDiscard}>
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const RESEARCH_TYPES = ['Experimental', 'Survey', 'Qualitative', 'Quantitative', 'Mixed Methods'];

const EMPTY_METHODOLOGY = {
  research_type: 'Experimental',
  data_source: '',
  tools: [],
  experiment_description: '',
  generated_methodology: '',
  contributions: ['']
};

function MethodologyModal({ onSave, onClose, initialData }) {
  const [form, setForm] = useState(initialData || EMPTY_METHODOLOGY);
  const [toolInput, setToolInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function addTool() {
    const tag = toolInput.trim();
    if (!tag || form.tools.includes(tag)) { setToolInput(''); return; }
    setForm((f) => ({ ...f, tools: [...f.tools, tag] }));
    setToolInput('');
  }

  function removeTool(tag) {
    setForm((f) => ({ ...f, tools: f.tools.filter((t) => t !== tag) }));
  }

  function addContribution() {
    setForm((f) => ({ ...f, contributions: [...f.contributions, ''] }));
  }

  function setContribution(index, value) {
    setForm((f) => { const next = [...f.contributions]; next[index] = value; return { ...f, contributions: next }; });
  }

  function removeContribution(index) {
    setForm((f) => ({ ...f, contributions: f.contributions.filter((_, i) => i !== index) }));
  }

  async function handleGenerateMethodology() {
    setBusy(true);
    setError('');
    try {
      const data = await postJson('/api/research/generate-methodology', {
        researchType: form.research_type,
        dataSource: form.data_source,
        tools: form.tools,
        experimentDescription: form.experiment_description
      });
      setField('generated_methodology', data.methodology);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label="Methodology">
        <div className="modal-header">
          <h2>Methodology</h2>
          <button className="secondary icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="modal-body">
          {error && <p className="error-banner">{error}</p>}

          <div className="modal-field-group">
            <span className="modal-field-label">Research Type</span>
            <div className="radio-group">
              {RESEARCH_TYPES.map((type) => (
                <label key={type} className="radio-label">
                  <input
                    type="radio"
                    name="research_type"
                    value={type}
                    checked={form.research_type === type}
                    onChange={() => setField('research_type', type)}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          <hr className="rp-divider" />

          <label>
            Data Source
            <input value={form.data_source} onChange={(e) => setField('data_source', e.target.value)} placeholder="e.g. Public datasets, Lab experiments, Industry data" />
          </label>

          <div className="modal-field-group">
            <span className="modal-field-label">Tools</span>
            <div className="keyword-input-row">
              <input
                value={toolInput}
                onChange={(e) => setToolInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTool(); } }}
                placeholder="Type a tool and press Enter"
              />
              <button className="secondary" type="button" onClick={addTool}>Add</button>
            </div>
            {form.tools.length > 0 && (
              <div className="keyword-tags">
                {form.tools.map((tag) => (
                  <span key={tag} className="keyword-tag">
                    {tag}
                    <button type="button" onClick={() => removeTool(tag)} aria-label={`Remove ${tag}`}>
                      <X size={12} aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <hr className="rp-divider" />

          <label>
            Experiment Description
            <textarea
              value={form.experiment_description}
              onChange={(e) => setField('experiment_description', e.target.value)}
              placeholder="Describe the experiment design, steps, variables, and expected process..."
              style={{ minHeight: '130px' }}
            />
          </label>

          <hr className="rp-divider" />

          <button className="llm-help-button" type="button" disabled={!form.experiment_description.trim() || busy} onClick={handleGenerateMethodology}>
            {busy ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
            Generate Methodology
          </button>

          {form.generated_methodology && (
            <div className="rp-motivation-box">
              <span className="rp-motivation-label">Generated Methodology</span>
              <p>{form.generated_methodology}</p>
            </div>
          )}

          <div className="modal-objectives">
            <div className="modal-objectives-header">
              <span>Expected Contributions</span>
              <button className="secondary" type="button" onClick={addContribution}>
                <Plus size={15} aria-hidden="true" />
                Add Contribution
              </button>
            </div>
            {form.contributions.map((c, index) => (
              <div className="objective-row" key={index}>
                <div className="contribution-number">{index + 1}.</div>
                <input value={c} onChange={(e) => setContribution(index, e.target.value)} placeholder={`Contribution ${index + 1}`} />
                <button className="secondary icon-button" type="button" disabled={form.contributions.length === 1} onClick={() => removeContribution(index)} aria-label="Remove">
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="primary" type="button" onClick={() => onSave(form)}>Save</button>
        </div>
      </div>
    </div>
  );
}

const EMPTY_RESEARCH_PROBLEM = { problem_description: '', motivation: '', primary_question: '', hypotheses: [''] };

function ResearchProblemModal({ onSave, onClose, initialData }) {
  const [form, setForm] = useState(initialData || EMPTY_RESEARCH_PROBLEM);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function callAction(action, bodyExtra = {}) {
    setBusy(action);
    setError('');
    try {
      const body = { problemDescription: form.problem_description, primaryQuestion: form.primary_question, ...bodyExtra };
      const data = await postJson(`/api/research/${action}`, body);
      if (action === 'enhance-problem') setForm((f) => ({ ...f, problem_description: data.problemDescription }));
      if (action === 'motivation') setForm((f) => ({ ...f, motivation: data.motivation }));
      if (action === 'suggest-question') setForm((f) => ({ ...f, primary_question: data.primaryQuestion }));
      if (action === 'suggest-hypotheses') setForm((f) => ({ ...f, hypotheses: [...f.hypotheses.filter(h => h.trim()), ...data.hypotheses] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy('');
    }
  }

  function setHypothesis(index, value) {
    setForm((f) => { const next = [...f.hypotheses]; next[index] = value; return { ...f, hypotheses: next }; });
  }

  function addHypothesis() {
    setForm((f) => ({ ...f, hypotheses: [...f.hypotheses, ''] }));
  }

  function removeHypothesis(index) {
    setForm((f) => ({ ...f, hypotheses: f.hypotheses.filter((_, i) => i !== index) }));
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label="Research Problem and Questions">
        <div className="modal-header">
          <h2>Research Problem and Questions</h2>
          <button className="secondary icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="modal-body">
          {error && <p className="error-banner">{error}</p>}

          <label>
            Describe the research problem
            <textarea
              value={form.problem_description}
              onChange={(e) => setForm((f) => ({ ...f, problem_description: e.target.value }))}
              placeholder="Example: Current serverless platforms experience inefficient resource allocation due to lack of workload-aware scheduling, resulting in high cold-start latency and wasted compute resources..."
              style={{ minHeight: '130px' }}
            />
          </label>

          <div className="rp-action-row">
            <button className="secondary" type="button" disabled={!form.problem_description.trim() || !!busy} onClick={() => callAction('enhance-problem')}>
              {busy === 'enhance-problem' ? <Loader2 className="spin" size={15} aria-hidden="true" /> : <Wand2 size={15} aria-hidden="true" />}
              Enhance Problem Statement
            </button>
            <button className="secondary" type="button" disabled={!form.problem_description.trim() || !!busy} onClick={() => callAction('motivation')}>
              {busy === 'motivation' ? <Loader2 className="spin" size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
              Generate Motivation
            </button>
          </div>

          {form.motivation && (
            <div className="rp-motivation-box">
              <span className="rp-motivation-label">Generated Motivation</span>
              <p>{form.motivation}</p>
            </div>
          )}

          <label>
            Primary Research Question
            <input
              value={form.primary_question}
              onChange={(e) => setForm((f) => ({ ...f, primary_question: e.target.value }))}
              placeholder="e.g. How can workload-aware scheduling reduce cold-start latency in serverless platforms?"
            />
          </label>

          <div className="modal-objectives">
            <div className="modal-objectives-header">
              <span>Hypotheses</span>
              <button className="secondary" type="button" onClick={addHypothesis}>
                <Plus size={15} aria-hidden="true" />
                Add Hypothesis
              </button>
            </div>
            {form.hypotheses.map((h, index) => (
              <div className="objective-row" key={index}>
                <input value={h} onChange={(e) => setHypothesis(index, e.target.value)} placeholder={`Hypothesis ${index + 1}`} />
                <button className="secondary icon-button" type="button" disabled={form.hypotheses.length === 1} onClick={() => removeHypothesis(index)} aria-label="Remove">
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <hr className="rp-divider" />

          <div className="rp-action-row">
            <button className="secondary" type="button" disabled={!form.problem_description.trim() || !!busy} onClick={() => callAction('suggest-question')}>
              {busy === 'suggest-question' ? <Loader2 className="spin" size={15} aria-hidden="true" /> : <BotMessageSquare size={15} aria-hidden="true" />}
              Suggest Questions
            </button>
            <button className="secondary" type="button" disabled={!form.problem_description.trim() || !!busy} onClick={() => callAction('suggest-hypotheses')}>
              {busy === 'suggest-hypotheses' ? <Loader2 className="spin" size={15} aria-hidden="true" /> : <BotMessageSquare size={15} aria-hidden="true" />}
              Suggest Hypotheses
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button className="secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="primary" type="button" onClick={() => onSave({ problem_description: form.problem_description, motivation: form.motivation, hypotheses: form.hypotheses, primary_question: form.primary_question })}>Save</button>
        </div>
      </div>
    </div>
  );
}

function ProjectDetailsModal({ details, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    const merged = { ...EMPTY_PROJECT_DETAILS };
    Object.entries(details).forEach(([key, val]) => {
      if (val !== '' && val !== null && val !== undefined) merged[key] = val;
    });
    return merged;
  });
  const [llmHelping, setLlmHelping] = useState(false);
  const [llmError, setLlmError] = useState('');
  const [changedFields, setChangedFields] = useState(new Set());

  function handleChange(field, value) {
    setChangedFields((prev) => new Set([...prev, field]));
    setField(field, value);
  }

  function defaultStyle(field) {
    return changedFields.has(field) ? { color: '#202124' } : { color: '#aebfc6' };
  }

  async function handleLlmHelp() {
    const trimmed = form.rough_idea.trim();
    if (!trimmed) return;
    setLlmHelping(true);
    setLlmError('');
    try {
      const data = await postJson('/api/refine/title-intro', { roughIdea: trimmed });
      setForm((prev) => ({
        ...prev,
        research_title: data.research_title || prev.research_title,
        introduction: data.introduction || prev.introduction
      }));
    } catch (err) {
      setLlmError(err instanceof Error ? err.message : String(err));
    } finally {
      setLlmHelping(false);
    }
  }

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function setObjective(index, value) {
    setForm((current) => {
      const next = [...current.objectives];
      next[index] = value;
      return { ...current, objectives: next };
    });
  }

  function addObjective() {
    setForm((current) => ({ ...current, objectives: [...current.objectives, ''] }));
  }

  function removeObjective(index) {
    setForm((current) => ({
      ...current,
      objectives: current.objectives.filter((_, i) => i !== index)
    }));
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label="Project Details">
        <div className="modal-header">
          <h2>Project Details</h2>
          <button className="secondary icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="modal-body">
          <label>
            Rough Idea
            <input value={form.rough_idea} onChange={(e) => setField('rough_idea', e.target.value)} placeholder="e.g. Agent for citation-grounded literature review" />
          </label>

          <div className="modal-objectives">
            <div className="modal-objectives-header">
              <span>Objectives</span>
              <button className="secondary" type="button" onClick={addObjective}>
                <Plus size={15} aria-hidden="true" />
                Add
              </button>
            </div>
            {form.objectives.map((obj, index) => (
              <div className="objective-row" key={index}>
                <input
                  value={obj}
                  onChange={(e) => setObjective(index, e.target.value)}
                  placeholder={`Objective ${index + 1}`}
                />
                <button
                  className="secondary icon-button"
                  type="button"
                  disabled={form.objectives.length === 1}
                  onClick={() => removeObjective(index)}
                  aria-label="Remove objective"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <button
            className="llm-help-button"
            type="button"
            disabled={!form.rough_idea.trim() || llmHelping}
            onClick={handleLlmHelp}
          >
            {llmHelping ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <BotMessageSquare size={16} aria-hidden="true" />}
            LLM Generate
          </button>
          {llmError && <p className="error-banner">{llmError}</p>}

          <label>
            Research Project Title
            <input value={form.research_title} onChange={(e) => setField('research_title', e.target.value)} placeholder="e.g. Federated Learning for Privacy-Preserving Healthcare" />
          </label>

          <label>
            Objective
            <textarea value={form.introduction} onChange={(e) => setField('introduction', e.target.value)} placeholder="Brief objective of the research..." />
          </label>

          <div className="modal-grid">
            <label>
              Student Name
              <input style={defaultStyle('student_name')} value={form.student_name} onChange={(e) => handleChange('student_name', e.target.value)} placeholder="Jane Doe" />
            </label>
            <label>
              Supervisor
              <input style={defaultStyle('supervisor')} value={form.supervisor} onChange={(e) => handleChange('supervisor', e.target.value)} placeholder="Prof. John Smith" />
            </label>
            <label>
              University
              <input style={defaultStyle('university')} value={form.university} onChange={(e) => handleChange('university', e.target.value)} placeholder="UC Riverside" />
            </label>
            <label>
              Department
              <input style={defaultStyle('department')} value={form.department} onChange={(e) => handleChange('department', e.target.value)} placeholder="Computer Science" />
            </label>
          </div>

          <div className="modal-grid">
            <div className="modal-field-group">
              <span className="modal-field-label">Degree Program</span>
              <div className="radio-group">
                {['MS', 'PhD'].map((deg) => (
                  <label key={deg} className="radio-label">
                    <input
                      type="radio"
                      name="degree_program"
                      value={deg}
                      checked={form.degree_program === deg}
                      onChange={() => setField('degree_program', deg)}
                    />
                    {deg}
                  </label>
                ))}
              </div>
            </div>

            <div className="modal-field-group">
              <span className="modal-field-label">Research Area</span>
              <select
                className="modal-select"
                value={form.research_area}
                onChange={(e) => setField('research_area', e.target.value)}
              >
                {RESEARCH_AREAS.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-grid">
            <label>
              Budget
              <input value={form.budget} onChange={(e) => setField('budget', e.target.value)} placeholder="$500,000" />
            </label>
            <label>
              Timeline
              <input value={form.timeline} onChange={(e) => setField('timeline', e.target.value)} placeholder="6 months" />
            </label>
            <label>
              Team Size
              <input type="number" min="1" value={form.team_size} onChange={(e) => setField('team_size', e.target.value)} placeholder="5" />
            </label>
          </div>

        </div>

        <div className="modal-footer">
          <button className="secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="primary" type="button" onClick={() => onSave(form)}>Save Details</button>
        </div>
      </div>
    </div>
  );
}

function formatSavedAt(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'recently';
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default App;

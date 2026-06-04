import { useEffect, useMemo, useState } from 'react';
import {
  BotMessageSquare,
  CheckCircle2,
  ClipboardCheck,
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
  X
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

const RESEARCH_AREAS = ['AI/ML', 'Systems', 'Security', 'HCI', 'Networking', 'Databases', 'Theory', 'Bioinformatics', 'Other'];

const EMPTY_PROJECT_DETAILS = {
  rough_idea: '',
  research_title: '',
  introduction: '',
  student_name: '',
  university: '',
  department: '',
  supervisor: '',
  degree_program: 'MS',
  research_area: 'AI/ML',
  budget: '',
  timeline: '',
  team_size: '',
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
  const [generatePopupOpen, setGeneratePopupOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState({
    projectDetails: false, researchProblem: false, methodology: false,
    timeline: false, risks: false, references: false
  });

  function markComplete(key) {
    setCompletedSteps((prev) => ({ ...prev, [key]: true }));
  }

  const [proposalOutput, setProposalOutput] = useState({
    research_title: '', objective: '', motivation: '', hypothesis: '',
    methodology_text: '', tools: '', contributions: '',
    timeline_budget: '', risks_mitigation: '', references: ''
  });

  function updateOutput(fields) {
    setProposalOutput((prev) => ({ ...prev, ...fields }));
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

    if (!topicInput && !fieldSuggestions.length && !decisions.length && !result) {
      return;
    }

    saveMemory({ silent: true });
  }, [
    memoryReady,
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
      setRunLog((current) => [...current, logEntry('Memory', 'Saved workspace memory.')]);
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
      setTopicInput(snapshot.topicInput || '');
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
        setRunLog((current) => [...current, logEntry('Memory', 'Reloaded saved workspace memory.')]);
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

          <div className="proposal-output-section">
            <h2 className="proposal-output-heading">Research Proposal Draft</h2>
            <div className="proposal-output-grid">
              {[
                { label: '1a. Research Project Title', key: 'research_title',  full: false },
                { label: '1b. Objective',              key: 'objective',        full: false },
                { label: '2a. Problem Hypothesis',     key: 'hypothesis',       full: false },
                { label: '2b. Motivation',             key: 'motivation',       full: false },
                { label: '3a. Methodology',            key: 'methodology_text', full: true  },
                { label: '3b. Tools',                  key: 'tools',            full: false },
                { label: '3c. Contributions',          key: 'contributions',    full: false },
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

          {generatePopupOpen && (
            <GenerateFormatPopup
              result={result}
              pdfUrl={pdfUrl}
              status={status}
              onGenerate={generateProposal}
              onDownloadPdf={downloadPdf}
              onDownloadLatex={downloadLatex}
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
              onSave={(data) => {
                updateOutput({
                  motivation: data.motivation || '',
                  hypothesis: (data.hypotheses || []).filter(Boolean).map((h, i) => `${i + 1}. ${h}`).join('\n')
                });
                markComplete('researchProblem');
                setResearchProblemOpen(false);
              }}
              onClose={() => setResearchProblemOpen(false)}
            />
          )}
          {methodologyOpen && (
            <MethodologyModal
              onSave={(data) => {
                updateOutput({
                  methodology_text: data.generated_methodology || '',
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
              onSave={(data) => {
                const lines = (data.activities || []).map((a) => `${a.name}: ${a.months}`).join('\n');
                const budget = projectDetails.budget ? `\nBudget: ${projectDetails.budget}` : '';
                updateOutput({ timeline_budget: lines + budget });
                markComplete('timeline');
                setTimelineOpen(false);
              }}
              onClose={() => setTimelineOpen(false)}
            />
          )}
          {risksOpen && (
            <RisksModal
              onSave={(data) => {
                const text = (data.risks || []).map((r, i) =>
                  `${i + 1}. [${r.category}] ${r.description}\n   Likelihood: ${r.likelihood} | Impact: ${r.impact}\n   Mitigation: ${r.mitigation || 'N/A'}`
                ).join('\n\n');
                updateOutput({ risks_mitigation: text });
                markComplete('risks');
                setRisksOpen(false);
              }}
              onClose={() => setRisksOpen(false)}
            />
          )}
          {referencesOpen && (
            <ReferencesModal
              onSave={(data) => {
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

          <div className="memory-bar">
            <div>
              <strong>Memory</strong>
              <span>{memorySavedAt ? `Saved ${formatSavedAt(memorySavedAt)}` : 'No saved workspace yet'}</span>
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

function GenerateFormatPopup({ result, pdfUrl, status, onGenerate, onDownloadPdf, onDownloadLatex, onClose }) {
  const busy = status === 'drafting' || status === 'exporting';

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card gen-format-popup" role="dialog" aria-modal="true" aria-label="Generate Proposal">
        <div className="modal-header">
          <h2>Generate Proposal</h2>
          <button className="secondary icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="modal-body">
          <div className="gen-format-grid">
            <div className="gen-format-card">
              <FileText size={28} className="gen-format-icon" aria-hidden="true" />
              <strong>PDF</strong>
              <p>Compiled, print-ready PDF via LaTeX</p>
              <div className="gen-format-actions">
                <button className="primary" type="button" disabled={busy} onClick={onGenerate}>
                  {status === 'drafting' ? <Loader2 className="spin" size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
                  Generate
                </button>
                {pdfUrl && (
                  <>
                    <a className="secondary gen-format-btn" href={pdfUrl} target="_blank" rel="noreferrer">
                      <FileText size={15} aria-hidden="true" /> View
                    </a>
                    <button className="secondary" type="button" disabled={busy} onClick={onDownloadPdf}>
                      {status === 'exporting' ? <Loader2 className="spin" size={15} aria-hidden="true" /> : <Download size={15} aria-hidden="true" />}
                      Download
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="gen-format-card">
              <FileText size={28} className="gen-format-icon" aria-hidden="true" />
              <strong>LaTeX</strong>
              <p>Editable .tex source file for Overleaf or local compile</p>
              <div className="gen-format-actions">
                <button className="primary" type="button" disabled={busy} onClick={onGenerate}>
                  {status === 'drafting' ? <Loader2 className="spin" size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
                  Generate
                </button>
                {result?.proposalLatex && (
                  <button className="secondary" type="button" onClick={onDownloadLatex}>
                    <Download size={15} aria-hidden="true" /> Download .tex
                  </button>
                )}
              </div>
            </div>
          </div>

          {!result && (
            <p className="gen-format-hint">Click Generate to compile the proposal from your draft fields. PDF requires Tectonic to be installed.</p>
          )}
        </div>

        <div className="modal-footer">
          <button className="secondary" type="button" onClick={onClose}>Close</button>
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

const CITATION_STYLES = ['APA', 'IEEE', 'ACM'];

function ReferencesModal({ onSave, onClose }) {
  const [citationStyle, setCitationStyle] = useState('APA');
  const [references, setReferences] = useState([{ id: 1, doi: '', bibtex: '' }]);
  const [formatted, setFormatted] = useState('');
  const [report, setReport] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  function addReference() {
    setReferences((prev) => [...prev, { id: Date.now(), doi: '', bibtex: '' }]);
  }

  function setRefField(id, field, value) {
    setReferences((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  }

  function removeReference(id) {
    setReferences((prev) => prev.length > 1 ? prev.filter((r) => r.id !== id) : prev);
  }

  async function handleAction(action) {
    const filled = references.filter((r) => r.doi.trim() || r.bibtex.trim());
    if (!filled.length) { setError('Add at least one DOI or BibTeX entry.'); return; }
    setBusy(action);
    setError('');
    try {
      if (action === 'generate') {
        const data = await postJson('/api/research/generate-references', { citationStyle, references });
        setFormatted(data.formatted);
        setReport('');
      } else {
        const data = await postJson('/api/research/validate-citations', { citationStyle, references });
        setReport(data.report);
        setFormatted('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy('');
    }
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
            <span className="modal-field-label">Citation Style</span>
            <div className="radio-group">
              {CITATION_STYLES.map((style) => (
                <label key={style} className="radio-label">
                  <input type="radio" name="citation_style" value={style} checked={citationStyle === style} onChange={() => setCitationStyle(style)} />
                  {style}
                </label>
              ))}
            </div>
          </div>

          <hr className="rp-divider" />

          <div className="ref-list">
            {references.map((ref, index) => (
              <div key={ref.id} className="ref-entry">
                <div className="ref-entry-header">
                  <span className="modal-field-label">Reference {index + 1}</span>
                  {references.length > 1 && (
                    <button className="secondary icon-button" type="button" onClick={() => removeReference(ref.id)} aria-label="Remove reference">
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
                <label>
                  DOI
                  <input value={ref.doi} onChange={(e) => setRefField(ref.id, 'doi', e.target.value)} placeholder="e.g. 10.1145/3292500.3330701" />
                </label>
                <div className="ref-or-divider"><span>OR</span></div>
                <label>
                  BibTeX
                  <textarea
                    value={ref.bibtex}
                    onChange={(e) => setRefField(ref.id, 'bibtex', e.target.value)}
                    placeholder={'@article{key,\n  author={...},\n  title={...},\n  year={2024}\n}'}
                    style={{ minHeight: '90px', fontFamily: 'monospace', fontSize: '0.85rem' }}
                  />
                </label>
              </div>
            ))}
          </div>

          <button className="llm-help-button" type="button" onClick={addReference}>
            <Plus size={16} aria-hidden="true" />
            Add Reference
          </button>

          <hr className="rp-divider" />

          <div className="rp-action-row">
            <button className="secondary" type="button" disabled={!!busy} onClick={() => handleAction('generate')}>
              {busy === 'generate' ? <Loader2 className="spin" size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
              Generate References
            </button>
            <button className="secondary" type="button" disabled={!!busy} onClick={() => handleAction('validate')}>
              {busy === 'validate' ? <Loader2 className="spin" size={15} aria-hidden="true" /> : <CheckCircle2 size={15} aria-hidden="true" />}
              Validate Citations
            </button>
          </div>

          {formatted && (
            <div className="rp-motivation-box">
              <span className="rp-motivation-label">Formatted References ({citationStyle})</span>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{formatted}</pre>
            </div>
          )}

          {report && (
            <div className="rp-motivation-box">
              <span className="rp-motivation-label">Validation Report</span>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{report}</pre>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="primary" type="button" onClick={() => onSave({ formatted, citationStyle, references })}>Save</button>
        </div>
      </div>
    </div>
  );
}

const RISK_CATEGORIES = ['Technical', 'Data Availability', 'Ethical', 'Financial', 'Resource', 'Timeline', 'Regulatory', 'Other'];
const LIKELIHOOD_OPTIONS = ['Low', 'Medium', 'High'];
const IMPACT_OPTIONS = ['Low', 'Medium', 'High'];

const EMPTY_RISK = { id: 0, category: 'Technical', description: '', likelihood: 'Low', impact: 'Medium', mitigation: '' };

function RisksModal({ onSave, onClose }) {
  const [savedRisks, setSavedRisks] = useState([]);
  const [form, setForm] = useState({ ...EMPTY_RISK, id: 1 });
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
  { name: 'Literature Review', months: 'Month 1-3' },
  { name: 'Implementation', months: 'Month 4-10' },
  { name: 'Experiments', months: 'Month 11-18' },
  { name: 'Writing', months: 'Month 19-24' }
];

function TimelineModal({ onSave, onClose }) {
  const [duration, setDuration] = useState(24);
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);
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
              <span className="timeline-months-label">Months</span>
            </div>
          </div>

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
                  placeholder="Month X-Y"
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
          <button className="primary" type="button" onClick={() => onSave({ activities, duration })}>Save</button>
        </div>
      </div>
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

function MethodologyModal({ onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_METHODOLOGY);
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
          <button className="primary" type="button" onClick={() => onSave({ generated_methodology: form.generated_methodology, tools: form.tools, contributions: form.contributions })}>Save</button>
        </div>
      </div>
    </div>
  );
}

const EMPTY_RESEARCH_PROBLEM = { problem_description: '', motivation: '', primary_question: '', hypotheses: [''] };

function ResearchProblemModal({ onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_RESEARCH_PROBLEM);
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
          <button className="primary" type="button" onClick={() => onSave({ motivation: form.motivation, hypotheses: form.hypotheses, primary_question: form.primary_question })}>Save</button>
        </div>
      </div>
    </div>
  );
}

function ProjectDetailsModal({ details, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_PROJECT_DETAILS, ...details });
  const [llmHelping, setLlmHelping] = useState(false);
  const [llmError, setLlmError] = useState('');

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
            LLM Help
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
              <input value={form.student_name} onChange={(e) => setField('student_name', e.target.value)} placeholder="Jane Doe" />
            </label>
            <label>
              Supervisor
              <input value={form.supervisor} onChange={(e) => setField('supervisor', e.target.value)} placeholder="Prof. John Smith" />
            </label>
            <label>
              University
              <input value={form.university} onChange={(e) => setField('university', e.target.value)} placeholder="UC Riverside" />
            </label>
            <label>
              Department
              <input value={form.department} onChange={(e) => setField('department', e.target.value)} placeholder="Computer Science" />
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

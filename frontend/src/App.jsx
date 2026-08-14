import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';

const Icon = ({ name, size = 18 }) => {
  const paths = {
    mark: <><path d="M5 19V8l7-4 7 4v8l-7 4-4-2.3V11l4-2.2 4 2.2v3l-4 2.2"/></>,
    planner: <><path d="M4 5h16M4 12h10M4 19h7"/><circle cx="18" cy="12" r="2"/><circle cx="15" cy="19" r="2"/></>,
    research: <><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5M7 10h6M10 7v6"/></>,
    technical: <><path d="M8 4 3 9l5 5M16 4l5 5-5 5M14 2l-4 18"/></>,
    cost: <><path d="M12 3v18M17 7.5c0-2-2-3.5-5-3.5S7 5.4 7 7.5 9 11 12 11s5 1.4 5 3.5S15 18 12 18s-5-1.5-5-3.5"/></>,
    fact: <><path d="m9 12 2 2 4-5"/><path d="M12 3 4.5 6v5c0 4.6 3.1 8.3 7.5 10 4.4-1.7 7.5-5.4 7.5-10V6z"/></>,
    report: <><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
    external: <><path d="M15 4h5v5M20 4l-9 9"/><path d="M18 13v6H5V6h6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
};

const AGENTS = [
  { id:'planner', name:'Planner', role:'Research decomposition', tone:'amber', detail:'Transforms the question into focused research subtasks.', capability:'Creates the investigation plan that coordinates the three specialist branches.' },
  { id:'research', name:'Research', role:'Candidate discovery', tone:'emerald', detail:'Finds relevant models, tools, and source-backed candidates.', capability:'Runs a dedicated Tavily research search before analyzing candidate approaches.' },
  { id:'technical', name:'Technical', role:'Specification analysis', tone:'violet', detail:'Examines parameters, context, VRAM, quantization, and frameworks.', capability:'Runs independently alongside Research and Cost & Performance.' },
  { id:'cost', name:'Cost & Performance', role:'Hardware fit', tone:'coral', detail:'Evaluates performance, hardware fit, and estimate quality.', capability:'Separates explicitly supported facts from performance estimates.' },
  { id:'fact', name:'Fact Checker', role:'Evidence verification', tone:'rose', detail:'Compares specialist claims for agreement and conflict.', capability:'Receives the merged output of all three specialist agents.' },
  { id:'report', name:'Final Report', role:'Verified synthesis', tone:'teal', detail:'Builds the final report from verified findings.', capability:'Returns the Markdown research document shown in this workspace.' },
];

const markdownComponents = {
  h2: ({ children }) => <h2 className="document-section"><span>{children}</span></h2>,
  h3: ({ children }) => <h3>{children}</h3>,
  a: ({ children, ...props }) => <a {...props} target="_blank" rel="noreferrer">{children}<Icon name="external" size={13}/></a>,
  table: ({ children }) => <div className="table-wrap"><table>{children}</table></div>,
  blockquote: ({ children }) => <blockquote><span className="callout-label">Verified insight</span>{children}</blockquote>,
};

function Pipeline({ state, activeAgent, onSelect }) {
  const Node = ({ id, label, icon }) => {
    const agent = AGENTS.find((item) => item.id === id);
    return <button className={`pipe-node ${agent.tone} ${activeAgent === id ? 'selected' : ''} ${state}`} onClick={() => onSelect(id)}><Icon name={icon}/><span>{label}</span><i/></button>;
  };
  return <section className="pipeline" aria-label="Research workflow">
    <div className="pipeline-title"><span>Execution map</span><small>Actual workflow topology</small></div>
    <div className="flow-map">
      <Node id="planner" label="Planner" icon="planner"/><span className="flow-line one"/>
      <div className="branch-line"><i/><i/><i/></div>
      <div className="parallel-nodes"><Node id="research" label="Research" icon="research"/><Node id="technical" label="Technical" icon="technical"/><Node id="cost" label="Cost / Performance" icon="cost"/></div>
      <div className="merge-line"><i/><i/><i/></div><span className="merge-label">merge</span>
      <Node id="fact" label="Fact Checker" icon="fact"/><span className="flow-line two"/><Node id="report" label="Final Report" icon="report"/>
    </div>
  </section>;
}

function AgentRail({ activeAgent, onSelect, state }) {
  return <aside className="agent-rail"><div className="rail-label">Research agents <span>6</span></div>{AGENTS.map((agent) => <button key={agent.id} className={`agent-tab ${agent.tone} ${activeAgent === agent.id ? 'active' : ''}`} onClick={() => onSelect(agent.id)} aria-pressed={activeAgent === agent.id}>
    <span className="agent-glyph"><Icon name={agent.id}/></span><span className="agent-copy"><strong>{agent.name}</strong><small>{agent.role}</small></span>
    <span className={`agent-state ${state}`}>{state === 'complete' ? <Icon name="check" size={13}/> : <i/>}</span>
  </button>)}</aside>;
}

function AgentWorkspace({ agent, state, question, report }) {
  const stateLabel = state === 'complete' ? 'Completed' : state === 'running' ? 'In workflow' : 'Ready';
  return <section className={`agent-workspace ${agent.tone}`}>
    <header className="workspace-header"><div className="workspace-ident"><span className="workspace-icon"><Icon name={agent.id} size={22}/></span><div><small>{agent.role}</small><h2>{agent.name}</h2></div></div><span className={`workspace-state ${state}`}><i/>{stateLabel}</span></header>
    <div className="workspace-body">
      {agent.id === 'planner' && <div className="planner-view"><span className="micro-label">Research question</span><p className="workspace-question">{question || 'Your research question will appear here.'}</p><div className="task-path"><span/><div><b>01</b><p>Interpret the question and constraints</p></div><div><b>02</b><p>Create focused investigation subtasks</p></div><div><b>03</b><p>Dispatch work to three specialist branches</p></div></div></div>}
      {agent.id === 'research' && <div className="discovery-view"><div className="workspace-statement"><span className="micro-label">Discovery scope</span><p>Candidate models, tools, approaches, and supporting web evidence.</p></div><div className="source-slots"><span>Candidate discovery</span><span>Source-backed findings</span><span>Relevance screening</span></div></div>}
      {agent.id === 'technical' && <div className="spec-view"><span className="micro-label">Analysis dimensions</span><div className="spec-grid"><span>Parameters</span><span>Context length</span><span>VRAM</span><span>Quantization</span><span>Frameworks</span><span>Architecture</span></div><p>{agent.capability}</p></div>}
      {agent.id === 'cost' && <div className="cost-view"><div className="signal-row confirmed"><b>✓</b><span><strong>Confirmed</strong> Explicitly source-supported</span></div><div className="signal-row estimated"><b>≈</b><span><strong>Estimated</strong> Inferred performance or requirement</span></div><div className="signal-row unknown"><b>!</b><span><strong>Unknown</strong> Insufficient supporting evidence</span></div></div>}
      {agent.id === 'fact' && <div className="verification-view"><div className="agent-votes"><span className="emerald">Research<i>claim</i></span><span className="violet">Technical<i>claim</i></span><span className="coral">Cost<i>claim</i></span></div><div className="verdict-flow"><span>merged evidence</span><Icon name="arrow"/><strong>Agreement / conflict verdict</strong></div><p>No claim-level payload is exposed by the current API; verified conclusions appear in the final report.</p></div>}
      {agent.id === 'report' && <div className="report-preview"><div><span className="micro-label">Intelligence report</span><p>{report ? 'The verified report is ready below.' : 'Editorial synthesis begins after evidence verification.'}</p></div>{report && <a href="#final-report">Open report <Icon name="arrow" size={15}/></a>}</div>}
    </div>
    <footer className="workspace-footer"><span>Role in pipeline</span><p>{agent.capability}</p></footer>
  </section>;
}

function App() {
  const [question, setQuestion] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState('');
  const [error, setError] = useState('');
  const [activeAgent, setActiveAgent] = useState('planner');
  const state = report ? 'complete' : loading ? 'running' : 'ready';
  const selectedAgent = useMemo(() => AGENTS.find((agent) => agent.id === activeAgent), [activeAgent]);

  const handleResearch = async (event) => {
    event.preventDefault(); if (!question.trim()) return;
    setLoading(true); setError(''); setReport(''); setSubmittedQuestion(question.trim()); setActiveAgent('planner');
    try {
      const response = await fetch('http://localhost:3001/api/research', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({question}) });
      if (!response.ok) throw new Error('Research request failed');
      const data = await response.json(); setReport(data.report); setActiveAgent('report');
    } catch { setError('The research workflow could not complete. Please try again.'); }
    finally { setLoading(false); }
  };

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top"><span><Icon name="mark" size={21}/></span>Research OS</a><div className="system-status"><i/> Orchestrator available</div></header>
    <main id="top">
      <section className="command-center">
        <div className="command-copy"><span className="overline">Multi-agent research system</span><h1>Investigate complex questions.<br/><em>Verify every conclusion.</em></h1><p>One planner. Three parallel specialists. One evidence verification layer.</p></div>
        <form className="command-input" onSubmit={handleResearch}><span className="prompt-mark">⌁</span><input aria-label="Research question" value={question} onChange={(e)=>setQuestion(e.target.value)} placeholder="What do you want to research?" disabled={loading}/><button disabled={loading || !question.trim()}>{loading ? <><span className="spinner"/> Running</> : <>Run research <Icon name="arrow" size={16}/></>}</button></form>
      </section>

      {(submittedQuestion || error) && <section className="session-header"><div><span>Research session</span><h2>{submittedQuestion}</h2></div><div className={`session-state ${state}`}><i/>{state === 'complete' ? 'Research complete' : state === 'running' ? 'Workflow running' : 'Interrupted'}</div><dl><div><dt>Stages</dt><dd>6</dd></div><div><dt>Parallel specialists</dt><dd>3</dd></div><div><dt>Verification</dt><dd>{report ? 'Complete' : loading ? 'Pending' : '—'}</dd></div></dl></section>}
      {error && <div className="error" role="alert"><strong>Execution interrupted</strong>{error}</div>}

      <Pipeline state={state} activeAgent={activeAgent} onSelect={setActiveAgent}/>
      <div className="workspace-layout"><AgentRail activeAgent={activeAgent} onSelect={setActiveAgent} state={state}/><AgentWorkspace agent={selectedAgent} state={state} question={submittedQuestion || question} report={report}/></div>

      {report && <article className="report" id="final-report"><aside className="report-aside"><span>Final intelligence</span><strong>Verified research</strong><p>Generated after specialist merge and fact checking.</p></aside><div className="report-document"><header><span>Final research report</span><h2>{submittedQuestion}</h2><div><b><Icon name="check" size={13}/> Fact checked</b><small>Multi-agent synthesis</small></div></header><div className="report-content"><ReactMarkdown components={markdownComponents}>{report}</ReactMarkdown></div></div></article>}
    </main>
    <footer className="site-footer"><span>Research OS</span><span>Planner → parallel investigation → verification → report</span></footer>
  </div>;
}

export default App;

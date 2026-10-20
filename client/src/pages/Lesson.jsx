import Editor from '@monaco-editor/react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ErrorBox, Spinner } from '../components/Bits.jsx';
import { ExploitIdor, ExploitSqli, ExploitXss, XssPreview } from '../components/Exploits.jsx';
import Markdown from '../components/Markdown.jsx';

function defineNeon(monaco) {
  monaco.editor.defineTheme('neon', {
    base: 'vs-dark', inherit: true,
    rules: [
      { token: 'comment', foreground: '6a5fa8', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff2bd6' },
      { token: 'string', foreground: 'fcee09' },
      { token: 'number', foreground: '39ff88' },
      { token: 'identifier', foreground: 'e6e1ff' },
    ],
    colors: {
      'editor.background': '#0a0818', 'editor.foreground': '#e6e1ff',
      'editorLineNumber.foreground': '#4a3f86', 'editorLineNumber.activeForeground': '#00f0ff',
      'editor.lineHighlightBackground': '#150f33', 'editorCursor.foreground': '#00f0ff',
      'editor.selectionBackground': '#ff2bd633',
    },
  });
}

function Rewards({ r }) {
  if (!r || r.alreadyCompleted) return null;
  return (
    <div className="reward" role="status">
      <strong>+{r.xpGained} XP</strong>
      {r.badges?.map((b) => <span key={b.slug} className="pill">Badge unlocked: {b.title}</span>)}
    </div>
  );
}

export default function Lesson() {
  const { id } = useParams();
  const { refresh } = useAuth();
  const [lesson, setLesson] = useState(null);
  const [code, setCode] = useState('');
  const [tab, setTab] = useState('exploit');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [reward, setReward] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setLesson(null); setResult(null); setReward(null); setErr(''); setTab('exploit');
    api(`/lessons/${id}`).then((l) => {
      setLesson(l);
      setCode(localStorage.getItem(`code:${l.id}`) ?? l.starter_code ?? '');
    }).catch((e) => setErr(e.message));
  }, [id]);

  const onCode = (v) => { const c = v ?? ''; setCode(c); if (lesson) localStorage.setItem(`code:${lesson.id}`, c); };

  async function complete() {
    setErr('');
    try {
      const r = await api(`/lessons/${id}/complete`, { method: 'POST' });
      setReward(r); setLesson({ ...lesson, completed: true }); refresh();
    } catch (e) { setErr(e.message); }
  }

  async function run() {
    setRunning(true); setErr(''); setResult(null);
    try {
      const r = await api(`/lessons/${id}/run`, { method: 'POST', body: { code } });
      setResult(r);
      if (r.rewards) { setReward(r.rewards); if (r.passed) setLesson((l) => ({ ...l, completed: true })); refresh(); }
    } catch (e) { setErr(e.message); } finally { setRunning(false); }
  }

  if (err && !lesson) return <ErrorBox>{err}</ErrorBox>;
  if (!lesson) return <Spinner />;

  const nextLink = lesson.next_id
    ? <Link className="btn" to={`/lessons/${lesson.next_id}`}>Next lesson</Link>
    : <Link className="btn" to={`/modules/${lesson.module_slug}`}>Back to module</Link>;
  const key = lesson.challenge_key;

  if (lesson.kind === 'reading') {
    return (
      <>
        <Link to={`/modules/${lesson.module_slug}`} className="back">{lesson.module_title}</Link>
        <div className="panel read"><Markdown>{lesson.content_md}</Markdown></div>
        <ErrorBox>{err}</ErrorBox>
        <Rewards r={reward} />
        <div className="row">
          {!lesson.completed && <button className="btn" onClick={complete}>Mark complete (+10 XP)</button>}
          {lesson.completed && nextLink}
        </div>
      </>
    );
  }

  return (
    <>
      <Link to={`/modules/${lesson.module_slug}`} className="back">{lesson.module_title}</Link>
      <div className="lab">
        <div className="panel brief"><Markdown>{lesson.content_md}</Markdown></div>
        <div className="panel work">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'exploit'} className={tab === 'exploit' ? 'on' : ''} onClick={() => setTab('exploit')}>1. Exploit</button>
            <button role="tab" aria-selected={tab === 'patch'} className={tab === 'patch' ? 'on' : ''} onClick={() => setTab('patch')}>2. Patch</button>
          </div>

          {tab === 'exploit' && (
            <>
              {key === 'sqli' && <ExploitSqli />}
              {key === 'idor' && <ExploitIdor />}
              {key === 'xss' && <ExploitXss />}
              <button className="ghost" onClick={() => setTab('patch')}>I broke it, now patch it</button>
            </>
          )}

          {tab === 'patch' && (
            <>
              <div className="editor">
                <Editor height="340px" language={lesson.language} value={code} onChange={onCode}
                  theme="neon" beforeMount={defineNeon} loading={<Spinner label="Loading editor…" />}
                  options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: "'JetBrains Mono', monospace", scrollBeyondLastLine: false, tabSize: 4, padding: { top: 12 }, ariaLabel: 'Code editor' }} />
              </div>
              <div className="row">
                <button className="btn" onClick={run} disabled={running}>{running ? 'Running in sandbox…' : 'Run tests'}</button>
                <button className="ghost" onClick={() => { if (confirm('Reset to the vulnerable starter code?')) onCode(lesson.starter_code); }}>Reset code</button>
              </div>
              {key === 'xss' && <XssPreview code={code} />}
              <ErrorBox>{err}</ErrorBox>
              <Rewards r={reward} />
              {result?.error && <ErrorBox>{result.error}</ErrorBox>}
              {result?.tests && (
                <ul className="tests" aria-label="Test results">
                  {result.tests.map((t, i) => (
                    <li key={i} className={t.passed ? 'pass' : 'fail'}>
                      <span className="mark">{t.passed ? 'PASS' : 'FAIL'}</span>
                      <div><div>{t.name}</div>{!t.passed && (t.hint || t.error) && <div className="hint">{t.error ? `${t.error}. ` : ''}{t.hint}</div>}</div>
                    </li>
                  ))}
                </ul>
              )}
              {result?.output && <details><summary>Program output</summary><pre>{result.output}</pre></details>}
              {result?.passed && <div className="row"><div className="result ok"><strong>All tests passed. The exploit no longer works.</strong></div>{nextLink}</div>}
              {!result && lesson.completed && <div className="row">{nextLink}</div>}
            </>
          )}
        </div>
      </div>
    </>
  );
}

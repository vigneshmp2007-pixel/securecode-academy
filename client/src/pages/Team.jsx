import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ErrorBox, Progress, Spinner } from '../components/Bits.jsx';

export default function Team() {
  const { refresh } = useAuth();
  const [data, setData] = useState(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  const load = () => api('/team').then(setData).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function join(e) {
    e.preventDefault(); setErr('');
    try { await api('/team/join', { method: 'POST', body: { inviteCode: code } }); await refresh(); await load(); }
    catch (e2) { setErr(e2.message); }
  }

  if (!data) return err ? <ErrorBox>{err}</ErrorBox> : <Spinner />;

  if (!data.team) {
    return (
      <form className="panel narrow" onSubmit={join}>
        <h2>Join a team</h2>
        <p className="muted">Ask your manager for an invite code to share your progress with them.</p>
        <label>Invite code<input value={code} onChange={(e) => setCode(e.target.value)} placeholder="A1B2C3D4" required /></label>
        <ErrorBox>{err}</ErrorBox>
        <button className="btn">Join team</button>
      </form>
    );
  }

  const { team, members, isManager, averageCompletion } = data;
  return (
    <>
      <h1 className="h-page">{team.name}</h1>
      <section className="hud">
        <div className="panel"><h2>Average completion</h2><div className="big green">{averageCompletion}%</div><Progress value={averageCompletion} color="green" /><p className="muted">Across developers on the team.</p></div>
        <div className="panel"><h2>Members</h2><div className="big">{members.length}</div><p className="muted">{members.filter((m) => m.role === 'developer').length} developers</p></div>
        {isManager && (
          <div className="panel">
            <h2>Invite code</h2>
            <div className="big code">{team.inviteCode}</div>
            <button className="ghost" onClick={() => { navigator.clipboard?.writeText(team.inviteCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'Copied' : 'Copy code'}</button>
          </div>
        )}
      </section>

      <div className="panel scroll">
        <table className="tbl">
          <thead><tr><th>Name</th>{isManager && <th>Email</th>}<th>Role</th><th>Level</th><th>XP</th><th>Streak</th><th>Badges</th><th className="wide">Completion</th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>{isManager && <td>{m.email}</td>}<td>{m.role}</td><td>{m.level}</td><td>{m.xp}</td><td>{m.streak}d</td><td>{m.badges}</td>
                <td><div className="cell"><Progress value={m.completion} /><span>{m.completion}%</span></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

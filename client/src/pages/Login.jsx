import { useState } from 'react';
import { useAuth } from '../auth.jsx';
import { ErrorBox } from '../components/Bits.jsx';

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'developer', teamName: '', inviteCode: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (mode === 'login') await login(f.email, f.password);
      else await register(f);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  return (
    <div className="auth">
      <section className="hero">
        <p className="kicker">Break it. Understand it. Patch it.</p>
        <h1 className="glitch" data-text="SecureCode Academy">SecureCode Academy</h1>
        <p className="lead">Most developers learn to make code work, not make it safe. Exploit a real flaw in a sandbox, then rewrite the code until the attack fails.</p>
        <pre className="term" aria-hidden="true">{`$ login --user admin --pass "' OR 1=1 --"
> ACCESS GRANTED   (you should not see this)
$ patch --use parameterized-queries
> 6/6 tests passed   +50 XP`}</pre>
      </section>

      <form className="panel auth-card" onSubmit={submit}>
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>Sign in</button>
          <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'on' : ''} onClick={() => setMode('register')}>Create account</button>
        </div>

        {mode === 'register' && (
          <>
            <label>Name<input value={f.name} onChange={set('name')} autoComplete="name" required /></label>
            <label>Role
              <select value={f.role} onChange={set('role')}>
                <option value="developer">Developer</option>
                <option value="manager">Manager (invite and track a team)</option>
              </select>
            </label>
            {f.role === 'manager'
              ? <label>Team name<input value={f.teamName} onChange={set('teamName')} required /></label>
              : <label>Team invite code (optional)<input value={f.inviteCode} onChange={set('inviteCode')} placeholder="A1B2C3D4" /></label>}
          </>
        )}
        <label>Email<input type="email" value={f.email} onChange={set('email')} autoComplete="email" required /></label>
        <label>Password<input type="password" value={f.password} onChange={set('password')} minLength={mode === 'register' ? 8 : undefined} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>
        <ErrorBox>{err}</ErrorBox>
        <button className="btn" disabled={busy}>{busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
    </div>
  );
}

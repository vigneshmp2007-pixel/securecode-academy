import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { BadgeHex, ErrorBox, Progress, Spinner } from '../components/Bits.jsx';

export default function Dashboard() {
  const { me, refresh } = useAuth();
  const [tracks, setTracks] = useState(null);
  const [board, setBoard] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    refresh();
    Promise.all([api('/tracks'), api('/leaderboard')])
      .then(([t, b]) => { setTracks(t); setBoard(b); })
      .catch((e) => setErr(e.message));
  }, [refresh]);

  const { user, badges, stats } = me;
  const pct = stats.total ? Math.round((100 * stats.done) / stats.total) : 0;

  return (
    <>
      <section className="hud">
        <div className="panel">
          <h2>Operator {user.name.split(' ')[0]}</h2>
          <div className="big">Level {user.level}</div>
          <Progress value={user.xpIntoLevel} color="magenta" />
          <p className="muted">{user.xpIntoLevel}/100 XP to level {user.level + 1}. {user.xp} XP total.</p>
        </div>
        <div className="panel">
          <h2>Streak</h2>
          <div className="big yellow">{user.streak} {user.streak === 1 ? 'day' : 'days'}</div>
          <p className="muted">Complete one lesson a day to keep it alive.</p>
        </div>
        <div className="panel">
          <h2>Curriculum</h2>
          <div className="big green">{pct}%</div>
          <Progress value={pct} color="green" />
          <p className="muted">{stats.done} of {stats.total} lessons complete.</p>
        </div>
      </section>

      <ErrorBox>{err}</ErrorBox>
      {!tracks && !err && <Spinner />}
      {tracks?.map((t) => (
        <section key={t.id} className="block">
          <h2 className="h-sec">{t.title}</h2>
          <p className="muted">{t.description}</p>
          <div className="grid">
            {t.modules.map((m) => {
              const p = m.total ? Math.round((100 * m.done) / m.total) : 0;
              return (
                <Link key={m.id} to={`/modules/${m.slug}`} className="panel module">
                  <h3>{m.title}</h3>
                  <p>{m.description}</p>
                  <Progress value={p} />
                  <span className="muted">{m.done}/{m.total} lessons{p === 100 ? ', cleared' : ''}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      <section className="block">
        <h2 className="h-sec">Badges</h2>
        <div className="badges">{badges.map((b) => <BadgeHex key={b.slug} badge={b} locked={!b.earned_at} />)}</div>
      </section>

      <section className="block">
        <h2 className="h-sec">Top operators</h2>
        <div className="panel">
          <table className="tbl">
            <thead><tr><th>#</th><th>Name</th><th>Level</th><th>XP</th><th>Streak</th></tr></thead>
            <tbody>{board.map((r, i) => <tr key={i}><td>{i + 1}</td><td>{r.name}</td><td>{r.level}</td><td>{r.xp}</td><td>{r.streak}d</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}

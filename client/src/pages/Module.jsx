import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { BadgeHex, ErrorBox, Spinner } from '../components/Bits.jsx';

export default function Module() {
  const { slug } = useParams();
  const [m, setM] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { setM(null); api(`/modules/${slug}`).then(setM).catch((e) => setErr(e.message)); }, [slug]);

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!m) return <Spinner />;
  const all = m.lessons.every((l) => l.completed);
  return (
    <>
      <Link to="/" className="back">Back to missions</Link>
      <h1 className="h-page">{m.title}</h1>
      <p className="lead">{m.description}</p>
      <div className="split">
        <div className="panel">
          <ul className="lessons">
            {m.lessons.map((l) => (
              <li key={l.id}>
                <Link to={`/lessons/${l.id}`}>
                  <span className={`dot ${l.completed ? 'done' : ''}`} aria-label={l.completed ? 'Completed' : 'Not completed'} />
                  <span className="lt">{l.title}</span>
                  <span className={`tag ${l.kind}`}>{l.kind === 'challenge' ? 'Challenge' : 'Reading'}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        {m.badge && (
          <div className="panel center">
            <BadgeHex badge={m.badge} locked={!all} />
            <p className="muted">{all ? 'Module cleared. Badge unlocked.' : 'Complete every lesson to unlock this badge.'}</p>
          </div>
        )}
      </div>
    </>
  );
}

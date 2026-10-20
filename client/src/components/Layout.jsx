import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <>
      <header className="topbar">
        <NavLink to="/" className="logo" aria-label="SecureCode Academy home">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3l11 4.5v8.5c0 6.5-4.5 10.5-11 13C9.500 26.500 5 22.500 5 16V7.500z" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M11 16l3.500 3.500L21 12" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
          <span>SecureCode<b>//Academy</b></span>
        </NavLink>
        <nav className="links">
          <NavLink to="/" end>Missions</NavLink>
          <NavLink to="/team">Team</NavLink>
        </nav>
        <div className="chip" title={`${user.xp} XP total`}>
          <span className="lvl">LV {user.level}</span>
          <span className="xp-mini"><i style={{ width: `${user.xpIntoLevel}%` }} /></span>
          <span className="streak" title="Day streak">{user.streak}d</span>
        </div>
        <button className="ghost" onClick={() => { logout(); nav('/login'); }}>Sign out</button>
      </header>
      <main className="page">{children}</main>
    </>
  );
}

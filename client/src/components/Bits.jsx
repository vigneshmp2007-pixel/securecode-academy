export const Progress = ({ value, color = 'cyan' }) => (
  <div className={`bar ${color}`} role="progressbar" aria-valuenow={value} aria-valuemin="0" aria-valuemax="100">
    <i style={{ width: `${value}%` }} />
  </div>
);

export const BadgeHex = ({ badge, locked }) => (
  <div className={`badge ${locked ? 'locked' : ''}`} title={badge.description}>
    <div className="hex"><span>{badge.icon}</span></div>
    <div className="bt">{badge.title}</div>
    <div className="bd">{locked ? 'Locked' : 'Earned'}</div>
  </div>
);

export const Spinner = ({ label = 'Loading…' }) => <div className="boot">{label}</div>;
export const ErrorBox = ({ children }) => (children ? <div className="error" role="alert">{children}</div> : null);

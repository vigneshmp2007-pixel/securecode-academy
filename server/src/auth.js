import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { levelFor } from './gamify.js';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}
const SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const sign = (u) => jwt.sign({ sub: u.id }, SECRET, { expiresIn: '7d' });

export function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
  try {
    const { sub } = jwt.verify(token, SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(sub);
    if (!user) return res.status(401).json({ error: 'Account not found. Sign in again.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Sign in again.' });
  }
}

export function buildMe(userId) {
  const u = db.prepare('SELECT id,name,email,role,team_id,xp,streak FROM users WHERE id=?').get(userId);
  const badges = db.prepare(`SELECT b.slug,b.title,b.description,b.icon,ub.earned_at
    FROM badges b LEFT JOIN user_badges ub ON ub.badge_slug=b.slug AND ub.user_id=? ORDER BY b.rowid`).all(userId);
  const total = db.prepare('SELECT COUNT(*) c FROM lessons').get().c;
  const done = db.prepare('SELECT COUNT(*) c FROM progress WHERE user_id=?').get(userId).c;
  const team = u.team_id ? db.prepare('SELECT name FROM teams WHERE id=?').get(u.team_id) : null;
  return {
    user: { id: u.id, name: u.name, email: u.email, role: u.role, teamName: team?.name ?? null,
      xp: u.xp, level: levelFor(u.xp), xpIntoLevel: u.xp % 100, streak: u.streak },
    badges, stats: { done, total },
  };
}

export const authRouter = express.Router();

authRouter.post('/register', (req, res) => {
  const { name, email, password, role, teamName, inviteCode } = req.body ?? {};
  if (typeof name !== 'string' || name.trim().length < 2 || name.length > 60) return res.status(400).json({ error: 'Enter your name (2 to 60 characters).' });
  if (typeof email !== 'string' || !EMAIL_RE.test(email) || email.length > 120) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (typeof password !== 'string' || password.length < 8 || password.length > 100) return res.status(400).json({ error: 'Password must be 8 to 100 characters.' });
  if (!['developer', 'manager'].includes(role)) return res.status(400).json({ error: 'Choose a role.' });

  let teamId = null;
  if (role === 'manager') {
    if (typeof teamName !== 'string' || teamName.trim().length < 2) return res.status(400).json({ error: 'Managers must name their team.' });
  } else if (inviteCode) {
    const t = db.prepare('SELECT id FROM teams WHERE invite_code=?').get(String(inviteCode).trim().toUpperCase());
    if (!t) return res.status(400).json({ error: 'That invite code does not match a team.' });
    teamId = t.id;
  }

  try {
    const hash = bcrypt.hashSync(password, 12);
    const id = db.transaction(() => {
      if (role === 'manager') {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        teamId = db.prepare('INSERT INTO teams (name, invite_code) VALUES (?, ?)').run(teamName.trim().slice(0, 60), code).lastInsertRowid;
      }
      return db.prepare('INSERT INTO users (name,email,password_hash,role,team_id) VALUES (?,?,?,?,?)')
        .run(name.trim(), email.trim().toLowerCase(), hash, role, teamId).lastInsertRowid;
    })();
    res.status(201).json({ token: sign({ id: Number(id) }), ...buildMe(Number(id)) });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'An account with that email already exists. Sign in instead.' });
    throw e;
  }
});

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body ?? {};
  const u = typeof email === 'string' ? db.prepare('SELECT * FROM users WHERE email=?').get(email.trim().toLowerCase()) : null;
  // Same message for unknown email and wrong password: no account enumeration.
  if (!u || typeof password !== 'string' || !bcrypt.compareSync(password, u.password_hash)) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  res.json({ token: sign(u), ...buildMe(u.id) });
});

authRouter.get('/me', requireAuth, (req, res) => res.json(buildMe(req.user.id)));

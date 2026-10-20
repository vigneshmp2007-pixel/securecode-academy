import express from 'express';
import rateLimit from 'express-rate-limit';
import { buildMe, requireAuth } from './auth.js';
import { db } from './db.js';
import { idorExploit, sqliExploit } from './exploits.js';
import { completeLesson, levelFor } from './gamify.js';
import { CHALLENGES, runChallenge } from './sandbox.js';

export const apiRouter = express.Router();
apiRouter.use(requireAuth);

const runLimiter = rateLimit({
  windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => `u${req.user.id}`,
  message: { error: 'Too many test runs. Wait a minute and try again.' },
});

const getLesson = (id) => db.prepare(`SELECT l.*, m.slug AS module_slug, m.title AS module_title
  FROM lessons l JOIN modules m ON m.id = l.module_id WHERE l.id = ?`).get(id);

apiRouter.get('/tracks', (req, res) => {
  const tracks = db.prepare('SELECT id,slug,title,description FROM tracks').all();
  const modStmt = db.prepare(`SELECT m.id,m.slug,m.title,m.description,m.badge_slug,
      (SELECT COUNT(*) FROM lessons l WHERE l.module_id=m.id) AS total,
      (SELECT COUNT(*) FROM lessons l JOIN progress p ON p.lesson_id=l.id AND p.user_id=? WHERE l.module_id=m.id) AS done
    FROM modules m WHERE m.track_id=? ORDER BY m.ord`);
  res.json(tracks.map((t) => ({ ...t, modules: modStmt.all(req.user.id, t.id) })));
});

apiRouter.get('/modules/:slug', (req, res) => {
  const m = db.prepare('SELECT id,slug,title,description,badge_slug FROM modules WHERE slug=?').get(req.params.slug);
  if (!m) return res.status(404).json({ error: 'Module not found.' });
  const lessons = db.prepare(`SELECT l.id,l.slug,l.title,l.kind,
      EXISTS(SELECT 1 FROM progress p WHERE p.lesson_id=l.id AND p.user_id=?) AS completed
    FROM lessons l WHERE l.module_id=? ORDER BY l.ord`).all(req.user.id, m.id)
    .map((l) => ({ ...l, completed: !!l.completed }));
  const badge = m.badge_slug ? db.prepare('SELECT slug,title,description,icon FROM badges WHERE slug=?').get(m.badge_slug) : null;
  res.json({ ...m, lessons, badge });
});

apiRouter.get('/lessons/:id', (req, res) => {
  const l = getLesson(Number(req.params.id));
  if (!l) return res.status(404).json({ error: 'Lesson not found.' });
  const next = db.prepare('SELECT id FROM lessons WHERE module_id=? AND ord>? ORDER BY ord LIMIT 1').get(l.module_id, l.ord);
  const completed = !!db.prepare('SELECT 1 FROM progress WHERE user_id=? AND lesson_id=?').get(req.user.id, l.id);
  res.json({
    id: l.id, title: l.title, kind: l.kind, content_md: l.content_md, challenge_key: l.challenge_key,
    starter_code: l.starter_code, language: l.language, module_slug: l.module_slug, module_title: l.module_title,
    next_id: next?.id ?? null, completed,
  });
});

apiRouter.post('/lessons/:id/complete', (req, res) => {
  const l = getLesson(Number(req.params.id));
  if (!l) return res.status(404).json({ error: 'Lesson not found.' });
  if (l.kind !== 'reading') return res.status(400).json({ error: 'Challenges are completed by passing the tests.' });
  res.json(completeLesson(req.user.id, l));
});

apiRouter.post('/lessons/:id/run', runLimiter, async (req, res, next) => {
  try {
    const l = getLesson(Number(req.params.id));
    if (!l || l.kind !== 'challenge' || !CHALLENGES[l.challenge_key]) return res.status(404).json({ error: 'Challenge not found.' });
    const { code } = req.body ?? {};
    if (typeof code !== 'string' || !code.trim()) return res.status(400).json({ error: 'Write some code first.' });
    if (code.length > 20_000) return res.status(413).json({ error: 'Code is too long (20,000 characters max).' });

    const result = await runChallenge(l.challenge_key, code);
    const rewards = result.passed ? completeLesson(req.user.id, l) : null;
    res.json({ ...result, rewards });
  } catch (e) { next(e); }
});

// Exploit-step simulators (safe, fake data, throwaway in-memory DB)
apiRouter.post('/challenges/sqli/exploit', (req, res) => {
  const { username = '', password = '' } = req.body ?? {};
  if (String(username).length > 200 || String(password).length > 200) return res.status(400).json({ error: 'Input too long.' });
  res.json(sqliExploit(String(username), String(password)));
});
apiRouter.post('/challenges/idor/exploit', (req, res) => {
  res.json(idorExploit(String(req.body?.id ?? '')));
});

apiRouter.get('/leaderboard', (_req, res) => {
  const rows = db.prepare('SELECT name, xp, streak FROM users ORDER BY xp DESC, id ASC LIMIT 10').all();
  res.json(rows.map((r) => ({ ...r, level: levelFor(r.xp) })));
});

apiRouter.get('/team', (req, res) => {
  const u = req.user;
  if (!u.team_id) return res.json({ team: null });
  const isManager = u.role === 'manager';
  const team = db.prepare('SELECT id,name,invite_code FROM teams WHERE id=?').get(u.team_id);
  const total = db.prepare('SELECT COUNT(*) c FROM lessons').get().c;
  const members = db.prepare(`SELECT u.id,u.name,u.email,u.role,u.xp,u.streak,
      (SELECT COUNT(*) FROM progress p WHERE p.user_id=u.id) AS done,
      (SELECT COUNT(*) FROM user_badges b WHERE b.user_id=u.id) AS badges
    FROM users u WHERE u.team_id=? ORDER BY u.xp DESC, u.id ASC`).all(team.id)
    .map((m) => ({
      id: m.id, name: m.name, role: m.role, xp: m.xp, level: levelFor(m.xp), streak: m.streak,
      done: m.done, badges: m.badges, completion: total ? Math.round((100 * m.done) / total) : 0,
      email: isManager ? m.email : undefined,
    }));
  const devs = members.filter((m) => m.role === 'developer');
  res.json({
    isManager, totalLessons: total,
    team: { id: team.id, name: team.name, inviteCode: isManager ? team.invite_code : undefined },
    averageCompletion: devs.length ? Math.round(devs.reduce((s, m) => s + m.completion, 0) / devs.length) : 0,
    members,
  });
});

apiRouter.post('/team/join', (req, res) => {
  if (req.user.role !== 'developer') return res.status(400).json({ error: 'Managers already own a team.' });
  if (req.user.team_id) return res.status(400).json({ error: 'You already belong to a team.' });
  const t = db.prepare('SELECT id FROM teams WHERE invite_code=?').get(String(req.body?.inviteCode ?? '').trim().toUpperCase());
  if (!t) return res.status(400).json({ error: 'That invite code does not match a team.' });
  db.prepare('UPDATE users SET team_id=? WHERE id=?').run(t.id, req.user.id);
  res.json(buildMe(req.user.id));
});

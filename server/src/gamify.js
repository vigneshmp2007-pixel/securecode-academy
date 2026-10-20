import { db } from './db.js';

export const XP = { reading: 10, challenge: 50 };
export const levelFor = (xp) => Math.floor(xp / 100) + 1;

const day = (d) => d.toISOString().slice(0, 10);

function award(userId, slug, out) {
  const r = db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_slug) VALUES (?, ?)').run(userId, slug);
  if (r.changes) out.push(db.prepare('SELECT slug,title,description,icon FROM badges WHERE slug=?').get(slug));
}

/** Marks a lesson complete once, awards XP, updates streak, and grants badges. */
export function completeLesson(userId, lesson) {
  return db.transaction(() => {
    const ins = db.prepare('INSERT OR IGNORE INTO progress (user_id, lesson_id) VALUES (?, ?)').run(userId, lesson.id);
    if (!ins.changes) return { alreadyCompleted: true, xpGained: 0, badges: [] };

    const user = db.prepare('SELECT xp, streak, last_active FROM users WHERE id=?').get(userId);
    const today = day(new Date());
    const yesterday = day(new Date(Date.now() - 864e5));
    let streak = user.streak;
    if (user.last_active !== today) streak = user.last_active === yesterday ? streak + 1 : 1;

    const xpGained = XP[lesson.kind];
    db.prepare('UPDATE users SET xp = xp + ?, streak = ?, last_active = ? WHERE id=?').run(xpGained, streak, today, userId);

    const badges = [];
    if (lesson.kind === 'challenge') award(userId, 'first-patch', badges);
    if (streak >= 3) award(userId, 'streak-3', badges);

    const mod = db.prepare('SELECT id, badge_slug FROM modules WHERE id=?').get(lesson.module_id);
    const left = db.prepare(`SELECT COUNT(*) c FROM lessons l
      WHERE l.module_id=? AND NOT EXISTS (SELECT 1 FROM progress p WHERE p.lesson_id=l.id AND p.user_id=?)`).get(mod.id, userId).c;
    if (left === 0 && mod.badge_slug) award(userId, mod.badge_slug, badges);

    return { alreadyCompleted: false, xpGained, badges, streak, level: levelFor(user.xp + xpGained) };
  })();
}

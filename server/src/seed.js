import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const BADGES = [
  ['sql-slayer', 'SQL Slayer', 'Completed the SQL Injection module.', 'SQL'],
  ['xss-hunter', 'XSS Hunter', 'Completed the Cross-Site Scripting module.', 'XSS'],
  ['idor-inspector', 'IDOR Inspector', 'Completed the IDOR module.', 'IDOR'],
  ['first-patch', 'First Patch', 'Shipped your first working security patch.', 'FIX'],
  ['streak-3', 'Three-Day Streak', 'Learned three days in a row.', '3D'],
];

const MODULES = [
  {
    slug: 'sql-injection', title: 'SQL Injection',
    description: 'Break a login form with one quote, then fix it with parameterized queries.',
    badge: 'sql-slayer',
    lessons: [
      { slug: 'sqli-intro', title: 'How SQL injection works', kind: 'reading', md: 'sqli-intro.md' },
      { slug: 'sqli-patch', title: 'Challenge: patch the login', kind: 'challenge', md: 'sqli-patch.md', key: 'sqli', lang: 'python', starter: 'challenges/sqli/starter.py' },
    ],
  },
  {
    slug: 'xss', title: 'Cross-Site Scripting',
    description: 'Inject script into a page, then output-encode your way out of it.',
    badge: 'xss-hunter',
    lessons: [
      { slug: 'xss-intro', title: 'How XSS works', kind: 'reading', md: 'xss-intro.md' },
      { slug: 'xss-patch', title: 'Challenge: write the sanitizer', kind: 'challenge', md: 'xss-patch.md', key: 'xss', lang: 'javascript', starter: 'challenges/xss/starter.js' },
    ],
  },
  {
    slug: 'idor', title: 'Insecure Direct Object Reference',
    description: 'Read someone else\'s invoice by changing a number, then enforce ownership.',
    badge: 'idor-inspector',
    lessons: [
      { slug: 'idor-intro', title: 'How IDOR works', kind: 'reading', md: 'idor-intro.md' },
      { slug: 'idor-patch', title: 'Challenge: enforce ownership', kind: 'challenge', md: 'idor-patch.md', key: 'idor', lang: 'python', starter: 'challenges/idor/starter.py' },
    ],
  },
];

export function seed() {
  const tx = db.transaction(() => {
    const upBadge = db.prepare(`INSERT INTO badges (slug,title,description,icon) VALUES (?,?,?,?)
      ON CONFLICT(slug) DO UPDATE SET title=excluded.title, description=excluded.description, icon=excluded.icon`);
    BADGES.forEach((b) => upBadge.run(...b));

    db.prepare(`INSERT INTO tracks (slug,title,description) VALUES (?,?,?)
      ON CONFLICT(slug) DO UPDATE SET title=excluded.title, description=excluded.description`)
      .run('web-security', 'Web Security', 'The OWASP Top 10 flaws that show up in real code reviews.');
    const trackId = db.prepare('SELECT id FROM tracks WHERE slug=?').get('web-security').id;

    const upModule = db.prepare(`INSERT INTO modules (track_id,slug,title,description,badge_slug,ord) VALUES (?,?,?,?,?,?)
      ON CONFLICT(slug) DO UPDATE SET title=excluded.title, description=excluded.description, badge_slug=excluded.badge_slug, ord=excluded.ord`);
    const upLesson = db.prepare(`INSERT INTO lessons (module_id,slug,title,kind,content_md,challenge_key,starter_code,language,ord)
      VALUES (?,?,?,?,?,?,?,?,?)
      ON CONFLICT(slug) DO UPDATE SET title=excluded.title, kind=excluded.kind, content_md=excluded.content_md,
        challenge_key=excluded.challenge_key, starter_code=excluded.starter_code, language=excluded.language, ord=excluded.ord`);

    MODULES.forEach((m, mi) => {
      upModule.run(trackId, m.slug, m.title, m.description, m.badge, mi + 1);
      const moduleId = db.prepare('SELECT id FROM modules WHERE slug=?').get(m.slug).id;
      m.lessons.forEach((l, li) => {
        upLesson.run(moduleId, l.slug, l.title, l.kind, read(`content/${l.md}`),
          l.key ?? null, l.starter ? read(l.starter) : null, l.lang ?? null, li + 1);
      });
    });
  });
  tx();
}

// Verifies the test harnesses: starter code must FAIL, reference patches must PASS.
// Usage: SANDBOX_MODE=local node scripts/selftest.js   (or SANDBOX_MODE=docker)
import { runChallenge } from '../src/sandbox.js';
import fs from 'node:fs';

const starter = (p) => fs.readFileSync(new URL(`../challenges/${p}`, import.meta.url), 'utf8');
const GOOD = {
  sqli: `def login(db, username, password):
    row = db.execute("SELECT id FROM users WHERE username = ? AND password = ?", (username, password)).fetchone()
    return row is not None
`,
  idor: `def get_invoice(db, current_user_id, invoice_id):
    return db.execute("SELECT id, owner_id, item, amount FROM invoices WHERE id = ? AND owner_id = ?", (invoice_id, current_user_id)).fetchone()
`,
  xss: `function sanitize(input) {
  return String(input).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
`,
};
const BAD = { sqli: starter('sqli/starter.py'), idor: starter('idor/starter.py'), xss: starter('xss/starter.js') };

let failed = 0;
for (const key of Object.keys(GOOD)) {
  const bad = await runChallenge(key, BAD[key]);
  const good = await runChallenge(key, GOOD[key]);
  const ok = !bad.passed && good.passed;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${key}: starter passes=${bad.passed} (want false), patch passes=${good.passed} (want true)`);
  if (!good.passed) console.log(JSON.stringify(good, null, 2));
}
process.exit(failed ? 1 : 0);

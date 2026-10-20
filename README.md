# SecureCode Academy

Interactive secure-coding platform. Learners **exploit** a vulnerable mini-app, then **patch** the code. Their patch runs against a test suite inside an isolated sandbox.

- **Modules:** SQL Injection, XSS, IDOR (Track: Web Security)
- **LMS:** Track > Module > Lesson (markdown text + challenge), stored in SQLite
- **Sandbox:** ephemeral Docker containers (Python + Node), network disabled
- **Editor:** Monaco with a custom neon theme
- **Gamification:** XP, levels, daily streaks, badges (incl. **SQL Slayer**), leaderboard
- **Teams:** managers get an invite code and a completion dashboard for their developers
- **UI:** cyberpunk theme (Rajdhani + JetBrains Mono, neon cyan/magenta/yellow)

## Requirements
Node.js 18+ (tested on 22), Docker (for the secure sandbox).

## Quick start
```bash
npm run install:all
cp server/.env.example server/.env      # set JWT_SECRET
npm run sandbox:build                   # builds the "securecode-sandbox" image
npm run dev                             # API :4000, web :5173
```
Open http://localhost:5173, create a **Manager** account (gets a team + invite code), then a **Developer** account using that code.

### No Docker yet? (development only)
Set `SANDBOX_MODE=local` in `server/.env`. Learner code then runs directly on your machine with a timeout but **no isolation**. Never use this on a public server.

### Verify the test suites
```bash
cd server && SANDBOX_MODE=local npm run test:harness
```
Each challenge's vulnerable starter must fail and the reference patch must pass.

## Production
```bash
npm run build                 # builds client/dist
NODE_ENV=production JWT_SECRET=<long random> npm start   # API also serves the built client
```
Deploy on a VM you control (the API needs access to Docker). Put it behind HTTPS (Caddy / Nginx). Back up `server/data/academy.db`.

## Project layout
```
server/
  src/sandbox.js        Sandbox Service (isolated code execution)
  src/exploits.js       Exploit-step simulators (fake data, in-memory DB)
  src/{auth,api,gamify,db,seed}.js
  challenges/<key>/     vulnerable starter code + test harness per challenge
  content/*.md          lesson text (re-seeded on every start)
  sandbox/Dockerfile    execution image
client/src/             React app (pages, Monaco editor, exploit panels)
docs/SANDBOX_DESIGN.md  Sandbox design document
```

## Adding a challenge
1. Create `server/challenges/<key>/starter.*` and `harness.*` (copy an existing harness; print the `__RESULT__<token>:` JSON line).
2. Register it in `CHALLENGES` (`src/sandbox.js`) and `MODULES` (`src/seed.js`), add a markdown file in `content/`.
3. Add an exploit panel in `client/src/components/Exploits.jsx` if it needs one.

## Known limits
- CSP is disabled in the API because Monaco loads from a CDN; self-host Monaco and enable CSP for a hardened deployment.
- SQLite suits a single server. Move to Postgres for multi-instance deployments.

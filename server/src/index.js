import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiRouter } from './api.js';
import { authRouter } from './auth.js';
import './db.js';
import { seed } from './seed.js';

seed();

const app = express();
app.disable('x-powered-by');
// CSP is left off because the Monaco editor loads its worker files from a CDN.
// Tighten this once Monaco is self-hosted (see README).
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json({ limit: '64kb' }));

app.use('/api/auth', rateLimit({ windowMs: 15 * 60_000, limit: 40, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' } }), authRouter);
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', apiRouter);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && !err.status ? 'Something went wrong on the server.' : err.message });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`SecureCode Academy API on http://localhost:${port}`);
  if ((process.env.SANDBOX_MODE || 'docker') === 'local') {
    console.warn('\n[WARNING] SANDBOX_MODE=local runs learner code directly on this machine. Use it for development only.\n');
  }
});

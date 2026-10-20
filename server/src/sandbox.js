// Sandbox Service: runs untrusted learner code in an isolated, ephemeral environment.
// See docs/SANDBOX_DESIGN.md for the threat model.
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_OUT = 64 * 1024;

export const CHALLENGES = {
  sqli: { lang: 'python', harness: 'challenges/sqli/harness.py' },
  idor: { lang: 'python', harness: 'challenges/idor/harness.py' },
  xss: { lang: 'node', harness: 'challenges/xss/harness.js' },
};

const cfg = () => ({
  mode: process.env.SANDBOX_MODE || 'docker',
  image: process.env.SANDBOX_IMAGE || 'securecode-sandbox',
  timeout: Number(process.env.SANDBOX_TIMEOUT_MS || 8000),
  limit: Number(process.env.SANDBOX_CONCURRENCY || 4),
});

// --- tiny semaphore so a burst of submissions can't exhaust the host ---
let active = 0;
const waiting = [];
const acquire = () => new Promise((res) => {
  if (active < cfg().limit) { active++; res(); } else waiting.push(res);
});
const release = () => { const next = waiting.shift(); if (next) next(); else active--; };

function exec(cmd, args, { cwd, env, timeout, onTimeout } = {}) {
  return new Promise((resolve) => {
    let stdout = ''; let stderr = ''; let timedOut = false; let spawnError = null;
    const child = spawn(cmd, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const cap = (s, d) => (s.length < MAX_OUT ? s + d.toString().slice(0, MAX_OUT - s.length) : s);
    child.stdout.on('data', (d) => { stdout = cap(stdout, d); });
    child.stderr.on('data', (d) => { stderr = cap(stderr, d); });
    const timer = setTimeout(() => { timedOut = true; onTimeout?.(); child.kill('SIGKILL'); }, timeout);
    child.on('error', (e) => { spawnError = e; });
    child.on('close', (code) => { clearTimeout(timer); resolve({ stdout, stderr, code, timedOut, spawnError }); });
  });
}

export async function runChallenge(key, code) {
  const ch = CHALLENGES[key];
  if (!ch) throw Object.assign(new Error('Unknown challenge'), { status: 404 });
  const { mode, image, timeout } = cfg();

  await acquire();
  const id = crypto.randomBytes(6).toString('hex');
  const token = crypto.randomBytes(16).toString('hex');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sca-'));
  try {
    const py = ch.lang === 'python';
    const userSrc = py
      ? code
      : `${code}\n;module.exports = { sanitize: typeof sanitize === 'function' ? sanitize : undefined };\n`;
    const harnessName = py ? 'harness.py' : 'harness.js';
    await fs.writeFile(path.join(dir, py ? 'user.py' : 'user.js'), userSrc, { mode: 0o644 });
    await fs.copyFile(path.join(root, ch.harness), path.join(dir, harnessName));
    await fs.chmod(path.join(dir, harnessName), 0o644);
    await fs.chmod(dir, 0o755);
    const runCmd = py ? ['python', harnessName] : ['node', harnessName];

    let res;
    if (mode === 'docker') {
      const name = `sca-${id}`;
      const args = [
        'run', '--rm', '--name', name,
        '--network', 'none',            // no outbound or inbound network
        '--memory', '128m', '--memory-swap', '128m',
        '--cpus', '0.5', '--pids-limit', '64',
        '--read-only', '--tmpfs', '/tmp:rw,noexec,nosuid,size=8m',
        '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
        '--user', '65534:65534',        // nobody
        '-e', `RESULT_TOKEN=${token}`, '-e', 'PYTHONDONTWRITEBYTECODE=1',
        '-v', `${dir}:/work:ro`, '-w', '/work',
        image, ...runCmd,
      ];
      res = await exec('docker', args, {
        timeout,
        env: { PATH: process.env.PATH, HOME: process.env.HOME, DOCKER_HOST: process.env.DOCKER_HOST },
        onTimeout: () => spawn('docker', ['kill', name], { stdio: 'ignore' }),
      });
      if (res.spawnError) {
        throw Object.assign(new Error('Sandbox unavailable: Docker is not installed or not running on the server.'), { status: 503 });
      }
      if (res.code === 125 || /Unable to find image|Cannot connect to the Docker daemon/i.test(res.stderr)) {
        throw Object.assign(new Error('Sandbox unavailable: build the image with "npm run sandbox:build" and make sure Docker is running.'), { status: 503 });
      }
    } else {
      const bin = py ? (process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3')) : process.execPath;
      res = await exec(bin, [harnessName], {
        cwd: dir, timeout,
        env: { PATH: process.env.PATH, RESULT_TOKEN: token, PYTHONDONTWRITEBYTECODE: '1' },
      });
    }

    const marker = `__RESULT__${token}:`;
    const lines = res.stdout.split('\n');
    const hit = lines.find((l) => l.startsWith(marker));
    const output = lines.filter((l) => !l.startsWith(marker)).join('\n').trim().slice(0, 4000);
    let tests = null;
    if (hit) { try { tests = JSON.parse(hit.slice(marker.length)); } catch { tests = null; } }

    let error = null;
    if (res.timedOut) error = `Your code took longer than ${timeout / 1000}s and was stopped. Check for infinite loops.`;
    else if (!tests) error = (res.stderr.trim().split('\n').slice(-12).join('\n') || 'The tests did not finish. Check your code for syntax errors.').slice(0, 1500);
    return { tests, output, error, passed: !!tests && tests.length > 0 && tests.every((t) => t.passed) };
  } finally {
    fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    release();
  }
}

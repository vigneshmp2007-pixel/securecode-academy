'use strict';
const TOKEN = process.env.RESULT_TOKEN || '';
delete process.env.RESULT_TOKEN;
const write = process.stdout.write.bind(process.stdout);
const results = [];

function emit() { write('\n__RESULT__' + TOKEN + ':' + JSON.stringify(results) + '\n'); }
function run(name, hint, fn) {
  let ok = false; let error = null;
  try { ok = !!fn(); } catch (e) { error = String(e && e.message ? e.message : e); }
  results.push({ name, passed: ok, hint: ok ? '' : hint, error });
}

let sanitize;
try {
  sanitize = require('./user.js').sanitize;
  if (typeof sanitize !== 'function') throw new Error('sanitize(input) is not defined');
} catch (e) {
  results.push({ name: 'Your code loads', passed: false, hint: 'Define function sanitize(input) and return a string.', error: String(e.message || e) });
  emit(); process.exit(0);
}

const noTags = (s) => typeof s === 'string' && !s.includes('<') && !s.includes('>');

run('Plain text is unchanged', 'Harmless text must pass through untouched.', () => sanitize('Hello, world') === 'Hello, world');
run('Exploit 1: <script> tag is neutralized', 'Encode < and > so the browser never sees a tag.', () => noTags(sanitize('<script>alert(1)</script>')));
run('Exploit 2: <img onerror> is neutralized', 'Event handlers only run inside real tags. Encode < and >.', () => noTags(sanitize('<img src=x onerror=alert(1)>')));
run('Exploit 3: double quote cannot break an attribute', 'Encode " as &quot; so the value stays inside the attribute.', () => {
  const s = sanitize('" onmouseover="alert(1)');
  return typeof s === 'string' && !s.includes('"');
});
run('Exploit 4: single quote cannot break an attribute', "Encode ' as &#39; as well.", () => {
  const s = sanitize("' onfocus='alert(1)");
  return typeof s === 'string' && !s.includes("'");
});
run('Ampersands are encoded (Tom & Jerry)', 'Encode & as &amp; and do it FIRST, or you will double-encode your own output.', () => sanitize('Tom & Jerry') === 'Tom &amp; Jerry');
run('Pre-encoded input is not trusted', '&lt; typed by the user must become &amp;lt; so it cannot be decoded into a tag.', () => String(sanitize('&lt;b&gt;')).includes('&amp;lt;'));
emit();

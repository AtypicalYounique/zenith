// Two quick gates to run on every change, before the play-through harness.
//
//   1. Syntax: extract the inline game script and run `node --check` on it, so
//      a stray typo is caught with a line number instead of a frozen screen.
//   2. Style: count em-dashes in index.html and confirm zero (a hard project
//      convention: no em-dashes anywhere, ever).
//
// Run with: node test/gates.mjs

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML_PATH = join(__dirname, '..', 'index.html');

function fail(m, detail) {
  console.error(`  FAIL ${m}`);
  if (detail) console.error('\n' + detail + '\n');
  process.exit(1);
}

const html = readFileSync(HTML_PATH, 'utf8');

// --- Gate 1: syntax check the inline game script ---
const m = html.match(/<script>([\s\S]*?)<\/script>/i);
if (!m) fail('could not find the inline game script in index.html');
const tmp = join(mkdtempSync(join(tmpdir(), 'zenith-')), 'inline.js');
writeFileSync(tmp, m[1], 'utf8');
try {
  execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
  console.log('  ok   syntax: inline game script passes node --check');
} catch (e) {
  fail('syntax error in the inline game script', (e.stderr || e.stdout || e).toString());
}

// --- Gate 2: no em-dashes anywhere ---
const dashes = (html.match(/\u2014/g) || []).length;
if (dashes !== 0) fail(`found ${dashes} em-dash(es) (U+2014) in index.html; the project rule is zero`);
console.log('  ok   style: zero em-dashes in index.html');

console.log('  ..   both gates passed\n');

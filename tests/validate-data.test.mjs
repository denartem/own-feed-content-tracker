import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, cpSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cli = join(import.meta.dirname, '..', 'scripts', 'validate-data.mjs');
const fixtures = join(import.meta.dirname, '..', 'fixtures');

test('фікстури проходять перевірку', () => {
  const out = execFileSync(process.execPath, [cli, fixtures], { encoding: 'utf8' });
  assert.match(out, /OK: 2 турніри, 6 одиниць/);
});

test('зламані дані й хибні очікування дають помилки', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ofd-'));
  cpSync(fixtures, dir, { recursive: true });
  const file = join(dir, 'tournaments', 'demo-sport-demo-pairs-cup.json');
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  doc.units[0].status = 'maybe';
  writeFileSync(file, JSON.stringify(doc));
  const expect = join(dir, 'expect.json');
  writeFileSync(expect, JSON.stringify({ 'demo-sport-demo-players-cup': { total: 3, done: 1 } }));
  const r = spawnSync(process.execPath, [cli, dir, '--expect', expect], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /статус maybe/);
  assert.match(r.stderr, /demo-sport-demo-players-cup: total = 2, очікувалось 3/);
});

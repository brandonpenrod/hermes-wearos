import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = fs.readFileSync(path.join(root, 'watchkit.mjs'), 'utf8');
const ws = fs.readFileSync(path.join(root, 'stt_stream_ws.mjs'), 'utf8');
const example = JSON.parse(fs.readFileSync(path.join(root, 'config.example.json'), 'utf8'));

test('example binds loopback and limits file roots to explicit opt-in config', () => {
  assert.equal(example.host, '127.0.0.1');
  assert.deepEqual(example.img_roots, []);
  assert.equal(example.enable_media, false);
  assert.equal(example.enable_stt, false);
  assert.equal(example.enable_mermaid, false);
});

test('server rejects public binds, weak/missing bearer tokens and query-string tokens', () => {
  assert.match(server, /isLoopbackHost/);
  assert.match(server, /TOKEN\.length\s*<\s*64/);
  assert.doesNotMatch(ws, /searchParams\.get\(['"]token['"]\)/);
});

test('pilot has no key endpoint, key seeding, or cross-profile discovery', () => {
  assert.doesNotMatch(server, /function\s+(?:agentKeys|seedProfileKeys)\s*\(/);
  assert.doesNotMatch(server, /function\s+handleAgentKeys\s*\(/);
  assert.doesNotMatch(server, /function\s+listAgents\s*\(/);
  assert.match(server, /PILOT_PROFILE\s*=\s*['"]default['"]/);
});

test('pilot denies state mutation and expensive optional helper routes by default', () => {
  assert.match(server, /PILOT_READ_ONLY_DENY/);
  assert.match(server, /cfg\.enable_media/);
  assert.match(server, /cfg\.enable_stt/);
  assert.match(server, /cfg\.enable_mermaid/);
  assert.match(server, /const IMG_ROOTS = \(Array\.isArray\(cfg\.img_roots\)/);
  assert.doesNotMatch(server, /IMG_ROOTS = \[os\.homedir\(\), '\/tmp'/);
  assert.doesNotMatch(server, /runChild\(['"]npx['"],\s*\[['"]-y['"],\s*['"]@mermaid-js/);
});

test('setup refuses automatic installation/provisioning side effects', () => {
  const setup = fs.readFileSync(path.resolve(root, '../../scripts/setup.sh'), 'utf8');
  assert.match(setup, /fail closed/i);
  assert.doesNotMatch(setup, /deviceidle disable|set_tailnet_key|set_agent_key|--install-soul/);
  const install = fs.readFileSync(path.resolve(root, '../../scripts/install-watch.sh'), 'utf8');
  assert.match(install, /disabled/i);
  assert.doesNotMatch(install, /adb install/);
});

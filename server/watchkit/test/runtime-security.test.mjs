import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const token = 'a'.repeat(64); // synthetic fixture, never a credential
async function fixture(config) {
  const root = await fs.mkdtemp(path.join(process.env.TMPDIR || os.tmpdir(), 'wearos-security-'));
  const dir = path.join(root, 'watchkit');
  await fs.mkdir(dir);
  for (const file of ['watchkit.mjs', 'stt_stream_ws.mjs']) await fs.copyFile(path.join(source, file), path.join(dir, file));
  const home = path.join(root, 'home');
  await fs.mkdir(home);
  const cfg = path.join(root, 'config.json');
  await fs.writeFile(cfg, JSON.stringify(config), { mode: 0o600 });
  const child = spawn(process.execPath, [path.join(dir, 'watchkit.mjs')], {
    env: { PATH: process.env.PATH, HOME: home, HERMES_HOME: home, WATCHKIT_CONFIG: cfg },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', b => { output += b; });
  child.stderr.on('data', b => { output += b; });
  const exited = new Promise(resolve => child.once('exit', code => resolve(code)));
  return { child, exited, home, output: () => output, clean: async () => {
    if (child.exitCode === null) child.kill('SIGTERM');
    await exited;
    await fs.rm(root, { recursive: true, force: true });
  }};
}
async function freePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
test('runtime rejects wildcard bind and missing bearer before listening', async () => {
  for (const cfg of [{ host: '0.0.0.0', token }, { host: '127.0.0.1', token: '' }]) {
    const f = await fixture(cfg);
    try { assert.equal(await f.exited, 2, f.output()); }
    finally { await f.clean(); }
  }
});
test('runtime authentication and disabled privilege routes fail closed without profile writes', async () => {
  const port = await freePort();
  const f = await fixture({ host: '127.0.0.1', port, token });
  const url = `http://127.0.0.1:${port}`;
  const headers = { Authorization: `Bearer ${token}` };
  try {
    let ready = false;
    for (let n = 0; n < 60; n++) {
      if (f.child.exitCode !== null) assert.fail(f.output());
      try { const r = await fetch(`${url}/health`); if (r.status === 200) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.ok(ready, f.output());
    assert.equal((await fetch(`${url}/agent_keys`)).status, 401);
    assert.equal((await fetch(`${url}/agent_keys?token=${token}`)).status, 400);
    assert.equal((await fetch(`${url}/agent_keys`, { headers })).status, 404);
    const agentsResponse = await fetch(`${url}/agents`, { headers });
    assert.equal(agentsResponse.status, 200);
    assert.deepEqual(await agentsResponse.json(), { agents: ['default'] });
    for (const route of ['/sessions', '/session_messages', '/search']) {
      assert.equal((await fetch(url + route, { headers })).status, 403, route);
    }
    for (const route of ['/session_promote', '/session_delete', '/session_archive', '/render/mermaid', '/stt/whisper']) {
      const r = await fetch(url + route, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}' });
      assert.ok([403, 404].includes(r.status), `${route}: ${r.status}`);
    }
    for (const route of ['/img?path=/etc/passwd', '/media?path=/etc/passwd']) {
      const r = await fetch(url + route, { headers });
      assert.equal(r.status, 403, route);
    }
    assert.deepEqual(await fs.readdir(f.home), [], 'helper must never seed or inspect production profile env files');
  } finally { await f.clean(); }
});

test('runtime denies Mermaid rendering even when explicitly enabled', async () => {
  const port = await freePort();
  const f = await fixture({ host: '127.0.0.1', port, token, enable_mermaid: true });
  const url = `http://127.0.0.1:${port}`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  try {
    let ready = false;
    for (let n = 0; n < 60; n++) {
      if (f.child.exitCode !== null) assert.fail(f.output());
      try { const r = await fetch(`${url}/health`); if (r.status === 200) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.ok(ready, f.output());
    const response = await fetch(`${url}/render/mermaid`, { method: 'POST', headers, body: JSON.stringify({ code: 'flowchart TD\\nA-->B' }) });
    assert.equal(response.status, 403);
  } finally { await f.clean(); }
});

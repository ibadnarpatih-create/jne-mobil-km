import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync(new URL('../lib/native-driver.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function setup(native = true) {
  const sent = [];
  const timers = new Map(); let next = 0;
  const bridge = { postMessage: raw => sent.push(JSON.parse(raw)) };
  const context = { exports: {}, crypto: { randomUUID: () => `request-${++next}` }, clearTimeout: id => timers.delete(id),
    window: { ...(native ? { MovetraNative: bridge } : {}), setTimeout: callback => { timers.set(next, callback); return next; } } };
  vm.runInNewContext(code, context);
  return { api: context.exports, sent, timers, reply: value => bridge.onmessage({ data: JSON.stringify(value) }) };
}
test('ordinary browsers do not invoke native tracking', async () => {
  const { api, sent } = setup(false);
  assert.equal(api.isNativeDriver(), false);
  assert.equal(await api.nativeDriver('start'), null);
  assert.equal(sent.length, 0);
});
test('out-of-order responses settle the matching request only', async () => {
  const { api, sent, reply, timers } = setup();
  const first = api.nativeDriver('start'); const second = api.nativeDriver('status');
  reply({ id: sent[1].id, value: 'status' });
  reply({ id: sent[0].id, value: 'started' });
  assert.equal(await first, 'started'); assert.equal(await second, 'status'); assert.equal(timers.size, 0);
});
test('native errors reach the caller and remove timeout', async () => {
  const { api, sent, reply, timers } = setup();
  const result = api.nativeDriver('login', { identifier: 'test' });
  reply({ id: sent[0].id, error: 'Login failed' });
  await assert.rejects(result, /Login failed/); assert.equal(timers.size, 0);
});
test('an unresponsive native bridge times out instead of hanging the form', async () => {
  const { api, timers } = setup();
  const result = api.nativeDriver('logout');
  [...timers.values()][0]();
  await assert.rejects(result, /APK tidak merespons/);
});

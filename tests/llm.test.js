import test from 'node:test';
import assert from 'node:assert/strict';
import { callModel, completionUrl } from '../server/llm.js';

test('normalizes Groq base URLs and full endpoints', () => {
  for (const path of ['', '/v1/', '/openai', '/openai/v1', '/openai/v1/chat/completions/']) {
    assert.equal(completionUrl('https://api.groq.com' + path), 'https://api.groq.com/openai/v1/chat/completions');
  }
  assert.equal(completionUrl('http://localhost:11434/v1'), 'http://localhost:11434/v1/chat/completions');
  assert.throws(() => completionUrl('invalid'), /valid HTTP/);
  assert.throws(() => completionUrl('https://api.groq.com/wrong'), /For Groq/);
});

test('provider requests, failures and retry behavior', async (t) => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  t.after(() => { process.env = originalEnv; globalThis.fetch = originalFetch; });
  delete process.env.LLM_API_KEY;
  process.env.GROQ_API_KEY = 'test-key';
  process.env.LLM_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
  process.env.LLM_MODEL = 'test-model';
  delete process.env.LLM_JSON_MODE;
  const calls = [];
  let responses = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    return responses.shift();
  };
  const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
  responses = [response({ choices: [{ message: { content: '{"days":[]}' } }] })];
  assert.equal(await callModel('5 days in Iceland'), '{"days":[]}');
  assert.equal(calls[0].url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-key');
  assert.equal(calls[0].body.model, 'test-model');

  responses = [response({ error: { code: 'model_not_found' } }, 404)];
  await assert.rejects(callModel('5 days in Iceland'), { code: 'model_unavailable' });
  responses = [response({}, 404)];
  await assert.rejects(callModel('5 days in Iceland'), { code: 'endpoint_not_found' });
  responses = [response({}, 401)];
  await assert.rejects(callModel('5 days in Iceland'), { code: 'auth' });
  responses = [response({}, 429)];
  await assert.rejects(callModel('5 days in Iceland'), { code: 'rate_limited' });

  const count = calls.length;
  responses = [response({ error: { message: 'response_format json_object unsupported' } }, 400),
    response({ choices: [{ message: { content: '{}' } }] })];
  await callModel('5 days in Iceland');
  assert.equal(calls.length, count + 2);
  assert.equal(calls.at(-1).body.response_format, undefined);
  assert.equal(calls.at(-1).options.signal, calls.at(-2).options.signal);
  responses = [response({ error: { message: 'invalid model' } }, 400)];
  const before = calls.length;
  await assert.rejects(callModel('5 days in Iceland'));
  assert.equal(calls.length, before + 1);
  delete process.env.GROQ_API_KEY;
  await assert.rejects(callModel('5 days in Iceland'), { code: 'not_configured' });
});

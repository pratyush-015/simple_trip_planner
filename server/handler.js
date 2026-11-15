import { callModel, UpstreamError } from './llm.js';

const MIN_LEN = 10;
const MAX_LEN = 1000;

const fail = (status, code, message) => ({ status, body: { error: { code, message } } });

// Framework-agnostic handler: takes the parsed JSON body, returns { status, body }.
export async function handleItinerary(body) {
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  if (prompt.length < MIN_LEN) return fail(400, 'bad_request', `Describe your trip in at least ${MIN_LEN} characters.`);
  if (prompt.length > MAX_LEN) return fail(400, 'bad_request', `Keep the description under ${MAX_LEN} characters.`);

  try {
    const content = await callModel(prompt);
    return { status: 200, body: { content } };
  } catch (err) {
    if (err instanceof UpstreamError) return fail(err.status, err.code, err.message);
    console.error('Unexpected error:', err);
    return fail(500, 'server_error', 'Something went wrong on the server.');
  }
}

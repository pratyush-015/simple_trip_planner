const TIMEOUT_MS = 45_000;

export class ApiError extends Error {
  /** kind: 'timeout' | 'network' | 'server' */
  constructor(kind, message) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
  }
}

/**
 * Calls our backend (never the AI provider directly). Resolves with the model's raw text.
 * `signal` lets the caller cancel (superseded request); a timeout is reported as ApiError('timeout').
 */
export async function requestItinerary(prompt, signal) {
  const inner = new AbortController();
  const timer = setTimeout(() => inner.abort(), TIMEOUT_MS);
  const onAbort = () => inner.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetch('/api/itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: inner.signal,
    });

    let payload = null;
    try {
      payload = await res.json();
    } catch {
      /* non-JSON body (e.g. a proxy error page) */
    }

    if (!res.ok) {
      throw new ApiError('server', payload?.error?.message || `The server returned an error (${res.status}).`);
    }
    return payload?.content ?? '';
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (signal?.aborted) throw err; // caller cancelled on purpose
    if (err.name === 'AbortError') throw new ApiError('timeout', 'The AI took too long to respond.');
    throw new ApiError('network', 'Could not reach the server. Check your connection.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

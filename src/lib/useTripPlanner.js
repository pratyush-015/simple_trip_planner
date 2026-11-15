import { useCallback, useEffect, useReducer, useRef } from 'react';
import { requestItinerary, ApiError } from './api.js';
import { parseItinerary, ItineraryError } from './schema.js';
import { reducer, loadSaved, save } from './plannerReducer.js';

const SLOW_AFTER_MS = 8000;
const MAX_ATTEMPTS = 2; // 1 automatic retry, only for unusable AI output

function toUserError(err) {
  if (err instanceof ItineraryError) {
    if (err.kind === 'refused') return { message: err.message, retryable: false };
    return {
      message: `${err.message} We tried twice. Try again or rephrase your trip.`,
      retryable: true,
    };
  }
  if (err instanceof ApiError) return { message: err.message, retryable: true };
  return { message: 'Something unexpected went wrong.', retryable: true };
}

export function useTripPlanner() {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadSaved(parseItinerary));

  // Stale-response protection: only the latest request id may update state.
  const latestId = useRef(0);
  const controller = useRef(null);

  useEffect(() => save(state), [state.itinerary, state.prompt]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => controller.current?.abort(), []);

  const generate = useCallback(async (prompt) => {
    controller.current?.abort(); // cancel the previous in-flight request
    const id = ++latestId.current;
    const ctrl = new AbortController();
    controller.current = ctrl;
    const isCurrent = () => id === latestId.current;

    dispatch({ type: 'REQUEST', prompt });
    const slowTimer = setTimeout(() => isCurrent() && dispatch({ type: 'SLOW' }), SLOW_AFTER_MS);

    let lastError;
    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const raw = await requestItinerary(prompt, ctrl.signal);
          if (!isCurrent()) return;
          const { itinerary, warnings } = parseItinerary(raw);
          dispatch({ type: 'SUCCESS', itinerary, warnings });
          return;
        } catch (err) {
          if (!isCurrent() || ctrl.signal.aborted) return; // superseded or cancelled: stay silent
          lastError = err;
          const retryable = err instanceof ItineraryError && err.kind !== 'refused';
          if (!retryable) break; // network/server errors are surfaced to the user instead
        }
      }
      if (isCurrent()) dispatch({ type: 'FAILURE', error: toUserError(lastError) });
    } finally {
      clearTimeout(slowTimer);
    }
  }, []);

  const cancel = useCallback(() => {
    latestId.current++; // invalidate whatever is in flight
    controller.current?.abort();
    dispatch({ type: 'CANCEL' });
  }, []);

  return { state, dispatch, generate, cancel };
}

// All app state in one reducer: request status + the editable itinerary.

const STORAGE_KEY = 'trip-planner:v1';

export const initialState = {
  status: 'idle', // 'idle' | 'loading' | 'success' | 'error'
  prompt: '',
  itinerary: null,
  warnings: [],
  error: null, // { message, retryable }
  slow: false,
  undo: null, // { itinerary, label } snapshot for the last removal
};

export function loadSaved(parse) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved?.itinerary) return initialState;
    // Re-validate: stored data is untrusted too.
    const { itinerary } = parse(JSON.stringify(saved.itinerary));
    return { ...initialState, status: 'success', prompt: saved.prompt || '', itinerary };
  } catch {
    return initialState;
  }
}

export function save(state) {
  try {
    if (state.itinerary) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ prompt: state.prompt, itinerary: state.itinerary }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* storage unavailable or full: ignore */
  }
}

const mapDay = (itinerary, dayId, fn) => ({
  ...itinerary,
  days: itinerary.days.map((d) => (d.id === dayId ? fn(d) : d)),
});

export function reducer(state, action) {
  switch (action.type) {
    case 'REQUEST':
      return { ...state, status: 'loading', prompt: action.prompt, error: null, slow: false, undo: null };
    case 'SLOW':
      return state.status === 'loading' ? { ...state, slow: true } : state;
    case 'SUCCESS':
      return { ...state, status: 'success', itinerary: action.itinerary, warnings: action.warnings, error: null, slow: false, undo: null };
    case 'FAILURE':
      // Keep any previous itinerary so a failed regenerate doesn't lose the user's work.
      return { ...state, status: 'error', error: action.error, slow: false };
    case 'CANCEL':
      return { ...state, status: state.itinerary ? 'success' : 'idle', slow: false };
    case 'DISMISS_ERROR':
      return { ...state, status: state.itinerary ? 'success' : 'idle', error: null };

    case 'REMOVE_STOP': {
      if (!state.itinerary) return state;
      const next = mapDay(state.itinerary, action.dayId, (d) => ({
        ...d,
        stops: d.stops.filter((s) => s.id !== action.stopId),
      }));
      return { ...state, itinerary: next, undo: { itinerary: state.itinerary, label: action.name } };
    }
    case 'MOVE_STOP': {
      if (!state.itinerary) return state;
      const next = mapDay(state.itinerary, action.dayId, (d) => {
        const { from, to } = action;
        if (from === to || from < 0 || to < 0 || from >= d.stops.length || to >= d.stops.length) return d;
        const stops = [...d.stops];
        const [moved] = stops.splice(from, 1);
        stops.splice(to, 0, moved);
        return { ...d, stops };
      });
      return { ...state, itinerary: next };
    }
    case 'UNDO':
      return state.undo ? { ...state, itinerary: state.undo.itinerary, undo: null } : state;
    case 'DISMISS_UNDO':
      return { ...state, undo: null };
    case 'DISMISS_WARNINGS':
      return { ...state, warnings: [] };
    case 'CLEAR':
      return initialState;
    default:
      return state;
  }
}

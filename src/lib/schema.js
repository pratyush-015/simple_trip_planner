// Turns the model's raw text into a clean, trusted itinerary - or throws an ItineraryError.
// The model's output is treated as untrusted input: every field is coerced and checked.

export class ItineraryError extends Error {
  /** kind: 'empty' | 'malformed' | 'shape' | 'refused' */
  constructor(kind, message) {
    super(message);
    this.name = 'ItineraryError';
    this.kind = kind;
  }
}

export const CATEGORIES = ['sight', 'food', 'activity', 'transport', 'lodging', 'other'];
const MAX_DAYS = 14;
const MAX_STOPS = 15;

let counter = 0;
const uid = () => `${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const text = (v, max) => {
  if (typeof v === 'string') return v.trim().slice(0, max);
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return '';
};

// Models often wrap JSON in ```json fences or add a sentence around it.
export function extractJson(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new ItineraryError('empty', 'The AI returned an empty response.');
  }
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    /* fall through to brace extraction */
  }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      /* fall through */
    }
  }
  throw new ItineraryError('malformed', 'The AI response was not valid JSON.');
}

function normalizeStop(s) {
  if (!s || typeof s !== 'object') return null;
  const name = text(s.name ?? s.title ?? s.place, 120);
  if (!name) return null;
  const category = text(s.category, 20).toLowerCase();
  const minutes = Number(s.durationMinutes);
  return {
    id: uid(),
    name,
    time: text(s.time, 20),
    category: CATEGORIES.includes(category) ? category : 'other',
    description: text(s.description, 500),
    durationMinutes: Number.isFinite(minutes) && minutes > 0 && minutes < 1440 ? Math.round(minutes) : null,
    costEstimate: text(s.costEstimate ?? s.cost, 40),
  };
}

/**
 * @returns {{ itinerary: object, warnings: string[] }}
 */
export function parseItinerary(raw) {
  const data = extractJson(raw);

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new ItineraryError('shape', 'The AI response had an unexpected structure.');
  }
  if (typeof data.error === 'string' && data.error.trim()) {
    throw new ItineraryError('refused', data.error.trim());
  }
  if (!Array.isArray(data.days)) {
    throw new ItineraryError('shape', 'The AI response had no list of days.');
  }

  let droppedStops = 0;
  const days = data.days
    .slice(0, MAX_DAYS)
    .map((d) => {
      const rawStops = Array.isArray(d?.stops) ? d.stops.slice(0, MAX_STOPS) : [];
      const stops = rawStops.map(normalizeStop).filter(Boolean);
      droppedStops += rawStops.length - stops.length;
      return { id: uid(), title: text(d?.title, 120), stops };
    })
    .filter((d) => d.stops.length > 0);

  if (days.length === 0) {
    throw new ItineraryError('empty', 'The AI returned an itinerary with no usable stops.');
  }

  const warnings = [];
  if (droppedStops > 0) {
    warnings.push(`${droppedStops} item${droppedStops > 1 ? 's' : ''} from the AI were incomplete and skipped.`);
  }
  if (days.length < data.days.length) {
    warnings.push('Some empty days were removed.');
  }

  return {
    itinerary: {
      title: text(data.title, 120) || 'Your trip',
      destination: text(data.destination, 80),
      summary: text(data.summary, 400),
      days,
    },
    warnings,
  };
}

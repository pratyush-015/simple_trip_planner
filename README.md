# Trip Planner

Describe a trip in plain language. An LLM returns a **structured JSON itinerary**, and the app renders it as an interactive, editable timeline: expand stops for details, remove stops (with undo), and reorder them. It is not a chatbot: the model's text is never shown directly, only parsed, validated data.

## Setup

Requires Node 18+.

```bash
git clone (https://github.com/pratyush-015/simple_trip_planner.git) && cd trip-planner
cp .env.example .env        #put API key in .env
npm install && npm start
```

http://localhost:5173. `npm start` runs the Vite dev server (port 5173) and the small Express backend (port 8787) together; Vite proxies `/api` to the backend.

**Getting a key:** the default is Groq's free tier (https://console.groq.com). Any OpenAI-compatible provider works by changing three env vars in `.env` 

| Command | What it does |
| --- | --- |
| `npm start` | Frontend + backend in dev mode |
| `npm test` | Unit tests for the parser/validator |
| `npm run build` | Production build into `dist/` |
| `npm run serve` | Build, then serve app + API from one Express server |

### Deploying
- **Vercel:** import the repo. `api/itinerary.js` is picked up as a serverless function and Vite as the frontend. Add `LLM_API_KEY` (and optionally `LLM_BASE_URL`, `LLM_MODEL`) in Project Settings, Environment Variables.

## How it works

```
browser (React)  --POST /api/itinerary {prompt}-->  Express / serverless fn  --> LLM provider
      ^                                                    |  (holds API key, 40s timeout)
      |<------------- { content: "<raw model text>" } -----+
 parseItinerary(): extract JSON -> validate -> normalise -> state
```

- **API key stays on the server.** The browser only talks to `/api/itinerary`.
- The server prompts for a fixed JSON schema (and uses the provider's JSON mode where available), but **the client treats the output as untrusted** and validates everything in `src/lib/schema.js`.
- State lives in one reducer (`src/lib/plannerReducer.js`): request status plus the editable itinerary. `useTripPlanner` wraps it and owns request lifecycle.

```
server/   llm.js (provider call + prompt), handler.js (validation, error mapping), index.js (Express)
api/      itinerary.js (Vercel entry, same handler)
src/lib/  schema.js, api.js, plannerReducer.js, useTripPlanner.js
src/components/  PromptForm, Itinerary (DayCard/StopCard), StatusViews
tests/    schema.test.js
```

## Handling bad AI output

| Failure | What happens |
| --- | --- |
| Malformed JSON / wrapped in ```json fences or prose | Fences and surrounding text are stripped; if still unparseable, one automatic retry, then an error with **Try again** |
| Wrong shape (not an object, `days` missing) | Same: rejected, retried once, then error |
| Empty response or no usable stops | Same |
| Some stops invalid (missing name, bad types) | Bad stops are dropped, fields coerced (unknown category becomes "other"), and a dismissible warning says how many were skipped |
| Model says it is not a trip request | The model can return `{"error": "..."}`; shown to the user without retrying |
| Slow response | "Taking longer than usual" message after 8s, a **Cancel** button, and a hard 45s client timeout (40s server-side) |
| Provider/network failure, rate limit, bad key | Mapped to specific messages with **Try again** |
| Stale responses | Every request gets an id; a new request aborts the previous fetch, and only the latest id may update state. Cancel invalidates the in-flight request too |
| Failed regenerate | The previous itinerary is kept on screen |
| Corrupt saved session | Re-validated on load; discarded if invalid |

Loading (skeleton), error and empty states are all implemented. The layout is responsive, with 44px touch targets, ↑/↓ buttons for reordering on touch and keyboard, plus drag-and-drop on desktop.

Extras: the session is saved to `localStorage` and restored on reload, dark mode follows the system setting, and reduced-motion is respected.

## AI usage note

I used Claude to help draft the code and review server files, run the app and tests. The provider call is plain `fetch`; no AI SDK is used, so there is no hidden structured-output or streaming behaviour.

## Known limitations

- No streaming and no follow-up refinement loop; each submit regenerates the whole plan.
- Reordering works within a day only (no moving a stop to another day) and days cannot be removed.
- Places, times, distances and costs come from the model and are not verified. Always double-check before booking.
- Validation is hand-written, not schema-library based, and checks shape, not factual quality.
- No rate limiting on the backend, so add one before exposing a paid key publicly.
- Drag-and-drop is desktop-only (HTML5 DnD); touch users use the arrow buttons.
- Parser and provider integration have automated tests. UI behaviour still needs manual verification.

## Time spent
Planning 1h
Backend 2h, 
Parsing and State 2h, 
UI 2h, 
README 0.5h.

## What I'd do next

Streaming the itinerary day by day, a refinement prompt that edits the existing plan, moving stops between days, component tests with React Testing Library, and a rate limiter on the API.


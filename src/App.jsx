import { useTripPlanner } from './lib/useTripPlanner.js';
import PromptForm from './components/PromptForm.jsx';
import Itinerary from './components/Itinerary.jsx';
import { EmptyState, ErrorBanner, LoadingState, UndoToast, Warnings } from './components/StatusViews.jsx';

export default function App() {
  const { state, dispatch, generate, cancel } = useTripPlanner();
  const { status, itinerary, error, warnings, undo, slow, prompt } = state;
  const loading = status === 'loading';

  return (
    <div className="app">
      <header className="masthead">
        <h1>Trip Planner</h1>
        <p>Describe a trip in your own words. Then reorder, trim and open up the plan.</p>
      </header>

      <PromptForm initialPrompt={prompt} loading={loading} hasResult={!!itinerary} onSubmit={generate} />

      <main aria-live="polite">
        {status === 'error' && (
          <ErrorBanner
            error={error}
            onRetry={() => generate(prompt)}
            onDismiss={() => dispatch({ type: 'DISMISS_ERROR' })}
          />
        )}

        {loading && <LoadingState slow={slow} onCancel={cancel} />}

        {!loading && warnings.length > 0 && (
          <Warnings warnings={warnings} onDismiss={() => dispatch({ type: 'DISMISS_WARNINGS' })} />
        )}

        {!loading && itinerary && <Itinerary itinerary={itinerary} dispatch={dispatch} />}

        {!loading && !itinerary && status !== 'error' && <EmptyState onPick={generate} />}
      </main>

      {undo && (
        <UndoToast
          label={undo.label}
          onUndo={() => dispatch({ type: 'UNDO' })}
          onDismiss={() => dispatch({ type: 'DISMISS_UNDO' })}
        />
      )}
    </div>
  );
}

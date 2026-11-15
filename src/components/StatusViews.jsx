const EXAMPLES = [
  '3 days in Kyoto in autumn, temples, quiet gardens and good ramen',
  'Long weekend in Lisbon with a friend, food and viewpoints, mid-range budget',
  '5 days in Iceland in summer, road trip, waterfalls and hot springs',
];

export function EmptyState({ onPick }) {
  return (
    <section className="empty" aria-label="No itinerary yet">
      <h2>No trip yet</h2>
      <p>Write where you want to go above, or start from an example:</p>
      <ul>
        {EXAMPLES.map((ex) => (
          <li key={ex}>
            <button type="button" className="chip" onClick={() => onPick(ex)}>
              {ex}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LoadingState({ slow, onCancel }) {
  return (
    <section className="loading" aria-busy="true" aria-label="Planning your trip">
      <div className="loading-head">
        <span className="spinner" aria-hidden="true" />
        <div>
          <strong>Planning your trip…</strong>
          {slow && <p>This is taking longer than usual. You can keep waiting or cancel.</p>}
        </div>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
      {[0, 1].map((i) => (
        <div className="skeleton-day" key={i} aria-hidden="true">
          <div className="sk sk-title" />
          <div className="sk sk-line" />
          <div className="sk sk-line short" />
          <div className="sk sk-line" />
        </div>
      ))}
    </section>
  );
}

export function ErrorBanner({ error, onRetry, onDismiss }) {
  return (
    <div className="banner error" role="alert">
      <div>
        <strong>The plan could not be created</strong>
        <p>{error?.message}</p>
      </div>
      <div className="banner-actions">
        {error?.retryable && (
          <button type="button" className="primary small" onClick={onRetry}>
            Try again
          </button>
        )}
        <button type="button" className="ghost small" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function Warnings({ warnings, onDismiss }) {
  return (
    <div className="banner warn" role="status">
      <p>{warnings.join(' ')}</p>
      <button type="button" className="ghost small" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}

export function UndoToast({ label, onUndo, onDismiss }) {
  return (
    <div className="toast" role="status">
      <span>Removed “{label}”</span>
      <button type="button" onClick={onUndo}>
        Undo
      </button>
      <button type="button" aria-label="Dismiss" onClick={onDismiss}>
        ✕
      </button>
    </div>
  );
}

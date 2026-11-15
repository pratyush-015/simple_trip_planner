import { useRef, useState } from 'react';

const CATEGORY_LABEL = {
  sight: 'Sight',
  food: 'Food',
  activity: 'Activity',
  transport: 'Transport',
  lodging: 'Stay',
  other: 'Other',
};

function StopCard({ stop, index, count, dayId, dispatch, dragProps }) {
  const [open, setOpen] = useState(false);
  const detailsId = `stop-${stop.id}`;
  const meta = [stop.durationMinutes && `${stop.durationMinutes} min`, stop.costEstimate].filter(Boolean);

  return (
    <li className={`stop cat-${stop.category}`} {...dragProps}>
      <div className="stop-time">{stop.time || '–'}</div>
      <div className="stop-body">
        <div className="stop-head">
          <button
            type="button"
            className="stop-toggle"
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="stop-name">{stop.name}</span>
            <span className="badge">{CATEGORY_LABEL[stop.category]}</span>
            <span className={`chev ${open ? 'open' : ''}`} aria-hidden="true">
              ›
            </span>
          </button>
          <div className="stop-actions">
            <button
              type="button"
              aria-label={`Move ${stop.name} earlier`}
              disabled={index === 0}
              onClick={() => dispatch({ type: 'MOVE_STOP', dayId, from: index, to: index - 1 })}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Move ${stop.name} later`}
              disabled={index === count - 1}
              onClick={() => dispatch({ type: 'MOVE_STOP', dayId, from: index, to: index + 1 })}
            >
              ↓
            </button>
            <button
              type="button"
              className="danger"
              aria-label={`Remove ${stop.name}`}
              onClick={() => dispatch({ type: 'REMOVE_STOP', dayId, stopId: stop.id, name: stop.name })}
            >
              ✕
            </button>
          </div>
        </div>
        {open && (
          <div id={detailsId} className="stop-details">
            {stop.description ? <p>{stop.description}</p> : <p className="muted">No description provided.</p>}
            {meta.length > 0 && <p className="muted">{meta.join(' · ')}</p>}
          </div>
        )}
      </div>
    </li>
  );
}

function DayCard({ day, dayNumber, dispatch }) {
  const dragFrom = useRef(null);
  const [overIndex, setOverIndex] = useState(null);

  // Native drag-and-drop for desktop; the ↑ ↓ buttons cover touch and keyboard.
  const dragProps = (index) => ({
    draggable: true,
    onDragStart: (e) => {
      dragFrom.current = index;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    },
    onDragOver: (e) => {
      if (dragFrom.current === null) return;
      e.preventDefault();
      setOverIndex(index);
    },
    onDrop: (e) => {
      e.preventDefault();
      if (dragFrom.current !== null) dispatch({ type: 'MOVE_STOP', dayId: day.id, from: dragFrom.current, to: index });
      dragFrom.current = null;
      setOverIndex(null);
    },
    onDragEnd: () => {
      dragFrom.current = null;
      setOverIndex(null);
    },
  });

  return (
    <section className="day" aria-labelledby={`day-${day.id}`}>
      <h3 id={`day-${day.id}`}>
        <span className="day-num">Day {dayNumber}</span>
        {day.title && <span className="day-title">{day.title}</span>}
      </h3>
      {day.stops.length === 0 ? (
        <p className="muted day-empty">All stops removed for this day.</p>
      ) : (
        <ol className="stops">
          {day.stops.map((stop, i) => (
            <StopCard
              key={stop.id}
              stop={stop}
              index={i}
              count={day.stops.length}
              dayId={day.id}
              dispatch={dispatch}
              dragProps={{ ...dragProps(i), 'data-over': overIndex === i ? 'true' : undefined }}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

export default function Itinerary({ itinerary, dispatch }) {
  const total = itinerary.days.reduce((n, d) => n + d.stops.length, 0);

  return (
    <article className="itinerary">
      <header className="it-head">
        <h2>{itinerary.title}</h2>
        {itinerary.destination && <p className="dest">{itinerary.destination}</p>}
        {itinerary.summary && <p className="summary">{itinerary.summary}</p>}
        <p className="muted">
          {itinerary.days.length} day{itinerary.days.length !== 1 && 's'}, {total} stop{total !== 1 && 's'}
        </p>
      </header>
      {total === 0 && (
        <div className="empty small-empty">
          <p>You removed every stop. Use Undo, or plan the trip again.</p>
        </div>
      )}
      {itinerary.days.map((day, i) => (
        <DayCard key={day.id} day={day} dayNumber={i + 1} dispatch={dispatch} />
      ))}
    </article>
  );
}

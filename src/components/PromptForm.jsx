import { useEffect, useState } from 'react';

const MIN = 10;
const MAX = 1000;

export default function PromptForm({ initialPrompt, loading, hasResult, onSubmit }) {
  const [value, setValue] = useState(initialPrompt);

  // Keep the box in sync when a saved session or example prompt fills it in.
  useEffect(() => setValue(initialPrompt), [initialPrompt]);

  const trimmed = value.trim();
  const tooShort = trimmed.length < MIN;

  const submit = (e) => {
    e.preventDefault();
    if (!tooShort && !loading) onSubmit(trimmed);
  };

  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(e);
  };

  return (
    <form className="prompt" onSubmit={submit}>
      <label htmlFor="trip-input">Where are you going, and what do you like?</label>
      <textarea
        id="trip-input"
        rows={4}
        maxLength={MAX}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="e.g. 4 days in Lisbon in May, love food and viewpoints, travelling with a friend on a mid-range budget"
      />
      <div className="prompt-row">
        <span className="hint">
          {tooShort && trimmed.length > 0 ? `Add a little more detail (${MIN - trimmed.length} more characters)` : `${value.length}/${MAX}`}
        </span>
        <button type="submit" className="primary" disabled={tooShort || loading}>
          {loading ? 'Planning…' : hasResult ? 'Plan again' : 'Plan my trip'}
        </button>
      </div>
    </form>
  );
}

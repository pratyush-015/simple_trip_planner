import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseItinerary, ItineraryError } from '../src/lib/schema.js';

const good = {
  title: 'Lisbon', destination: 'Portugal', summary: 'x',
  days: [{ title: 'Alfama', stops: [{ name: 'Castle', time: '09:00', category: 'sight', description: 'd' }] }],
};
const kind = (raw) => { try { parseItinerary(raw); } catch (e) { return e instanceof ItineraryError ? e.kind : 'other'; } return 'none'; };

test('parses valid JSON', () => {
  const { itinerary, warnings } = parseItinerary(JSON.stringify(good));
  assert.equal(itinerary.days[0].stops[0].name, 'Castle');
  assert.equal(warnings.length, 0);
});
test('handles markdown fences and surrounding prose', () => {
  assert.equal(parseItinerary('```json\n' + JSON.stringify(good) + '\n```').itinerary.title, 'Lisbon');
  assert.equal(parseItinerary('Here you go: ' + JSON.stringify(good) + ' Enjoy!').itinerary.title, 'Lisbon');
});
test('empty and whitespace responses', () => {
  assert.equal(kind(''), 'empty');
  assert.equal(kind('   '), 'empty');
  assert.equal(kind(undefined), 'empty');
});
test('malformed JSON', () => assert.equal(kind('{"days": [ {'), 'malformed'));
test('wrong shape', () => {
  assert.equal(kind('[1,2,3]'), 'shape');
  assert.equal(kind('{"days": "nope"}'), 'shape');
  assert.equal(kind('null'), 'shape');
});
test('no usable stops', () => assert.equal(kind('{"days":[{"stops":[]},{"stops":[{"foo":1}]}]}'), 'empty'));
test('model-declared refusal', () => assert.equal(kind('{"error":"Not a trip request"}'), 'refused'));
test('drops bad stops, coerces fields, warns', () => {
  const raw = JSON.stringify({ days: [{ stops: [{ name: 'A', category: 'weird', durationMinutes: '30' }, { name: '' }, 5] }] });
  const { itinerary, warnings } = parseItinerary(raw);
  assert.equal(itinerary.days[0].stops.length, 1);
  assert.equal(itinerary.days[0].stops[0].category, 'other');
  assert.equal(itinerary.days[0].stops[0].durationMinutes, 30);
  assert.equal(itinerary.title, 'Your trip');
  assert.equal(warnings.length, 1);
});

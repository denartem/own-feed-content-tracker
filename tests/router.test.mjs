import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, tournamentHref, contentTypeHref } from '../js/ui/router.js';

test('маршрути', () => {
  assert.deepEqual(parseRoute(''), { name: 'overview', params: {} });
  assert.deepEqual(parseRoute('#/t/demo-sport-demo-pairs-cup?tab=pool&view=table'),
    { name: 'tournament', id: 'demo-sport-demo-pairs-cup', params: { tab: 'pool', view: 'table' } });
  assert.deepEqual(parseRoute('#/ct/demo-pairs'), { name: 'contentType', id: 'demo-pairs', params: {} });
  assert.deepEqual(parseRoute('#/search?q=Ol%C3%ADmpico'), { name: 'search', params: { q: 'Olímpico' } });
  assert.deepEqual(parseRoute('#/new?kind=type'), { name: 'new', params: { kind: 'type' } });
  assert.equal(parseRoute('#/settings').name, 'settings');
  assert.equal(parseRoute('#/unknown').name, 'overview');
});

test('посилання', () => {
  assert.equal(tournamentHref('a b', { tab: 'pool' }), '#/t/a%20b?tab=pool');
  assert.equal(tournamentHref('x'), '#/t/x');
  assert.equal(contentTypeHref('demo-pairs'), '#/ct/demo-pairs');
});

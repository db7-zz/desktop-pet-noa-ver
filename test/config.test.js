const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSettings } = require('../src/config');

test('invalid settings fall back safely', () => {
  assert.deepEqual(normalizeSettings({ scale: 'huge', muted: 1, position: { x: 'x', y: 2 } }), {
    scale: 'medium', muted: true, autoStart: false, position: null
  });
});

test('valid persisted position is rounded', () => {
  assert.deepEqual(normalizeSettings({ scale: 'small', position: { x: 1.2, y: 9.8 } }).position, { x: 1, y: 10 });
});

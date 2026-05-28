const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isObjectRecord,
  toNonNegativeInt,
  toPositiveInt,
  normalizeTimelineDuration,
  normalizeComment,
  validatePassword,
  validateProjectPatch,
  PROJECT_TAB_IDS
} = require('../src/validate');

// ─── isObjectRecord ───────────────────────────────────────────────────────────
test('isObjectRecord: plain object → true', () => {
  assert.equal(isObjectRecord({}), true);
  assert.equal(isObjectRecord({ a: 1 }), true);
});
test('isObjectRecord: array → false', () => assert.equal(isObjectRecord([]), false));
test('isObjectRecord: null → false', () => assert.equal(isObjectRecord(null), false));
test('isObjectRecord: string → false', () => assert.equal(isObjectRecord('x'), false));

// ─── toNonNegativeInt ─────────────────────────────────────────────────────────
test('toNonNegativeInt: 0 → 0', () => assert.equal(toNonNegativeInt(0), 0));
test('toNonNegativeInt: 3.9 → 3 (floor)', () => assert.equal(toNonNegativeInt(3.9), 3));
test('toNonNegativeInt: negative → null', () => assert.equal(toNonNegativeInt(-1), null));
test('toNonNegativeInt: NaN → null', () => assert.equal(toNonNegativeInt(NaN), null));
test('toNonNegativeInt: "42" → 42', () => assert.equal(toNonNegativeInt('42'), 42));

// ─── toPositiveInt ────────────────────────────────────────────────────────────
test('toPositiveInt: 1 → 1', () => assert.equal(toPositiveInt(1), 1));
test('toPositiveInt: 0 → null', () => assert.equal(toPositiveInt(0), null));
test('toPositiveInt: -5 → null', () => assert.equal(toPositiveInt(-5), null));
test('toPositiveInt: 2.7 → 2 (floor)', () => assert.equal(toPositiveInt(2.7), 2));

// ─── normalizeTimelineDuration ────────────────────────────────────────────────
test('normalizeTimelineDuration: 120 → 120', () => {
  assert.equal(normalizeTimelineDuration(120), 120);
});
test('normalizeTimelineDuration: 0 → 205 (default)', () => {
  assert.equal(normalizeTimelineDuration(0), 205);
});
test('normalizeTimelineDuration: -10 → 205 (default)', () => {
  assert.equal(normalizeTimelineDuration(-10), 205);
});
test('normalizeTimelineDuration: "300" → 300', () => {
  assert.equal(normalizeTimelineDuration('300'), 300);
});

// ─── validatePassword ─────────────────────────────────────────────────────────
test('validatePassword: valid password → null', () => {
  assert.equal(validatePassword('secret12'), null);
});
test('validatePassword: missing → error', () => {
  assert.ok(validatePassword(undefined));
  assert.ok(validatePassword(''));
});
test('validatePassword: too short → error', () => {
  assert.ok(validatePassword('ab1'));
});
test('validatePassword: no digit → error', () => {
  assert.ok(validatePassword('secretpass'));
});

// ─── normalizeComment ─────────────────────────────────────────────────────────
test('normalizeComment: valid comment → normalized object', () => {
  const result = normalizeComment({
    id: 1, tabId: 'edit', user: 'Alex',
    text: 'Nice cut', timestamp: '2025-01-01T00:00:00.000Z'
  });
  assert.ok(result);
  assert.equal(result.id, 1);
  assert.equal(result.resolved, false);
});
test('normalizeComment: invalid tabId → null', () => {
  assert.equal(normalizeComment({
    id: 1, tabId: 'unknown', user: 'x',
    text: 'y', timestamp: 'z'
  }), null);
});
test('normalizeComment: non-object → null', () => {
  assert.equal(normalizeComment(null), null);
  assert.equal(normalizeComment('text'), null);
});

// ─── PROJECT_TAB_IDS ──────────────────────────────────────────────────────────
test('PROJECT_TAB_IDS contains all expected tabs', () => {
  const expected = ['edit', 'script', 'director', 'costumes', 'makeup', 'sound', 'manager'];
  for (const id of expected) {
    assert.ok(PROJECT_TAB_IDS.has(id), `expected "${id}" in PROJECT_TAB_IDS`);
  }
});

// ─── validateProjectPatch ─────────────────────────────────────────────────────
test('validateProjectPatch: empty object → empty patch', () => {
  const { patch, error } = validateProjectPatch({});
  assert.equal(error, undefined);
  assert.deepEqual(patch, {});
});

test('validateProjectPatch: non-object → error', () => {
  assert.ok(validateProjectPatch(null).error);
  assert.ok(validateProjectPatch([]).error);
  assert.ok(validateProjectPatch('string').error);
});

test('validateProjectPatch: name trimmed and capped at 200 chars', () => {
  const { patch } = validateProjectPatch({ name: '  My Film  ' });
  assert.equal(patch.name, 'My Film');
});

test('validateProjectPatch: empty name → error', () => {
  assert.ok(validateProjectPatch({ name: '   ' }).error);
});

test('validateProjectPatch: valid timelineDuration', () => {
  const { patch } = validateProjectPatch({ timelineDuration: 240 });
  assert.equal(patch.timelineDuration, 240);
});

test('validateProjectPatch: invalid timelineDuration → default 205', () => {
  const { patch } = validateProjectPatch({ timelineDuration: -1 });
  assert.equal(patch.timelineDuration, 205);
});

test('validateProjectPatch: valid markers array', () => {
  const { patch, error } = validateProjectPatch({
    markers: [{
      id: 1, time: 30, color: '#FF0000',
      title: 'Cut here', comment: 'Sharp cut',
      user: 'Director', icon: 'director', tabId: 'edit'
    }]
  });
  assert.equal(error, undefined);
  assert.equal(patch.markers.length, 1);
  assert.equal(patch.markers[0].id, 1);
});

test('validateProjectPatch: marker with invalid tabId → error', () => {
  assert.ok(validateProjectPatch({
    markers: [{
      id: 1, time: 0, color: '#f00', title: 'x',
      comment: 'y', user: 'z', icon: 'i', tabId: 'INVALID'
    }]
  }).error);
});

test('validateProjectPatch: markers must be array', () => {
  assert.ok(validateProjectPatch({ markers: 'not-array' }).error);
});

test('validateProjectPatch: valid tasks array', () => {
  const { patch, error } = validateProjectPatch({
    tasks: [{
      id: 'task_1', title: 'Write script',
      status: 'todo', priority: 'high', department: 'script',
      createdAt: '2025-01-01T00:00:00.000Z'
    }]
  });
  assert.equal(error, undefined);
  assert.equal(patch.tasks.length, 1);
  assert.equal(patch.tasks[0].title, 'Write script');
});

test('validateProjectPatch: task with invalid status → error', () => {
  assert.ok(validateProjectPatch({
    tasks: [{ id: 't1', title: 'x', status: 'INVALID', priority: 'low', department: 'edit' }]
  }).error);
});

test('validateProjectPatch: valid makeupLooks array', () => {
  const { patch, error } = validateProjectPatch({
    makeupLooks: [{
      id: 1, name: 'Day look',
      products: [{ id: 1, zone: 'eyes', productName: 'Mascara', colorHex: '#000', technique: '' }],
      status: 'ready'
    }]
  });
  assert.equal(error, undefined);
  assert.equal(patch.makeupLooks[0].name, 'Day look');
  assert.equal(patch.makeupLooks[0].products[0].zone, 'eyes');
});

test('validateProjectPatch: valid costumeOutfits array', () => {
  const { patch, error } = validateProjectPatch({
    costumeOutfits: [{
      id: 1, name: 'Suit',
      garments: [{ id: 1, category: 'top', name: 'Jacket', colorHex: '#333', material: 'Wool', brand: '', acquisition: 'owned', price: 5000, notes: '' }],
      status: 'approved'
    }]
  });
  assert.equal(error, undefined);
  assert.equal(patch.costumeOutfits[0].garments[0].category, 'top');
  assert.equal(patch.costumeOutfits[0].garments[0].price, 5000);
});

test('validateProjectPatch: scriptParams passthrough', () => {
  const sp = { actorsCount: 5, genre: 'Драма' };
  const { patch } = validateProjectPatch({ scriptParams: sp });
  assert.deepEqual(patch.scriptParams, sp);
});

test('validateProjectPatch: storyboardGrid passthrough', () => {
  const sg = { locationNames: ['Ресторан'], columnCount: 3, cells: {} };
  const { patch } = validateProjectPatch({ storyboardGrid: sg });
  assert.deepEqual(patch.storyboardGrid, sg);
});

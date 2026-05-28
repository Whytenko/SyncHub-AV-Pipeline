const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword, nowISO, createId, sanitizeUser } = require('../src/db');

// ─── Password hashing ─────────────────────────────────────────────────────────
test('hashPassword + verifyPassword: valid password is accepted', () => {
  const password = 'secret-123';
  const hash = hashPassword(password);
  assert.equal(verifyPassword(password, hash), true);
});

test('verifyPassword: invalid password is rejected', () => {
  const hash = hashPassword('correct-password');
  assert.equal(verifyPassword('wrong-password', hash), false);
});

test('hashPassword: same password produces different hashes (random salt)', () => {
  const hash1 = hashPassword('same-password');
  const hash2 = hashPassword('same-password');
  assert.notEqual(hash1, hash2, 'hashes must differ due to random salt');
  // but both must verify correctly
  assert.equal(verifyPassword('same-password', hash1), true);
  assert.equal(verifyPassword('same-password', hash2), true);
});

test('verifyPassword: empty string hash returns false', () => {
  assert.equal(verifyPassword('any', ''), false);
});

test('verifyPassword: malformed hash (no colon) returns false', () => {
  assert.equal(verifyPassword('any', 'nocolonhere'), false);
});

// ─── nowISO ───────────────────────────────────────────────────────────────────
test('nowISO returns ISO-8601 timestamp string', () => {
  const value = nowISO();
  assert.equal(Number.isNaN(Date.parse(value)), false);
  assert.match(value, /^\d{4}-\d{2}-\d{2}T/);
});

test('nowISO values are monotonically non-decreasing', () => {
  const t1 = new Date(nowISO()).getTime();
  const t2 = new Date(nowISO()).getTime();
  assert.ok(t2 >= t1, 't2 should be >= t1');
});

// ─── createId ─────────────────────────────────────────────────────────────────
test('createId returns string starting with given prefix', () => {
  const id = createId('usr');
  assert.ok(id.startsWith('usr_'), `expected "usr_..." prefix, got "${id}"`);
});

test('createId generates unique values', () => {
  const ids = new Set(Array.from({ length: 20 }, () => createId('x')));
  assert.equal(ids.size, 20, 'all 20 IDs must be unique');
});

// ─── sanitizeUser ─────────────────────────────────────────────────────────────
test('sanitizeUser removes passwordHash', () => {
  const user = { id: 'usr_1', nickname: 'test', passwordHash: 'abc:def' };
  const result = sanitizeUser(user);
  assert.ok(!('passwordHash' in result), 'passwordHash must be removed');
  assert.equal(result.nickname, 'test');
  assert.equal(result.id, 'usr_1');
});

test('sanitizeUser returns null for null input', () => {
  assert.equal(sanitizeUser(null), null);
});

test('sanitizeUser does not mutate the original object', () => {
  const user = { id: 'usr_1', nickname: 'test', passwordHash: 'abc:def' };
  sanitizeUser(user);
  assert.ok('passwordHash' in user, 'original must still have passwordHash');
});

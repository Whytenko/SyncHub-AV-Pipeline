const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword, nowISO } = require('../src/db');

test('hashPassword + verifyPassword: valid password is accepted', () => {
  const password = 'secret-123';
  const hash = hashPassword(password);
  assert.equal(verifyPassword(password, hash), true);
});

test('verifyPassword: invalid password is rejected', () => {
  const hash = hashPassword('correct-password');
  assert.equal(verifyPassword('wrong-password', hash), false);
});

test('nowISO returns ISO-8601 timestamp string', () => {
  const value = nowISO();
  assert.equal(Number.isNaN(Date.parse(value)), false);
  assert.match(value, /^\d{4}-\d{2}-\d{2}T/);
});

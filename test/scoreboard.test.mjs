import { test } from 'node:test';
import assert from 'node:assert/strict';
import { devotionalStreak, devotionalStatus, videoStatus, essayStatus } from '../assets/scoreboard.js';

test('streak counts consecutive days ending today', () => {
  const dates = ['2026-05-30', '2026-05-31', '2026-06-01'];
  assert.equal(devotionalStreak(dates, '2026-06-01'), 3);
});

test('streak survives one grace day (today missing, yesterday posted)', () => {
  const dates = ['2026-05-30', '2026-05-31'];
  assert.equal(devotionalStreak(dates, '2026-06-01'), 2);
});

test('streak is 0 when today and yesterday both missing', () => {
  const dates = ['2026-05-28', '2026-05-29'];
  assert.equal(devotionalStreak(dates, '2026-06-01'), 0);
});

test('streak ignores a gap', () => {
  const dates = ['2026-05-28', '2026-05-31', '2026-06-01'];
  assert.equal(devotionalStreak(dates, '2026-06-01'), 2);
});

test('devotionalStatus reports posted-today / grace / missed', () => {
  assert.equal(devotionalStatus(['2026-06-01'], '2026-06-01').status, 'posted-today');
  assert.equal(devotionalStatus(['2026-05-31'], '2026-06-01').status, 'grace');
  assert.equal(devotionalStatus(['2026-05-29'], '2026-06-01').status, 'missed');
});

test('videoStatus on-track within 7 days, due after', () => {
  assert.equal(videoStatus('2026-05-28', '2026-06-01').status, 'on-track');
  assert.equal(videoStatus('2026-05-28', '2026-06-01').daysLeft, 3);
  assert.equal(videoStatus('2026-05-20', '2026-06-01').status, 'due');
});

test('essayStatus done when in current calendar month, else due', () => {
  assert.equal(essayStatus('2026-06-01', '2026-06-15').status, 'done');
  assert.equal(essayStatus('2026-05-31', '2026-06-15').status, 'due');
});

test('streak is 0 for an empty dates array', () => {
  assert.equal(devotionalStreak([], '2026-06-01'), 0);
});

test('devotionalStatus during grace exposes the protected streak count', () => {
  // today (2026-06-01) not yet posted, but a 2-day streak through yesterday is protected
  const result = devotionalStatus(['2026-05-31', '2026-05-30'], '2026-06-01');
  assert.equal(result.status, 'grace');
  assert.equal(result.streak, 2);
});

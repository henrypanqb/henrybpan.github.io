import { test } from 'node:test';
import assert from 'node:assert/strict';
import { itemMacros, sumMacros, EMPTY, vsTarget } from '../../nutrition/calc.js';

const food = { calories: 200, protein: 18, fat: 10, carb: 10 };

test('itemMacros scales a food by servings', () => {
  assert.deepEqual(itemMacros(food, 0.75), { calories: 150, protein: 13.5, fat: 7.5, carb: 7.5 });
});

test('itemMacros of a missing food is zero', () => {
  assert.deepEqual(itemMacros(null, 3), EMPTY);
});

test('sumMacros adds a list of macro objects', () => {
  const total = sumMacros([
    { calories: 150, protein: 13.5, fat: 7.5, carb: 7.5 },
    { calories: 33, protein: 0, fat: 0, carb: 8.2 },
  ]);
  assert.deepEqual(total, { calories: 183, protein: 13.5, fat: 7.5, carb: 15.7 });
});

test('sumMacros of empty list is EMPTY', () => {
  assert.deepEqual(sumMacros([]), EMPTY);
});

test('vsTarget reports actual, target, pct and met', () => {
  const r = vsTarget({ calories: 3150, protein: 135, fat: 105, carb: 306 },
                     { calories: 3150, protein: 135, fat: 105, carb: 306 });
  assert.equal(r.calories.pct, 100);
  assert.equal(r.protein.met, true);
});

test('vsTarget handles a null target as pct 0, not met', () => {
  const r = vsTarget({ calories: 500, protein: 0, fat: 0, carb: 0 }, null);
  assert.equal(r.calories.pct, 0);
  assert.equal(r.calories.met, false);
});

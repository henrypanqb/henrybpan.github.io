const { test, expect } = require('@playwright/test');

// Requires a pre-authenticated Supabase session saved to tests/nutrition/auth.json
// (created once from a signed-in browser via `context.storageState({ path: … })`),
// plus a static server on :8000 — `python3 -m http.server 8000` from the repo root.
test.use({ storageState: 'tests/nutrition/auth.json' });

test('adding an item to a plan updates the meal total', async ({ page }) => {
  await page.goto('http://localhost:8000/nutrition/#/plans');

  const planName = 'Smoke Plan ' + Date.now();
  await page.getByPlaceholder('New plan name').fill(planName);
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('link', { name: planName }).click();

  await page.getByRole('button', { name: '+ add' }).first().click();
  await page.getByPlaceholder('Search food').fill('Greek');
  await page.locator('.pick-list li').first().click();
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.locator('.meal-head .num').first()).not.toContainText('0 cal');
});

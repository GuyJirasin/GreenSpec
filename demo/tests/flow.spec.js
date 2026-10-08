import { test, expect } from '@playwright/test';

test('create, analyze, compare, edit wording and accept revision without document', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'New analysis', exact: true }).click();
  await page.getByLabel('Project name *').fill('React flow test');
  await page.getByRole('button', { name: 'Continue to documents' }).click();
  await expect(page.getByRole('heading', { name: 'Create a new project' })).toBeVisible();
  await page.getByLabel('Project description *').fill('Optimize the office specification');
  await page.getByLabel('Location (optional)').fill('');
  await page.getByRole('button', { name: 'Continue to documents' }).click();
  await expect(page.getByRole('button', { name: 'Analyze project' })).toBeDisabled();
  await page.getByRole('button', { name: 'Use sample documents' }).click();
  await page.getByRole('button', { name: 'Analyze project' }).click();
  await expect(page.getByRole('heading', { name: 'Recommendations', exact: true })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Accept', exact: true }).first().click();
  await page.getByRole('button', { name: 'Compare', exact: true }).first().click();
  await page.getByRole('button', { name: 'Unlock to edit' }).click();
  await page.getByRole('button', { name: 'Select Option B' }).click();
  await expect(page.getByRole('button', { name: 'Confirm and accept' })).toBeDisabled();
  await page.getByRole('dialog').getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Confirm and accept' }).click();
  await page.getByRole('button', { name: 'Selected Spec (1)', exact: true }).click();
  await expect(page.getByText('−315 tCO₂e', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Additional cost', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Revised Specification', exact: true }).click();
  await page.getByRole('button', { name: 'Unlock wording to edit' }).click();
  await page.getByLabel('Revised requirement · editable').fill('Edited sample specification for review.');
  await page.getByRole('button', { name: 'Review revision summary', exact: true }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Accept Revision', exact: true }).click();
  await page.getByRole('button', { name: 'Finish without document' }).click();
  await expect(page.getByRole('heading', { name: 'Revision completed' })).toBeVisible();
  await page.getByRole('button', { name: 'Selected Spec (1)', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove', exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('manual review, blocked acceptance, rejection and filter states', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore sample analysis' }).click();
  await page.getByRole('button', { name: 'View recommendations' }).click();
  await page.getByRole('button', { name: 'Accept', exact: true }).nth(3).click();
  await expect(page.getByRole('dialog')).toContainText('Acceptance blocked');
  await page.getByRole('button', { name: 'Save for review' }).click();
  await page.getByRole('button', { name: 'Accept', exact: true }).nth(2).click();
  await page.getByRole('dialog').getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Confirm and accept' }).click();
  await page.getByRole('button', { name: 'Reject', exact: true }).first().click();
  await page.getByRole('dialog').getByLabel('Reason').selectOption('Engineering concern');
  await page.getByRole('dialog').getByRole('button', { name: 'Reject', exact: true }).click();
  await page.getByLabel('All materials').selectOption('Steel');
  await page.getByLabel('All risks').selectOption('High');
  await expect(page.getByRole('heading', { name: 'No matching recommendations' })).toBeVisible();
});

for (const [scenario, heading] of [['failed','Analysis could not be completed'], ['missing','More information is needed'], ['none','No recommendations found']]) {
  test(`analysis scenario: ${scenario}`, async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('DEMO SCENARIO').selectOption(scenario);
    await page.getByRole('button', { name: 'Explore sample analysis' }).click();
    await page.getByRole('button', { name: 'Documents', exact: true }).click();
    await page.getByRole('button', { name: 'Use sample documents' }).click();
    await page.getByRole('button', { name: 'Analyze project' }).click();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible({ timeout: 15000 });
  });
}

test('responsive dashboard has no horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Build better. Specify greener.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

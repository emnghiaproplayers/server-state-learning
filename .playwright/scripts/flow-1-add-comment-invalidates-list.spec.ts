import { test, expect } from '@playwright/test';

test('flow 1 - add comment invalidates list', async ({ page }) => {
  // Capture console and page errors
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER EXCEPTION:', err.message));

  // Navigate to frontend
  await page.goto('http://localhost:3001');

  const uniqueAuthor = `Author-${Date.now()}`;
  const uniqueBody = `Body-${Date.now()}`;

  // Fill in inputs
  await page.fill('input[name="author"]', uniqueAuthor);
  await page.fill('input[name="body"]', uniqueBody);

  // Click submit button
  await page.click('button[type="submit"]');

  // Verify the new comment is visible in the list without page reload
  const list = page.locator('[data-testid="comments-list"]');
  await expect(list).toContainText(uniqueAuthor);
  await expect(list).toContainText(uniqueBody);
});

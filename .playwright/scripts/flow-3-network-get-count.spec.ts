import { test, expect } from '@playwright/test';

test('flow 3 - count GET /comments calls', async ({ page }) => {
  let getCommentsCount = 0;

  // Intercept and count comments GET requests
  await page.route('**/comments', async (route) => {
    if (route.request().method() === 'GET') {
      getCommentsCount++;
    }
    await route.continue();
  });

  // 1. Navigate to frontend (initial load)
  await page.goto('http://localhost:3001');

  // Wait for loading indicator to disappear or list to be visible
  const list = page.locator('[data-testid="comments-list"]');
  await expect(list).toBeVisible();

  const uniqueAuthor = `AuthorNet-${Date.now()}`;
  const uniqueBody = `BodyNet-${Date.now()}`;

  // 2. Submit form
  await page.fill('input[name="author"]', uniqueAuthor);
  await page.fill('input[name="body"]', uniqueBody);
  await page.click('button[type="submit"]');

  // 3. Verify new comment is rendered (mutation invalidates list, triggers second GET)
  await expect(list).toContainText(uniqueAuthor);
  await expect(list).toContainText(uniqueBody);

  // Ensure exactly 2 GET requests were made: 1 initial + 1 refetch
  expect(getCommentsCount).toBe(2);
});

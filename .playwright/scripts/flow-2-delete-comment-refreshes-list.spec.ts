import { test, expect } from '@playwright/test';

test('flow 2 - delete comment refreshes list', async ({ page, request }) => {
  const uniqueAuthor = `AuthorDel-${Date.now()}`;
  const uniqueBody = `BodyDel-${Date.now()}`;

  // 1. Seed comment via REST API
  const response = await request.post('http://localhost:3000/comments', {
    data: {
      author: uniqueAuthor,
      body: uniqueBody,
    },
  });
  expect(response.ok()).toBeTruthy();
  const comment = await response.json();

  // 2. Navigate to frontend
  await page.goto('http://localhost:3001');

  // 3. Locate row by text
  const row = page.locator('li', { hasText: uniqueBody });
  await expect(row).toBeVisible();

  // 4. Click the nested delete button
  const deleteBtn = row.locator(`[data-testid="delete-${comment.id}"]`);
  await deleteBtn.click();

  // 5. Assert the row is hidden
  await expect(row).toBeHidden();
});

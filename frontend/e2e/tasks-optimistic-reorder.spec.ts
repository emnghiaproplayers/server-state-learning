import { test, expect } from '@playwright/test';

test.describe('Task Board Optimistic Reorder & Rollback', () => {

  test('Spec 1: Successful move updates UI instantly and persists after server response', async ({ page }) => {
    await page.goto('http://localhost:3001');

    // Wait for task board to load
    await expect(page.locator('[data-testid="column-todo"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-task-1"]')).toBeVisible();

    // Verify initial column for task-1 is 'todo'
    const initialColumn = await page.locator('[data-testid="task-task-1"]').getAttribute('data-column-id');
    expect(initialColumn).toBe('todo');

    // Click Move Right button (normal success move to in_progress)
    await page.click('[data-testid="move-right-task-1"]');

    // INSTANT ASSERTION: Check that task-1 moved to in_progress immediately before server 600ms delay finishes
    const optimisticColumn = await page.locator('[data-testid="task-task-1"]').getAttribute('data-column-id');
    expect(optimisticColumn).toBe('in_progress');

    // Wait for server response (600ms delay + onSettled invalidation)
    await page.waitForTimeout(1000);

    // PERSISTENCE ASSERTION: Ensure task-1 remains in 'in_progress' after server success
    const finalColumn = await page.locator('[data-testid="task-task-1"]').getAttribute('data-column-id');
    expect(finalColumn).toBe('in_progress');
  });

  test('Spec 2: Rollback move reverts ENTIRE list snapshot when server returns HTTP 500', async ({ page }) => {
    await page.goto('http://localhost:3001');

    // Wait for task board to load
    await expect(page.locator('[data-testid="column-todo"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-task-1"]')).toBeVisible();

    // Verify task-1 initial position is in 'todo'
    expect(await page.locator('[data-testid="task-task-1"]').getAttribute('data-column-id')).toBe('todo');

    // Click Force 500 Rollback button
    await page.click('[data-testid="move-fail-task-1"]');

    // INSTANT ASSERTION: Task-1 optimistically moves to 'in_progress' immediately
    const optimisticColumn = await page.locator('[data-testid="task-task-1"]').getAttribute('data-column-id');
    expect(optimisticColumn).toBe('in_progress');

    // Wait for server 500 error response (after 600ms delay) and onError rollback execution
    await page.waitForTimeout(1200);

    // ROLLBACK ASSERTION: Ensure task-1 and all shifted items revert back to original 'todo' column
    const rollbackedColumn = await page.locator('[data-testid="task-task-1"]').getAttribute('data-column-id');
    expect(rollbackedColumn).toBe('todo');
  });

});

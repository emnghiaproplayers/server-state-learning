export interface Task {
  id: string;
  title: string;
  columnId: string;
  order: number;
}

export interface MoveTaskVariables {
  taskId: string;
  toColumn: string;
  toIndex: number;
  fail?: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(`${API_BASE_URL}/tasks`);
  if (!res.ok) {
    throw new Error(`Failed to fetch tasks: ${res.statusText}`);
  }
  return res.json();
}

export async function moveTaskApi({ taskId, toColumn, toIndex, fail }: MoveTaskVariables): Promise<Task> {
  const url = `${API_BASE_URL}/tasks/${taskId}/move${fail ? '?fail=true' : ''}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toColumn, toIndex }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(errorData.message || `Server returned status ${res.status}`);
  }

  return res.json();
}

/**
 * Pure reorder helper function that returns a NEW Task[] array without mutating the input reference.
 * Clones all items before reordering to ensure no reference sharing with snapshot.
 */
export function reorder(old: Task[], vars: MoveTaskVariables): Task[] {
  if (!old || old.length === 0) return old;

  // 1. Deep copy array and task items so reference is not shared with snapshot
  const cloned = old.map((t) => ({ ...t }));

  const targetIndex = cloned.findIndex((t) => t.id === vars.taskId);
  if (targetIndex === -1) return cloned;

  const targetTask = cloned[targetIndex];
  targetTask.columnId = vars.toColumn;

  // 2. Remove target task from cloned list
  const listWithoutTarget = cloned.filter((t) => t.id !== vars.taskId);

  // 3. Separate target column items from other columns
  const targetColumnItems = listWithoutTarget
    .filter((t) => t.columnId === vars.toColumn)
    .sort((a, b) => a.order - b.order);

  const otherColumnItems = listWithoutTarget.filter((t) => t.columnId !== vars.toColumn);

  // 4. Insert target task into targetColumnItems at vars.toIndex
  const insertIndex = Math.max(0, Math.min(vars.toIndex, targetColumnItems.length));
  targetColumnItems.splice(insertIndex, 0, targetTask);

  // 5. Re-index order property for target column items
  const reindexedTargetColumn = targetColumnItems.map((item, idx) => ({
    ...item,
    order: idx,
  }));

  // Re-index order property for source column if target column changed
  const reindexedOtherItems = otherColumnItems.map((item) => {
    // Group by columnId and re-index order cleanly
    return item;
  });

  // Re-index all columns cleanly
  const allColumns = Array.from(new Set(old.map((t) => t.columnId)));
  const finalTasks: Task[] = [];

  allColumns.forEach((colId) => {
    const itemsInCol = colId === vars.toColumn
      ? reindexedTargetColumn
      : reindexedOtherItems.filter((t) => t.columnId === colId).sort((a, b) => a.order - b.order);

    itemsInCol.forEach((item, idx) => {
      finalTasks.push({
        ...item,
        order: idx,
      });
    });
  });

  return finalTasks;
}

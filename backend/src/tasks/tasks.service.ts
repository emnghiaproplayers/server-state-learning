import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Task } from './interfaces/task.interface';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  // In-memory seed dataset of tasks across 3 columns
  private tasks: Task[] = [
    { id: 'task-1', title: 'Nghiên cứu TanStack Query v5 optimistic updates', columnId: 'todo', order: 0 },
    { id: 'task-2', title: 'Thiết kế Task Board UI với glassmorphism', columnId: 'todo', order: 1 },
    { id: 'task-3', title: 'Xây dựng reorder helper pure function', columnId: 'in_progress', order: 0 },
    { id: 'task-4', title: 'Tích hợp full-list snapshot rollback', columnId: 'in_progress', order: 1 },
    { id: 'task-5', title: 'Viết Playwright E2E spec kiểm thử rollback', columnId: 'done', order: 0 },
    { id: 'task-6', title: 'Hoàn thiện README & Code execution trace', columnId: 'done', order: 1 },
  ];

  getTasks(): Task[] {
    return [...this.tasks].sort((a, b) => {
      if (a.columnId !== b.columnId) {
        return a.columnId.localeCompare(b.columnId);
      }
      return a.order - b.order;
    });
  }

  async moveTask(id: string, toColumn: string, toIndex: number, fail?: boolean): Promise<Task> {
    this.logger.log(`Move request: id=${id}, toColumn=${toColumn}, toIndex=${toIndex}, fail=${fail}`);

    // If fail flag is enabled, immediately throw HTTP 500 exception without changing state
    if (fail) {
      this.logger.warn(`Simulating 500 error for task ${id}`);
      throw new HttpException('Server Error: Failed to process move request on backend', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Artificial delay of 600ms to allow observing optimistic UI and rollback states
    await new Promise((resolve) => setTimeout(resolve, 600));

    const taskIndex = this.tasks.findIndex((t) => t.id === id);
    if (taskIndex === -1) {
      throw new HttpException(`Task with id ${id} not found`, HttpStatus.NOT_FOUND);
    }

    const movedTask = { ...this.tasks[taskIndex], columnId: toColumn };

    // Remove item from current array
    const remainingTasks = this.tasks.filter((t) => t.id !== id);

    // Split target column tasks vs other tasks
    const targetColumnTasks = remainingTasks
      .filter((t) => t.columnId === toColumn)
      .sort((a, b) => a.order - b.order);

    const otherColumnTasks = remainingTasks.filter((t) => t.columnId !== toColumn);

    // Insert movedTask into target column at toIndex
    const clampedIndex = Math.max(0, Math.min(toIndex, targetColumnTasks.length));
    targetColumnTasks.splice(clampedIndex, 0, movedTask);

    // Re-index order for target column tasks
    const reindexedTargetColumn = targetColumnTasks.map((t, idx) => ({
      ...t,
      order: idx,
    }));

    // Combine all tasks back
    this.tasks = [...otherColumnTasks, ...reindexedTargetColumn];

    const updatedMovedTask = this.tasks.find((t) => t.id === id)!;
    return updatedMovedTask;
  }
}

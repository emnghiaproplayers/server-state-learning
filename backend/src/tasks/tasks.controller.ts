import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task, MoveTaskDto } from './interfaces/task.interface';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  getTasks(): Task[] {
    return this.tasksService.getTasks();
  }

  @Patch(':id/move')
  async moveTask(
    @Param('id') id: string,
    @Query('fail') fail: string,
    @Body() dto: MoveTaskDto,
  ): Promise<Task> {
    const isFail = fail === 'true' || fail === '1';
    return this.tasksService.moveTask(id, dto.toColumn, dto.toIndex, isFail);
  }
}

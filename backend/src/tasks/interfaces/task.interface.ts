export interface Task {
  id: string;
  title: string;
  columnId: string;
  order: number;
}

export class MoveTaskDto {
  toColumn!: string;
  toIndex!: number;
}

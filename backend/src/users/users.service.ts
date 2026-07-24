import { Injectable, NotFoundException } from '@nestjs/common';

export interface User {
  id: number;
  name: string;
  email: string;
}

@Injectable()
export class UsersService {
  private readonly users: User[] = [
    { id: 1, name: 'Alice Smith', email: 'alice@example.com' },
    { id: 2, name: 'Bob Jones', email: 'bob@example.com' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@example.com' },
  ];

  findAll(): User[] {
    return [...this.users];
  }

  updateName(id: number, name: string): User {
    const user = this.users.find(u => u.id === id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    user.name = name;
    return user;
  }
}

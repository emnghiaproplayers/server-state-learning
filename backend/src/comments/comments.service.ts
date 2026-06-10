import { Injectable, NotFoundException, Logger } from '@nestjs/common';

export class Comment {
  id!: number;
  author!: string;
  body!: string;
}

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);
  private comments: Comment[] = [];
  private nextId = 1;

  findAll(): Comment[] {
    this.logger.log('Retrieving all comments (snapshot)');
    return [...this.comments];
  }

  findOne(id: number): Comment {
    this.logger.log(`Retrieving comment ID: ${id}`);
    const comment = this.comments.find(c => c.id === id);
    if (!comment) {
      throw new NotFoundException(`Comment ${id} not found`);
    }
    return comment;
  }

  create(dto: { author: string; body: string }): Comment {
    const comment: Comment = {
      id: this.nextId++,
      author: dto.author,
      body: dto.body,
    };
    this.comments.push(comment);
    this.logger.log(`Created comment: id=${comment.id}, author=${comment.author}`);
    return comment;
  }

  remove(id: number): void {
    const index = this.comments.findIndex(c => c.id === id);
    if (index === -1) {
      throw new NotFoundException(`Comment ${id} not found`);
    }
    this.comments.splice(index, 1);
    this.logger.log(`Removed comment ID: ${id}`);
  }
}

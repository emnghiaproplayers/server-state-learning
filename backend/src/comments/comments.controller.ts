import { Controller, Get, Post, Delete, Body, Param, HttpCode, ParseIntPipe } from '@nestjs/common';
import { CommentsService, Comment } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  findAll(): Comment[] {
    return this.commentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Comment {
    return this.commentsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCommentDto): Comment {
    return this.commentsService.create(dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number): void {
    this.commentsService.remove(id);
  }
}

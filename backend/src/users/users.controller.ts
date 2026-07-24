import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Logger,
  ParseIntPipe,
  InternalServerErrorException,
  UseInterceptors,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Injectable,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Observable } from 'rxjs';
import { delay } from 'rxjs/operators';

@Injectable()
export class ResponseDelayInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(delay(600)); // 600ms delay to make optimistic UI update visible
  }
}

@Controller('users')
@UseInterceptors(ResponseDelayInterceptor)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get()
  list() {
    this.logger.log('GET /users');
    return this.usersService.findAll();
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Query('fail') failQuery?: string,
    @Body() body?: { name: string; fail?: boolean },
  ) {
    const isFail = failQuery === 'true' || body?.fail === true;
    this.logger.log(`PATCH /users/${id} - name: "${body?.name}", fail: ${isFail}`);

    if (isFail) {
      this.logger.error(`Simulated server 500 error triggered for user ${id}`);
      throw new InternalServerErrorException(
        'Simulated Server Error 500: Forced failure for optimistic rollback test',
      );
    }

    if (!body?.name) {
      throw new InternalServerErrorException('Name is required');
    }

    return this.usersService.updateName(id, body.name);
  }
}

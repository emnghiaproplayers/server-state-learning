import { Controller, Get, Logger, UseInterceptors } from '@nestjs/common';
import { UsersService, User } from './users.service';
import { NestInterceptor, ExecutionContext, CallHandler, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { delay } from 'rxjs/operators';

@Injectable()
export class ResponseDelayInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(delay(1000)); // 1s response delay
  }
}

@Controller('users')
@UseInterceptors(ResponseDelayInterceptor)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(): User[] {
    this.logger.log('GET /users');
    return this.usersService.findAll();
  }
}

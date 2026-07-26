import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommentsModule } from './comments/comments.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CommentsModule,
    UsersModule,
    ProductsModule,
  ],
})
export class AppModule {}

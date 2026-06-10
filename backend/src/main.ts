import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Enable CORS for Next.js and frontend HTML clients
  await app.listen(3000);
  console.log(`Backend server is running on: http://localhost:3000`);
}
bootstrap();

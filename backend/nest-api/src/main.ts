// backend/nest-api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ensureSchema } from './database/ensure-schema';
import { env } from './env';

async function bootstrap() {
  // Must run before NestFactory.create: TypeOrmModule.forRoot initialises the
  // DataSource (and runs migrations) while the module graph is being built.
  await ensureSchema();
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: env.FRONTEND_URL, // allow only frontend url
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe());

  await app.listen(env.PORT);
}
bootstrap();

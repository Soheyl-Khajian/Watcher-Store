// backend/nest-api/src/main.ts

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { ensureSchema } from './database/ensure-schema';
import { env } from './env';

async function bootstrap() {
  // Must run before NestFactory.create: TypeOrmModule.forRoot initialises the
  // DataSource (and runs migrations) while the module graph is being built.
  await ensureSchema();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // configureApp registers the JSON parser with a size limit.
    bodyParser: false,
    // Hold early log lines until the pino logger is in place.
    bufferLogs: true,
  });

  configureApp(app);

  await app.listen(env.PORT);
}
bootstrap();

// backend/nest-api/src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { ensureSchema } from './database/ensure-schema';
import { env } from './env';

async function bootstrap() {
  // Must run before NestFactory.create: TypeOrmModule.forRoot initialises the
  // DataSource (and runs migrations) while the module graph is being built.
  await ensureSchema();
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  await app.listen(env.PORT);
}
bootstrap();

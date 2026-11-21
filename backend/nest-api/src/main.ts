// backend/nest-api/src/main.ts

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { ensureSchema } from './database/ensure-schema';
import { env } from './env';

async function bootstrap() {
  // Must run before NestFactory.create: TypeOrmModule.forRoot initialises the
  // DataSource (and runs migrations) while the module graph is being built.
  // Without migrations on boot the migrate job has created the schema.
  if (env.MIGRATIONS_RUN_ON_BOOT) {
    await ensureSchema();
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // configureApp registers the JSON parser with a size limit.
    bodyParser: false,
    // Hold early log lines until the pino logger is in place.
    bufferLogs: true,
  });

  configureApp(app);

  // On SIGTERM (docker stop, a redeploy) stop accepting connections, let
  // requests in flight finish, stop the expiry job and close the database
  // pool before exiting.
  app.enableShutdownHooks();

  await app.listen(env.PORT);
}

// A failed start (database unreachable, a migration error) must end the
// process with an error code so the container is restarted or the deploy
// fails, rather than leaving a process that serves nothing.
bootstrap().catch((error: unknown) => {
  new Logger('Bootstrap').error(
    'Failed to start the API',
    error instanceof Error ? error.stack : String(error),
  );
  process.exit(1);
});

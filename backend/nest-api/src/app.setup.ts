// backend/nest-api/src/app.setup.ts

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { env } from './env';

// Application-wide HTTP configuration. Shared by main.ts and the e2e tests so
// tests exercise the same request pipeline as production.
export function configureApp(app: INestApplication): void {
  app.enableCors({
    origin: env.FRONTEND_URL, // allow only frontend url
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );
}

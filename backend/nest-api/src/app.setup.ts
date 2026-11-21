// backend/nest-api/src/app.setup.ts

import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { ErrorResponseFilter } from './common/http/error-response.filter';
import { env } from './env';

// Request bodies are small JSON documents (login, cart lines, shipping
// details); anything larger is refused before it is parsed.
const MAX_JSON_BODY = '32kb';

// Application-wide HTTP configuration. Shared by main.ts and the e2e tests so
// tests exercise the same request pipeline as production. The application
// must be created with { bodyParser: false }; the parser is registered here
// with its size limit.
export function configureApp(app: NestExpressApplication): void {
  // Nest's own Logger calls go through pino, with the current request id.
  app.useLogger(app.get(Logger));

  // Rate limits key on the client IP. Only trusted proxies may supply it
  // through X-Forwarded-For (see TRUST_PROXY).
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  app.useBodyParser('json', { limit: MAX_JSON_BODY });

  // The storefront sends a Bearer token and no cookies, so credentials are
  // not needed. Only the methods the API uses are allowed.
  app.enableCors({
    origin: env.FRONTEND_URL,
    methods: 'GET,HEAD,POST,PATCH,DELETE',
  });

  // One error shape for every response, with Persian messages.
  app.useGlobalFilters(new ErrorResponseFilter());

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

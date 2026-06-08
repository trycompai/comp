import './config/load-env';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { OpenAPIObject } from '@nestjs/swagger';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import helmet from 'helmet';
import path from 'path';
import { AppModule } from './app.module';
import {
  applyPublicOpenApiMetadata,
  PUBLIC_OPENAPI_DESCRIPTION,
  PUBLIC_OPENAPI_TITLE,
} from './openapi/public-docs-metadata';
import { corsOriginMiddleware } from './auth/cors-origin.middleware';
import { adminAuthRateLimiter } from './auth/admin-rate-limit.middleware';
import { originCheckMiddleware } from './auth/origin-check.middleware';
import { mkdirSync, writeFileSync, existsSync } from 'fs';

declare module 'express-serve-static-core' {
  interface Request {
    rawBody?: Buffer;
  }
}

let app: INestApplication | null = null;

function describeServer(baseUrl: string): string {
  if (baseUrl.includes('api.staging.trycomp.ai')) return 'Staging API Server';
  if (baseUrl.includes('api.trycomp.ai')) return 'Production API Server';
  if (baseUrl.startsWith('http://localhost')) return 'Local API Server';
  return 'API Server';
}

async function bootstrap(): Promise<void> {
  // Disable body parser - required for better-auth NestJS integration
  // The library will re-add body parsers after handling auth routes
  app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // Enable path-aware CORS with origin validation.
  // Comp extension origins are allowed only on explicitly supported routes.
  app.use(corsOriginMiddleware);

  // STEP 2: Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Swagger needs inline styles
          scriptSrc: ["'self'", "'unsafe-inline'"], // Swagger needs inline scripts
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow embedding
    }),
  );

  // STEP 3a: Origin header validation for CSRF protection
  // Rejects state-changing requests from untrusted origins.
  // Defense-in-depth: CORS blocks fetch-based CSRF, this blocks form-based CSRF.
  app.use(originCheckMiddleware);

  // STEP 3b: Rate-limit better-auth admin routes (impersonation, ban, set-role, etc.)
  // These bypass NestJS controllers so the global ThrottlerGuard doesn't apply.
  app.use(adminAuthRateLimiter);

  // STEP 4a: Configure body parser
  // NOTE: Attachment uploads are sent as base64 in JSON, so request payloads are
  // larger than the raw file size. Keep this above the user-facing max file size.
  // IMPORTANT: Skip body parsing for /api/auth routes — better-auth needs the raw
  // request stream to properly read the body (including OAuth callbackURL).
  // Express-level middleware runs BEFORE NestJS module middleware, so without this
  // skip, express.json() would consume the stream before better-auth's handler.
  // Routes that need the exact request bytes for HMAC signature verification.
  // Anything matched here gets `req.rawBody` populated; everything else uses
  // the standard parser which discards the buffer to avoid keeping a 150MB
  // copy of every JSON payload alive on the heap.
  const RAW_BODY_PATHS = [
    '/v1/security-penetration-tests/webhook',
    '/security-penetration-tests/webhook',
    '/v1/background-checks/webhook',
    '/background-checks/webhook',
    '/v1/billing/webhook',
    '/billing/webhook',
  ];
  const needsRawBody = (req: express.Request): boolean =>
    RAW_BODY_PATHS.some((p) => req.path.endsWith(p));

  const jsonParserWithRaw = express.json({
    limit: '150mb',
    verify: (req, _res, buf) => {
      (req as express.Request).rawBody = buf;
    },
  });
  const jsonParser = express.json({ limit: '150mb' });
  const urlencodedParser = express.urlencoded({
    limit: '150mb',
    extended: true,
  });
  app.use(
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (req.path.startsWith('/api/auth')) {
        return next();
      }
      const parser = needsRawBody(req) ? jsonParserWithRaw : jsonParser;
      parser(req, res, (err?: unknown) => {
        if (err) return next(err);
        urlencodedParser(req, res, next);
      });
    },
  );

  // STEP 4b: Enable global pipes and filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Get server configuration from environment variables
  const port = process.env.PORT ?? 3333;

  // Swagger/OpenAPI configuration — single server derived from BASE_URL
  const baseUrl = process.env.BASE_URL ?? `http://localhost:${port}`;
  const serverDescription = describeServer(baseUrl);

  const config = new DocumentBuilder()
    .setTitle(PUBLIC_OPENAPI_TITLE)
    .setDescription(PUBLIC_OPENAPI_DESCRIPTION)
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API key for authentication',
      },
      'apikey',
    )
    .addServer(baseUrl, serverDescription)
    .build();
  const document: OpenAPIObject = SwaggerModule.createDocument(app, config);

  applyPublicOpenApiMetadata(document);

  // Setup Swagger UI at /api/docs
  SwaggerModule.setup('api/docs', app, document, {
    raw: ['json'],
    swaggerOptions: {
      persistAuthorization: true, // Keep auth between page refreshes
    },
  });

  const server = await app.listen(port);
  const address = server.address();
  const actualPort = typeof address === 'string' ? port : address?.port || port;
  const actualUrl = `http://localhost:${actualPort}`;

  console.log(`Application is running on: ${actualUrl}`);
  console.log(`API Documentation available at: ${actualUrl}/api/docs`);

  // Write OpenAPI documentation to packages/docs/openapi.json only in development
  if (process.env.NODE_ENV !== 'production') {
    const openapiPath = path.join(
      __dirname,
      '../../../../packages/docs/openapi.json',
    );

    const docsDir = path.dirname(openapiPath);
    if (!existsSync(docsDir)) {
      mkdirSync(docsDir, { recursive: true });
    }

    writeFileSync(openapiPath, JSON.stringify(document, null, 2));
    console.log('OpenAPI documentation written to packages/docs/openapi.json');
  }
}

// Graceful shutdown handler
async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received, shutting down gracefully...`);
  if (app) {
    await app.close();
    console.log('Application closed');
  }
  process.exit(0);
}

// Handle shutdown signals (important for hot reload)
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// Handle bootstrap errors properly
void bootstrap().catch((error: unknown) => {
  console.error('Error starting application:', error);
  process.exit(1);
});

import './config/load-env';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CorsExceptionFilter } from './common/filters/cors-exception.filter';
import type { OpenAPIObject } from '@nestjs/swagger';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import helmet from 'helmet';
import path from 'path';
import { AppModule } from './app.module';
import { mkdirSync, writeFileSync, existsSync } from 'fs';

let app: INestApplication | null = null;

async function bootstrap(): Promise<void> {
  app = await NestFactory.create(AppModule);

  // STEP 1: Enable CORS FIRST - critical for preflight requests
  const isDevelopment = process.env.NODE_ENV !== 'production';

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'https://app.trycomp.ai',
    'https://trycomp.ai',
    process.env.APP_URL,
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin, callback) => {
      // Same-origin (no origin header)
      if (!origin) {
        return callback(null, false); // false for same-origin
      }

      // Check whitelist
      if (allowedOrigins.includes(origin)) {
        return callback(null, origin); // Return the origin string
      }

      // Dev mode: localhost and ngrok
      if (isDevelopment) {
        if (
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.includes('ngrok')
        ) {
          return callback(null, origin); // Return the origin string
        }
      }

      // Reject
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // STEP 2: Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disable CSP (conflicts with Swagger)
      crossOriginEmbedderPolicy: false, // Allow embedding
    }),
  );

  // STEP 3: Configure body parser
  app.use(express.json({ limit: '70mb' }));
  app.use(express.urlencoded({ limit: '70mb', extended: true }));

  // STEP 4: Enable global pipes and filters
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

  app.useGlobalFilters(new CorsExceptionFilter());

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Get server configuration from environment variables
  const port = process.env.PORT ?? 3333;

  // Swagger/OpenAPI configuration
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('The API documentation for this application')
    .setVersion('1.0')
    .addServer('http://localhost:3333', 'Local API Server')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API key for authentication',
      },
      'apikey',
    )
    .addServer('https://api.trycomp.ai', 'API Server')
    .build();
  const document: OpenAPIObject = SwaggerModule.createDocument(app, config);

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

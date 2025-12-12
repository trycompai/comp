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
import { mkdirSync, writeFileSync, existsSync } from 'fs';

let app: INestApplication | null = null;

async function bootstrap(): Promise<void> {
  app = await NestFactory.create(AppModule);

  // Enable CORS for all origins - security is handled by authentication
  app.enableCors({
    origin: true,
    credentials: true,
  });

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

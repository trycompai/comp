import './config/load-env';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { OpenAPIObject } from '@nestjs/swagger';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import path from 'path';
import { AppModule } from './app.module';
import { mkdirSync, writeFileSync, existsSync } from 'fs';

async function bootstrap(): Promise<void> {
  const app: INestApplication = await NestFactory.create(AppModule);

  // Enable global validation pipe
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

  // Configure body parser limits for file uploads (base64 encoded files)
  // 70mb allows for ~50mb actual file size after base64 encoding overhead (~33%)
  app.use(express.json({ limit: '70mb' }));
  app.use(express.urlencoded({ limit: '70mb', extended: true }));

  // Enable CORS for cross-origin requests
  app.enableCors({
    origin: true, // Allow requests from any origin
    credentials: true, // Allow cookies to be sent cross-origin (for auth)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'X-Organization-Id',
    ],
  });

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

// Handle bootstrap errors properly
void bootstrap().catch((error: unknown) => {
  console.error('Error starting application:', error);
  process.exit(1);
});

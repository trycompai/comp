import 'reflect-metadata';
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
import { auth } from './auth/auth.server';

let app: INestApplication | null = null;

async function bootstrap(): Promise<void> {
  app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  app.enableCors({
    origin: true,
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  const { toNodeHandler } = await import('better-auth/node');
  const betterAuthHandler = toNodeHandler(auth);

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
        void betterAuthHandler(req, res);
        return;
      }
      jsonParser(req, res, (err?: unknown) => {
        if (err) return next(err);
        urlencodedParser(req, res, next);
      });
    },
  );

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

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  if (process.env.NODE_ENV !== 'production') {
    try {
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

      SwaggerModule.setup('api/docs', app, document, {
        raw: ['json'],
        swaggerOptions: { persistAuthorization: true },
      });

      const openapiPath = path.join(
        __dirname,
        '../../../../packages/docs/openapi.json',
      );
      const docsDir = path.dirname(openapiPath);
      if (!existsSync(docsDir)) {
        mkdirSync(docsDir, { recursive: true });
      }
      writeFileSync(openapiPath, JSON.stringify(document, null, 2));
      console.log(
        'OpenAPI documentation written to packages/docs/openapi.json',
      );
    } catch (swaggerError) {
      console.warn(
        'Swagger document generation failed:',
        swaggerError instanceof Error ? swaggerError.message : swaggerError,
      );
    }
  }

  const port = process.env.PORT ?? 3333;
  await app.listen(port);
  console.log(`Application is running on port ${port}`);
}

async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received, shutting down gracefully...`);
  if (app) {
    await app.close();
    console.log('Application closed');
  }
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

void bootstrap().catch((error: unknown) => {
  console.error('Error starting application:', error);
  process.exit(1);
});

import type { INestApplication } from '@nestjs/common';
import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { OpenAPIObject } from '@nestjs/swagger';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app: INestApplication = await NestFactory.create(AppModule);

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Get server configuration from environment variables
  const port = process.env.PORT ?? 3333;
  const baseUrl = process.env.BASE_URL ?? `http://localhost:${port}`;

  // Swagger/OpenAPI configuration
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('The API documentation for this application')
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
    .addServer(baseUrl, 'API Server')
    .build();
  const document: OpenAPIObject = SwaggerModule.createDocument(app, config);

  // Setup Swagger UI at /api/docs
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Keep auth between page refreshes
    },
  });

  await app.listen(port);
  console.log(`Application is running on: ${baseUrl}`);
  console.log(`API Documentation available at: ${baseUrl}/api/docs`);
}

// Handle bootstrap errors properly
void bootstrap().catch((error: unknown) => {
  console.error('Error starting application:', error);
  process.exit(1);
});

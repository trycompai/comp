// Script-style Jest spec: generates packages/docs/openapi.json using the same
// mocks as openapi-docs.spec.ts (no live DB or env vars needed).
// Skipped by default to avoid side effects in CI.
// Run manually with: cd apps/api && GEN_OPENAPI=1 bunx jest src/gen-openapi.spec.ts

// Mock better-auth ESM-only modules so Jest (CJS) can import AppModule's transitive AuthModule.
jest.mock('./auth/auth.server', () => ({
  auth: {
    api: {},
    handler: async () => new Response(null, { status: 204 }),
    options: {},
  },
  getTrustedOrigins: () => [],
  isTrustedOrigin: async () => false,
  isStaticTrustedOrigin: () => false,
}));

jest.mock('@thallesp/nestjs-better-auth', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Module } = require('@nestjs/common');
  @Module({})
  class AuthModuleStub {
    static forRoot() {
      return {
        module: AuthModuleStub,
        imports: [],
        providers: [],
        exports: [],
      };
    }
  }
  return { AuthModule: AuthModuleStub };
});

jest.mock('better-auth/plugins/access', () => ({
  createAccessControl: () => ({
    newRole: () => ({}),
    statement: {},
  }),
}));
jest.mock('better-auth/plugins/organization/access', () => ({
  defaultStatements: {},
  adminAc: {},
  ownerAc: {},
}));

jest.mock('@trycompai/auth', () => {
  const emptyRole = { statements: {} };
  const roles = {
    owner: emptyRole,
    admin: emptyRole,
    auditor: emptyRole,
    employee: emptyRole,
    contractor: emptyRole,
  };
  return {
    ac: { newRole: () => emptyRole },
    statement: {},
    allRoles: roles,
    ...roles,
    ROLE_HIERARCHY: ['contractor', 'employee', 'auditor', 'admin', 'owner'],
    RESTRICTED_ROLES: ['employee', 'contractor'],
    PRIVILEGED_ROLES: ['owner', 'admin', 'auditor'],
    BUILT_IN_ROLE_PERMISSIONS: {},
    BUILT_IN_ROLE_OBLIGATIONS: {},
  };
});

jest.mock('@db', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const prismaClient = require('@prisma/client');
  return {
    ...prismaClient,
    db: {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      organization: { findFirst: jest.fn(), findMany: jest.fn() },
      auditLog: { create: jest.fn() },
      trust: { findMany: jest.fn().mockResolvedValue([]) },
      dynamicIntegration: { findMany: jest.fn().mockResolvedValue([]) },
      apiKey: { findFirst: jest.fn() },
      session: { findFirst: jest.fn() },
      member: { findFirst: jest.fn() },
    },
  };
});

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  })),
}));

process.env.SECRET_KEY = 'test-secret-key-at-least-16-chars';
process.env.BASE_URL = 'http://localhost:3333';
process.env.APP_AWS_ACCESS_KEY_ID = 'test-access-key-id';
process.env.APP_AWS_SECRET_ACCESS_KEY = 'test-secret-access-key';
process.env.APP_AWS_BUCKET_NAME = 'test-bucket';
process.env.APP_AWS_REGION = 'us-east-1';

import path from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import {
  applyPublicOpenApiMetadata,
  PUBLIC_OPENAPI_DESCRIPTION,
  PUBLIC_OPENAPI_TITLE,
  PUBLIC_SERVER_URL,
} from './openapi/public-docs-metadata';
import { collectPublicOpenApiIssues } from './openapi/public-docs-quality';

const shouldRun = process.env.GEN_OPENAPI === '1';
const maybeDescribe = shouldRun ? describe : describe.skip;

maybeDescribe('Generate openapi.json', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('writes openapi.json without excluded paths', () => {
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
      .build();

    const document = SwaggerModule.createDocument(app, config);
    applyPublicOpenApiMetadata(document);

    const openapiPath = path.join(
      __dirname,
      '../../../packages/docs/openapi.json',
    );

    const docsDir = path.dirname(openapiPath);
    if (!existsSync(docsDir)) {
      mkdirSync(docsDir, { recursive: true });
    }

    writeFileSync(openapiPath, JSON.stringify(document, null, 2));
    console.log(`OpenAPI documentation written to ${openapiPath}`);

    expect(document.servers).toEqual([
      {
        url: PUBLIC_SERVER_URL,
        description: 'Production API Server',
      },
    ]);

    const issues = collectPublicOpenApiIssues(document);
    expect(issues.excludedPaths).toEqual([]);
    expect(issues.exposedTags).toEqual([]);
    expect(issues.sensitiveSchemaDetails).toEqual([]);
  });
});

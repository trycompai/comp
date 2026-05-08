// Mock better-auth ESM-only modules so Jest (CJS) can import AppModule's transitive AuthModule.
// These must appear before any imports so that Jest hoists them before module evaluation.

// Stub the auth instance so auth.server.ts never runs its top-level side effects
// (validateSecurityConfig, betterAuth(), Redis connection, etc.)
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

// Stub the NestJS better-auth integration module
jest.mock('@thallesp/nestjs-better-auth', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Module } = require('@nestjs/common');
  @Module({})
  class AuthModuleStub {
    static forRoot() {
      return { module: AuthModuleStub, imports: [], providers: [], exports: [] };
    }
  }
  return { AuthModule: AuthModuleStub };
});

// Stub better-auth ESM-only packages (loaded by @trycompai/auth package)
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

// Stub @trycompai/auth (dist/ not built in worktree; avoids resolving better-auth ESM)
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

// Mock @db — keep all Prisma enums from @prisma/client, replace only the db instance
// so that module-level enum references (e.g. IsEnum(CommentEntityType)) resolve correctly
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
      apiKey: { findFirst: jest.fn() },
      session: { findFirst: jest.fn() },
      member: { findFirst: jest.fn() },
    },
  };
});

// Mock @upstash/redis to avoid real Redis connections during tests
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  })),
}));

// Set required env vars before any module-level code runs.
// These prevent config factories (aws.config.ts, better-auth, etc.) from throwing.
process.env.SECRET_KEY = 'test-secret-key-at-least-16-chars';
process.env.BASE_URL = 'http://localhost:3333';
process.env.APP_AWS_ACCESS_KEY_ID = 'test-access-key-id';
process.env.APP_AWS_SECRET_ACCESS_KEY = 'test-secret-access-key';
process.env.APP_AWS_BUCKET_NAME = 'test-bucket';
process.env.APP_AWS_REGION = 'us-east-1';

import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { INestApplication, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';

describe('OpenAPI document', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();

    const config = new DocumentBuilder()
      .setTitle('Test')
      .setVersion('1.0')
      .build();
    document = SwaggerModule.createDocument(app, config);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const hiddenPrefixes = ['/v1/auth', '/v1/admin', '/v1/internal'];

  for (const prefix of hiddenPrefixes) {
    it(`does not expose any path starting with ${prefix}`, () => {
      const exposed = Object.keys(document.paths).filter((p) => p.startsWith(prefix));
      expect(exposed).toEqual([]);
    });
  }

  describe('summaries', () => {
    it('every public operation declares a non-empty summary', () => {
      const missing: string[] = [];
      for (const [routePath, methods] of Object.entries(document.paths)) {
        for (const [method, op] of Object.entries(methods as Record<string, { summary?: string }>)) {
          if (typeof op !== 'object' || !op) continue;
          if (!op.summary || op.summary.trim() === '') {
            missing.push(`${method.toUpperCase()} ${routePath}`);
          }
        }
      }
      expect(missing).toEqual([]);
    });
  });
});

// Mock better-auth ESM-only modules so Jest (CJS) can import AppModule's transitive AuthModule.
// These must appear before any imports so that Jest hoists them before module evaluation.

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
      dynamicIntegration: { findMany: jest.fn().mockResolvedValue([]) },
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
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';
import { INestApplication, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import {
  applyPublicOpenApiMetadata,
  PUBLIC_OPENAPI_DESCRIPTION,
  PUBLIC_OPENAPI_TITLE,
  PUBLIC_SERVER_URL,
} from './openapi/public-docs-metadata';
import { collectPublicOpenApiIssues } from './openapi/public-docs-quality';

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
      .setTitle(PUBLIC_OPENAPI_TITLE)
      .setDescription(PUBLIC_OPENAPI_DESCRIPTION)
      .setVersion('1.0')
      .build();
    document = SwaggerModule.createDocument(app, config);
    applyPublicOpenApiMetadata(document);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('public metadata', () => {
    it('uses production API servers in the generated Mintlify spec', () => {
      expect(document.info.title).toBe(PUBLIC_OPENAPI_TITLE);
      expect(document.info.description).toBe(PUBLIC_OPENAPI_DESCRIPTION);
      expect(document.servers).toEqual([
        {
          url: PUBLIC_SERVER_URL,
          description: 'Production API Server',
        },
      ]);
    });

    it('keeps the public spec complete, SEO-ready, and free of private surfaces', () => {
      const issues = collectPublicOpenApiIssues(document);

      expect(issues.excludedPaths).toEqual([]);
      expect(issues.exposedTags).toEqual([]);
      expect(issues.invalidSeo).toEqual([]);
      expect(issues.missingMetadata).toEqual([]);
      expect(issues.missingSummaries).toEqual([]);
      expect(issues.sensitiveSchemaDetails).toEqual([]);
    });

    it('curates high-value API pages with operation-specific SEO copy', () => {
      expect(
        document.paths['/v1/questionnaire/parse/upload/token'],
      ).toBeUndefined();

      const upload = document.paths['/v1/questionnaire/parse/upload']?.post as
        | {
            summary?: string;
            description?: string;
            'x-mint'?: { href?: string; metadata?: { title?: string } };
          }
        | undefined;

      expect(upload?.summary).toBe('Auto-answer uploaded questionnaire');
      expect(upload?.description).toContain('approved organization evidence');
      expect(upload?.['x-mint']?.href).toBe(
        '/api-reference/questionnaire/upload-a-questionnaire-file-and-auto-answer-with-export',
      );

      const policies = document.paths['/v1/policies']?.get as
        | {
            summary?: string;
            description?: string;
            'x-mint'?: { metadata?: { title?: string } };
          }
        | undefined;

      expect(policies?.summary).toBe('List compliance policies');
      expect(policies?.description).toContain('SOC 2');
      expect(policies?.['x-mint']?.metadata?.title).toBe(
        'List compliance policies | Comp AI API',
      );
    });
  });

  describe('MCP OAuth security', () => {
    it('declares an oauth2 authorization-code scheme pointed at the Comp AI auth server', () => {
      const scheme = document.components?.securitySchemes?.oauth2 as
        | {
            type?: string;
            flows?: {
              authorizationCode?: {
                authorizationUrl?: string;
                tokenUrl?: string;
                scopes?: Record<string, string>;
              };
            };
          }
        | undefined;

      expect(scheme?.type).toBe('oauth2');
      expect(scheme?.flows?.authorizationCode?.authorizationUrl).toBe(
        `${PUBLIC_SERVER_URL}/api/auth/mcp/authorize`,
      );
      expect(scheme?.flows?.authorizationCode?.tokenUrl).toBe(
        `${PUBLIC_SERVER_URL}/api/auth/mcp/token`,
      );
    });

    it('offers oauth2 alongside the API key on every authenticated operation', () => {
      const operations = Object.values(document.paths).flatMap((methods) =>
        Object.values(methods as Record<string, { security?: unknown }>),
      );

      const hasReq = (security: unknown, scheme: string): boolean =>
        Array.isArray(security) &&
        security.some((req) => req && typeof req === 'object' && scheme in req);

      const apiKeyOps = operations.filter((op) =>
        hasReq(op?.security, 'apikey'),
      );

      // Sanity: the spec really does gate operations behind the API key.
      expect(apiKeyOps.length).toBeGreaterThan(0);

      // Every API-key operation must also accept oauth2 (OR semantics) so MCP
      // callers authenticate per-user instead of via a shared key.
      const missingOAuth = apiKeyOps.filter(
        (op) => !hasReq(op?.security, 'oauth2'),
      );
      expect(missingOAuth).toHaveLength(0);

      // And oauth2 is never offered on an endpoint that isn't API-key gated.
      const oauthWithoutApiKey = operations.filter(
        (op) =>
          hasReq(op?.security, 'oauth2') && !hasReq(op?.security, 'apikey'),
      );
      expect(oauthWithoutApiKey).toHaveLength(0);
    });
  });
});

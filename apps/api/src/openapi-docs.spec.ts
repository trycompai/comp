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
  PUBLIC_OPENAPI_TIMEOUT_MS,
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

    it('bakes a finite default request timeout into the generated SDK + MCP server', () => {
      // Without x-speakeasy-timeout the generated request funcs use -1 ("no
      // timeout") and a hung upstream wedges the MCP connection forever.
      expect(
        (document as { 'x-speakeasy-timeout'?: number })['x-speakeasy-timeout'],
      ).toBe(PUBLIC_OPENAPI_TIMEOUT_MS);
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

  // Guardrail against the regression in PR #2961: the Speakeasy mcp-typescript
  // generator DROPS a tool whenever an operation declares more than one security
  // scheme (it can no longer supply the credential from the server's global
  // config). Adding a second auth method (oauth2) to every endpoint silently
  // gutted ~300 of ~335 MCP tools. Rule: keep exactly ONE auth method in the
  // base spec; handle any extra auth (e.g. OAuth) at the hosting layer, never here.
  describe('MCP generator safety', () => {
    it('never declares more than one security scheme on any operation', () => {
      const offenders: string[] = [];

      for (const [routePath, methods] of Object.entries(document.paths)) {
        for (const [method, operation] of Object.entries(
          methods as Record<string, { security?: unknown }>,
        )) {
          const security = operation?.security;
          if (Array.isArray(security) && security.length > 1) {
            offenders.push(
              `${method.toUpperCase()} ${routePath} (${security.length} schemes)`,
            );
          }
        }
      }

      // If this fails: an operation has 2+ security schemes, which breaks the
      // Speakeasy MCP generator (it drops the tool). Move the extra auth to the
      // hosting layer instead of the base OpenAPI spec.
      expect(offenders).toEqual([]);
    });

    it('still gates protected operations with the API key', () => {
      const apiKeyOps = Object.values(document.paths)
        .flatMap((methods) =>
          Object.values(methods as Record<string, { security?: unknown }>),
        )
        .filter(
          (op) =>
            Array.isArray(op?.security) &&
            op.security.some(
              (req) => req && typeof req === 'object' && 'apikey' in req,
            ),
        );

      expect(apiKeyOps.length).toBeGreaterThan(0);
    });
  });
});

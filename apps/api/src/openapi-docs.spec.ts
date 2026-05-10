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

  const excludedPrefixes = [
    '/v1/auth',
    '/v1/admin',
    '/v1/internal',
    '/v1/framework-editor',
    '/v1/browserbase',
    '/v1/assistant-chat',
    '/v1/health',
    '/v1/email/unsubscribe',
    '/v1/integrations/webhooks',
    '/v1/secrets',
    '/v1/billing',
    '/v1/background-check-billing',
    '/v1/pentest-credits',
    '/v1/finding-template',
  ];

  const excludedPathPatterns = [/\/admin(?:\/|$)/, /\/webhooks?(?:\/|$)/];

  it('does not expose excluded public docs paths', () => {
    const routePaths = Object.keys(document.paths);
    const exposed = routePaths.filter(
      (path) =>
        excludedPrefixes.some((prefix) => path.startsWith(prefix)) ||
        excludedPathPatterns.some((pattern) => pattern.test(path)),
    );

    expect(exposed).toEqual([]);
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

    it('every public operation declares a non-empty summary', () => {
      const missing: string[] = [];
      for (const [routePath, methods] of Object.entries(document.paths)) {
        for (const [method, op] of Object.entries(
          methods as Record<string, { summary?: string; 'x-excluded'?: true }>,
        )) {
          if (typeof op !== 'object' || !op) continue;
          if (op['x-excluded']) continue;
          if (!op.summary || op.summary.trim() === '') {
            missing.push(`${method.toUpperCase()} ${routePath}`);
          }
        }
      }
      expect(missing).toEqual([]);
    });

    it('every public operation has a description and Mintlify metadata', () => {
      const missing: string[] = [];
      const invalidSeo: string[] = [];
      for (const [routePath, methods] of Object.entries(document.paths)) {
        for (const [method, op] of Object.entries(
          methods as Record<
            string,
            {
              description?: string;
              'x-excluded'?: true;
              'x-mint'?: {
                metadata?: { description?: string; title?: string };
              };
            }
          >,
        )) {
          if (typeof op !== 'object' || !op) continue;
          if (op['x-excluded']) continue;

          const metaDescription = op['x-mint']?.metadata?.description;
          if (!op.description?.trim() || !metaDescription?.trim()) {
            missing.push(`${method.toUpperCase()} ${routePath}`);
          }

          const metaTitle = op['x-mint']?.metadata?.title;
          if (
            metaDescription &&
            (metaDescription.length < 80 ||
              metaDescription.length > 160 ||
              metaDescription.includes('Use this Comp AI'))
          ) {
            invalidSeo.push(`${method.toUpperCase()} ${routePath}`);
          }
          if (metaTitle && metaTitle.length > 60) {
            invalidSeo.push(`${method.toUpperCase()} ${routePath}`);
          }
        }
      }

      expect(missing).toEqual([]);
      expect(invalidSeo).toEqual([]);
    });

    it('does not retain sensitive hidden tags in the public spec', () => {
      const sensitiveTags = [
        'Background Check Billing',
        'Billing',
        'Finding Templates',
        'Pentest Credits',
        'Secrets',
      ];
      const exposedTags = new Set(
        Object.values(document.paths).flatMap((methods) =>
          Object.values(methods as Record<string, { tags?: string[] }>)
            .flatMap((op) => op.tags ?? [])
            .filter((tag) => sensitiveTags.includes(tag)),
        ),
      );

      expect([...exposedTags].sort()).toEqual([]);
    });

    it('curates high-value API pages with operation-specific SEO copy', () => {
      const upload = document.paths['/v1/questionnaire/parse/upload/token']
        ?.post as
        | {
            summary?: string;
            description?: string;
            'x-codeSamples'?: Array<{ lang: string }>;
            'x-mint'?: { href?: string; metadata?: { title?: string } };
          }
        | undefined;

      expect(upload?.summary).toBe('Upload questionnaire with Trust Access');
      expect(upload?.description).toContain('Trust Portal access token');
      expect(upload?.['x-mint']?.href).toBe(
        '/api-reference/questionnaire/upload-and-auto-answer-a-questionnaire-via-trust-portal-token',
      );
      expect(upload?.['x-codeSamples']?.[0]?.lang).toBe('bash');

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
});

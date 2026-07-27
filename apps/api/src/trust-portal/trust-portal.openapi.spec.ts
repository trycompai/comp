// Regression coverage for CS-752.
//
// The Trust Center config-write endpoints read organizationId (overview,
// custom-links) from the request body but declared no `@ApiBody`, so the
// generated OpenAPI spec had `requestBody: undefined` (body=None). The MCP
// server generates its tool input from that spec, so API-key/MCP callers sent
// an empty body — `body.organizationId` was undefined and
// `assertOrganizationAccess` threw 400 "Organization mismatch". FAQs had the
// same body=None gap, leaving the tool unable to send any FAQs.
//
// These tests build the OpenAPI document from the controller and assert each
// request body is now exposed. They fail before the `@ApiBody` decorators are
// added and pass after.

// Mock ESM-only / connection-making modules so this spec can build the OpenAPI
// document without a live DB, Redis, or better-auth runtime (same approach as
// gen-openapi.spec.ts / openapi-docs.spec.ts).
jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
  getTrustedOrigins: () => [],
  isTrustedOrigin: async () => false,
  isStaticTrustedOrigin: () => false,
}));

jest.mock('@trycompai/auth', () => ({
  statement: { trust: ['create', 'read', 'update', 'delete'] },
  BUILT_IN_ROLE_PERMISSIONS: {},
  RESTRICTED_ROLES: ['employee', 'contractor'],
  PRIVILEGED_ROLES: ['owner', 'admin', 'auditor'],
}));

jest.mock('@db', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const prismaClient = require('@prisma/client');
  return {
    ...prismaClient,
    db: {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      trust: { findMany: jest.fn().mockResolvedValue([]) },
    },
  };
});

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  })),
}));

// Env vars must be set before the imports below run (the transitive `../app/s3`
// import reads them at module load).
process.env.SECRET_KEY = 'test-secret-key-at-least-16-chars';
process.env.BASE_URL = 'http://localhost:3333';
process.env.APP_AWS_ACCESS_KEY_ID = 'test-access-key-id';
process.env.APP_AWS_SECRET_ACCESS_KEY = 'test-secret-access-key';
process.env.APP_AWS_BUCKET_NAME = 'test-bucket';
process.env.APP_AWS_REGION = 'us-east-1';

import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { TrustPortalController } from './trust-portal.controller';
import { TrustPortalService } from './trust-portal.service';
import { TrustCustomFrameworkService } from './trust-custom-framework.service';
import { TrustCustomFrameworkBadgeService } from './trust-custom-framework-badge.service';

// Minimal shapes to read the generated request-body schema without `any`.
interface JsonSchema {
  type?: string;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
}
interface OperationWithBody {
  requestBody?: {
    content?: { 'application/json'?: { schema?: JsonSchema } };
  };
}

describe('TrustPortalController OpenAPI request bodies (MCP contract)', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };
  const noopService = {} as unknown;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrustPortalController],
      providers: [
        { provide: TrustPortalService, useValue: noopService },
        { provide: TrustCustomFrameworkService, useValue: noopService },
        { provide: TrustCustomFrameworkBadgeService, useValue: noopService },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    app = module.createNestApplication();
    // Match main.ts so generated paths are prefixed with /v1 like the real spec.
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();

    const config = new DocumentBuilder()
      .setTitle('Trust Portal')
      .setVersion('1.0')
      .build();
    document = SwaggerModule.createDocument(app, config);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const bodySchema = (
    routePath: string,
    method: 'post' | 'put',
  ): JsonSchema | undefined => {
    const op = document.paths[routePath]?.[method] as
      | OperationWithBody
      | undefined;
    return op?.requestBody?.content?.['application/json']?.schema;
  };

  it('exposes organizationId in the update-overview request body', () => {
    const schema = bodySchema('/v1/trust-portal/overview', 'post');
    expect(schema).toBeDefined();
    expect(schema?.properties?.organizationId).toBeDefined();
    expect(schema?.required).toContain('organizationId');
  });

  it('exposes organizationId in the create-custom-link request body', () => {
    const schema = bodySchema('/v1/trust-portal/custom-links', 'post');
    expect(schema).toBeDefined();
    expect(schema?.properties?.organizationId).toBeDefined();
    expect(schema?.required).toContain('organizationId');
  });

  it('exposes organizationId in the reorder-custom-links request body', () => {
    const schema = bodySchema('/v1/trust-portal/custom-links/reorder', 'post');
    expect(schema).toBeDefined();
    expect(schema?.properties?.organizationId).toBeDefined();
    expect(schema?.required).toContain('organizationId');
  });

  it('exposes the faqs array in the update-faqs request body', () => {
    const schema = bodySchema('/v1/trust-portal/settings/faqs', 'put');
    expect(schema).toBeDefined();
    expect(schema?.properties?.faqs).toBeDefined();
    expect(schema?.required).toContain('faqs');
  });
});

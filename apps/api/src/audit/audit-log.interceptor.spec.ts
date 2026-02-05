import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';

// Mock auth.server before importing anything that depends on permission.guard
jest.mock('../auth/auth.server', () => ({
  auth: {
    api: {
      hasPermission: jest.fn(),
    },
  },
}));

const mockCreate = jest.fn();
const mockFindUnique = jest.fn();
jest.mock('@db', () => ({
  db: {
    auditLog: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
    policy: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    vendor: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    risk: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    control: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
  AuditLogEntityType: {
    organization: 'organization',
    framework: 'framework',
    requirement: 'requirement',
    control: 'control',
    policy: 'policy',
    task: 'task',
    people: 'people',
    risk: 'risk',
    vendor: 'vendor',
    tests: 'tests',
    integration: 'integration',
    trust: 'trust',
    finding: 'finding',
  },
  Prisma: {},
}));

// Import after mocks
import { AuditLogInterceptor } from './audit-log.interceptor';
import { PERMISSIONS_KEY } from '../auth/permission.guard';
import { SKIP_AUDIT_LOG_KEY } from './skip-audit-log.decorator';

describe('AuditLogInterceptor', () => {
  let interceptor: AuditLogInterceptor;
  let reflector: Reflector;

  const createMockExecutionContext = (
    overrides: {
      method?: string;
      url?: string;
      organizationId?: string;
      userId?: string;
      memberId?: string;
      params?: Record<string, string>;
      body?: Record<string, unknown>;
    } = {},
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method: overrides.method ?? 'PATCH',
          url: overrides.url ?? '/v1/policies/pol_123',
          organizationId: overrides.organizationId ?? 'org_123',
          userId: overrides.userId ?? 'user_123',
          memberId: overrides.memberId ?? 'mem_123',
          params: overrides.params ?? { id: 'pol_123' },
          body: overrides.body ?? undefined,
          headers: {},
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (response: unknown = { id: 'new_123' }): CallHandler => ({
    handle: () => of(response),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditLogInterceptor, Reflector],
    }).compile();

    interceptor = module.get<AuditLogInterceptor>(AuditLogInterceptor);
    reflector = module.get<Reflector>(Reflector);
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({});
    mockFindUnique.mockReset();
    mockFindUnique.mockResolvedValue(null);
  });

  it('should skip GET requests', (done) => {
    const context = createMockExecutionContext({ method: 'GET' });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        expect(mockCreate).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should skip HEAD requests', (done) => {
    const context = createMockExecutionContext({ method: 'HEAD' });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        expect(mockCreate).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should log POST requests', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['create'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'POST',
      url: '/v1/policies',
      params: {},
    });
    const handler = createMockCallHandler({ id: 'pol_new' });

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              organizationId: 'org_123',
              userId: 'user_123',
              memberId: 'mem_123',
              entityType: 'policy',
              entityId: 'pol_new',
              description: 'Created policy',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should log PATCH requests with entity ID from params', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['update'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'PATCH',
      url: '/v1/policies/pol_123',
      params: { id: 'pol_123' },
    });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              entityType: 'policy',
              entityId: 'pol_123',
              description: 'Updated policy',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should log DELETE requests', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'vendor', actions: ['delete'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'DELETE',
      url: '/v1/vendors/ven_456',
      params: { id: 'ven_456' },
    });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              entityType: 'vendor',
              entityId: 'ven_456',
              description: 'Deleted vendor',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should skip routes with @SkipAuditLog()', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === SKIP_AUDIT_LOG_KEY) return true;
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'finding', actions: ['create'] }];
      }
      return undefined;
    });

    const context = createMockExecutionContext({ method: 'POST' });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        expect(mockCreate).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should skip requests without userId', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['update'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'PATCH',
      userId: '',
    });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        expect(mockCreate).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should skip requests without organizationId', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['update'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'PATCH',
      organizationId: '',
    });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        expect(mockCreate).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should skip routes without @RequirePermission', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) return undefined;
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({ method: 'POST' });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        expect(mockCreate).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should handle db errors gracefully without throwing', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['update'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    mockCreate.mockRejectedValue(new Error('DB connection failed'));

    const context = createMockExecutionContext({ method: 'PATCH' });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalled();
          done();
        }, 50);
      },
    });
  });

  it('should map resource "member" to entity type "people"', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'member', actions: ['update'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({ method: 'PATCH' });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              entityType: 'people',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should map resource "portal" to entity type "trust"', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'portal', actions: ['update'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({ method: 'PATCH' });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              entityType: 'trust',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should skip audit resource to avoid audit-about-audit', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'audit', actions: ['read'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({ method: 'POST' });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        expect(mockCreate).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should extract entity ID from response body for POST creates', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'risk', actions: ['create'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'POST',
      url: '/v1/risks',
      params: {},
    });
    const handler = createMockCallHandler({ id: 'risk_789', name: 'Test Risk' });

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              entityId: 'risk_789',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should only log fields that actually changed for PATCH requests', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['update'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    // Mock current DB values
    mockFindUnique.mockResolvedValue({
      frequency: 'annually',
      status: 'published',
      name: 'My Policy',
    });

    const context = createMockExecutionContext({
      method: 'PATCH',
      url: '/v1/policies/pol_123',
      params: { id: 'pol_123' },
      body: { frequency: 'quarterly', status: 'published', name: 'My Policy' },
    });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              data: expect.objectContaining({
                changes: {
                  frequency: { previous: 'annually', current: 'quarterly' },
                },
              }),
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should show all fields as new for POST creates', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['create'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'POST',
      url: '/v1/policies',
      params: {},
      body: { name: 'New Policy', frequency: 'monthly' },
    });
    const handler = createMockCallHandler({ id: 'pol_new' });

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              data: expect.objectContaining({
                changes: {
                  name: { previous: null, current: 'New Policy' },
                  frequency: { previous: null, current: 'monthly' },
                },
              }),
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should redact sensitive fields', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'integration', actions: ['create'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'POST',
      url: '/v1/integrations',
      params: {},
      body: { name: 'GitHub', apiKey: 'sk-secret-123' },
    });
    const handler = createMockCallHandler({ id: 'int_123' });

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              data: expect.objectContaining({
                changes: {
                  name: { previous: null, current: 'GitHub' },
                  apiKey: { previous: null, current: '[REDACTED]' },
                },
              }),
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should not include changes key when no request body', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'vendor', actions: ['delete'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'DELETE',
      url: '/v1/vendors/ven_456',
      params: { id: 'ven_456' },
    });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          const callArg = mockCreate.mock.calls[0][0];
          expect(callArg.data.data).not.toHaveProperty('changes');
          done();
        }, 50);
      },
    });
  });

  it('should not create changes entry when nothing changed', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['update'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    // Same values — nothing actually changed
    mockFindUnique.mockResolvedValue({
      frequency: 'monthly',
      status: 'published',
    });

    const context = createMockExecutionContext({
      method: 'PATCH',
      url: '/v1/policies/pol_123',
      params: { id: 'pol_123' },
      body: { frequency: 'monthly', status: 'published' },
    });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          const callArg = mockCreate.mock.calls[0][0];
          expect(callArg.data.data).not.toHaveProperty('changes');
          done();
        }, 50);
      },
    });
  });
});

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
const mockPolicyFindUnique = jest.fn();
const mockMemberFindMany = jest.fn();
const mockControlFindMany = jest.fn();
jest.mock('@db', () => ({
  db: {
    auditLog: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
    policy: {
      findUnique: (...args: unknown[]) => mockPolicyFindUnique(...args),
    },
    vendor: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    risk: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    control: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findMany: (...args: unknown[]) => mockControlFindMany(...args),
    },
    member: {
      findMany: (...args: unknown[]) => mockMemberFindMany(...args),
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
  CommentEntityType: {
    task: 'task',
    vendor: 'vendor',
    risk: 'risk',
    policy: 'policy',
  },
  Prisma: {},
}));

// Import after mocks
import { AuditLogInterceptor } from './audit-log.interceptor';
import { PERMISSIONS_KEY } from '../auth/permission.guard';
import { AUDIT_READ_KEY, SKIP_AUDIT_LOG_KEY } from './skip-audit-log.decorator';

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
    mockPolicyFindUnique.mockReset();
    mockPolicyFindUnique.mockResolvedValue(null);
    mockMemberFindMany.mockReset();
    mockMemberFindMany.mockResolvedValue([]);
    mockControlFindMany.mockReset();
    mockControlFindMany.mockResolvedValue([]);
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

  it('should map resource "trust" to entity type "trust"', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'trust', actions: ['update'] }];
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
    mockPolicyFindUnique.mockResolvedValue({
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
    mockPolicyFindUnique.mockResolvedValue({
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

  it('should log comment creation with the parent entity (policy) and no changes', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'task', actions: ['update'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'POST',
      url: '/v1/comments',
      params: {},
      body: {
        content: '{"type":"doc","content":[{"type":"text","text":"This looks good!"}]}',
        entityId: 'pol_abc',
        entityType: 'policy',
      },
    });
    const handler = createMockCallHandler({ id: 'cmt_123' });

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              entityType: 'policy',
              entityId: 'pol_abc',
              description: 'Commented on policy',
            }),
          });
          // Should NOT include changes for comments
          const callArg = mockCreate.mock.calls[0][0];
          expect(callArg.data.data).not.toHaveProperty('changes');
          done();
        }, 50);
      },
    });
  });

  it('should resolve assigneeId to human-readable names in changes', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['update'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    mockPolicyFindUnique.mockResolvedValue({
      assigneeId: 'mem_old',
      frequency: 'monthly',
    });

    mockMemberFindMany.mockResolvedValue([
      { id: 'mem_old', user: { name: 'Alice Smith' } },
      { id: 'mem_new', user: { name: 'Bob Jones' } },
    ]);

    const context = createMockExecutionContext({
      method: 'PATCH',
      url: '/v1/policies/pol_123',
      params: { id: 'pol_123' },
      body: { assigneeId: 'mem_new', frequency: 'monthly' },
    });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              data: expect.objectContaining({
                changes: {
                  assignee: { previous: 'Alice Smith (mem_old)', current: 'Bob Jones (mem_new)' },
                },
              }),
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should show Unassigned when assigneeId is null', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['update'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    mockPolicyFindUnique.mockResolvedValue({
      assigneeId: null,
    });

    mockMemberFindMany.mockResolvedValue([
      { id: 'mem_new', user: { name: 'Bob Jones' } },
    ]);

    const context = createMockExecutionContext({
      method: 'PATCH',
      url: '/v1/policies/pol_123',
      params: { id: 'pol_123' },
      body: { assigneeId: 'mem_new' },
    });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              data: expect.objectContaining({
                changes: {
                  assignee: { previous: 'Unassigned', current: 'Bob Jones (mem_new)' },
                },
              }),
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should log comment creation on a vendor with vendor entity type', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'task', actions: ['update'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'POST',
      url: '/v1/comments',
      params: {},
      body: {
        content: 'Need review',
        entityId: 'ven_456',
        entityType: 'vendor',
      },
    });
    const handler = createMockCallHandler({ id: 'cmt_456' });

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              entityType: 'vendor',
              entityId: 'ven_456',
              description: 'Commented on vendor',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should log control mapping with resolved names and before/after', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['update'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    // Existing controls on the policy
    mockPolicyFindUnique.mockResolvedValue({
      controls: [
        { id: 'ctrl_1', name: 'Access Control' },
      ],
    });

    // Resolve control names
    mockControlFindMany.mockResolvedValue([
      { id: 'ctrl_1', name: 'Access Control' },
      { id: 'ctrl_2', name: 'Encryption' },
    ]);

    const context = createMockExecutionContext({
      method: 'POST',
      url: '/v1/policies/pol_123/controls',
      params: { id: 'pol_123' },
      body: { controlIds: ['ctrl_2'] },
    });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              description: 'Mapped controls to policy',
              data: expect.objectContaining({
                changes: {
                  controls: {
                    previous: 'Access Control (ctrl_1)',
                    current: expect.stringContaining('Access Control (ctrl_1)'),
                  },
                },
              }),
            }),
          });
          // Current should also contain the new control
          const callArg = mockCreate.mock.calls[0][0];
          const changes = callArg.data.data.changes;
          expect(changes.controls.current).toContain('Encryption (ctrl_2)');
          done();
        }, 50);
      },
    });
  });

  it('should log control unmapping with resolved names', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['delete'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    // Existing controls on the policy
    mockPolicyFindUnique.mockResolvedValue({
      controls: [
        { id: 'ctrl_1', name: 'Access Control' },
        { id: 'ctrl_2', name: 'Encryption' },
      ],
    });

    // Resolve control names
    mockControlFindMany.mockResolvedValue([
      { id: 'ctrl_1', name: 'Access Control' },
      { id: 'ctrl_2', name: 'Encryption' },
    ]);

    const context = createMockExecutionContext({
      method: 'DELETE',
      url: '/v1/policies/pol_123/controls/ctrl_2',
      params: { id: 'pol_123' },
    });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              description: 'Unmapped control from policy',
              data: expect.objectContaining({
                changes: {
                  controls: {
                    previous: 'Access Control (ctrl_1), Encryption (ctrl_2)',
                    current: 'Access Control (ctrl_1)',
                  },
                },
              }),
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should show None when all controls are removed', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['delete'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    // Only one control exists
    mockPolicyFindUnique.mockResolvedValue({
      controls: [
        { id: 'ctrl_1', name: 'Access Control' },
      ],
    });

    mockControlFindMany.mockResolvedValue([
      { id: 'ctrl_1', name: 'Access Control' },
    ]);

    const context = createMockExecutionContext({
      method: 'DELETE',
      url: '/v1/policies/pol_123/controls/ctrl_1',
      params: { id: 'pol_123' },
    });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              description: 'Unmapped control from policy',
              data: expect.objectContaining({
                changes: {
                  controls: {
                    previous: 'Access Control (ctrl_1)',
                    current: 'None',
                  },
                },
              }),
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should describe publishing a policy version with version number', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['publish'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'POST',
      url: '/v1/policies/pol_123/versions/publish',
      params: { id: 'pol_123' },
      body: { setAsActive: true },
    });
    const handler = createMockCallHandler({
      data: { versionId: 'ver_abc', version: 3 },
    });

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              entityType: 'policy',
              entityId: 'pol_123',
              description: 'Published policy version 3',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should describe creating a new policy version draft', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['update'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'POST',
      url: '/v1/policies/pol_123/versions',
      params: { id: 'pol_123' },
      body: {},
    });
    const handler = createMockCallHandler({
      data: { versionId: 'ver_xyz', version: 5 },
    });

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              description: 'Created policy version 5',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should describe activating a policy version', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['publish'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'POST',
      url: '/v1/policies/pol_123/versions/ver_abc/activate',
      params: { id: 'pol_123' },
    });
    const handler = createMockCallHandler({
      data: { versionId: 'ver_abc', version: 2 },
    });

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              description: 'Activated policy version 2',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should describe submitting a version for approval', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['approve'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'POST',
      url: '/v1/policies/pol_123/versions/ver_abc/submit-for-approval',
      params: { id: 'pol_123' },
      body: { approverId: 'mem_approver' },
    });
    const handler = createMockCallHandler({
      data: { versionId: 'ver_abc', version: 4 },
    });

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              description: 'Submitted policy version 4 for approval',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should describe deleting a policy version', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['delete'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'DELETE',
      url: '/v1/policies/pol_123/versions/ver_abc',
      params: { id: 'pol_123' },
    });
    const handler = createMockCallHandler({
      data: { deletedVersion: 2 },
    });

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              description: 'Deleted policy version 2',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should describe updating version content without changes diff', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['update'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'PATCH',
      url: '/v1/policies/pol_123/versions/ver_abc',
      params: { id: 'pol_123' },
      body: { content: [{ type: 'doc', content: [{ type: 'text', text: 'Hello' }] }] },
    });
    const handler = createMockCallHandler({ data: { versionId: 'ver_abc', version: 3 } });

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              description: 'Updated policy version 3 content',
            }),
          });
          // Should NOT include changes for content edits (TipTap JSON is not useful as a diff)
          const callArg = mockCreate.mock.calls[0][0];
          expect(callArg.data.data).not.toHaveProperty('changes');
          done();
        }, 50);
      },
    });
  });

  it('should describe accepting policy changes with version number', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['approve'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'POST',
      url: '/v1/policies/pol_123/accept-changes',
      params: { id: 'pol_123' },
      body: { approverId: 'mem_approver' },
    });
    const handler = createMockCallHandler({
      data: { success: true, version: 4, emailNotifications: [] },
    });

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              description: 'Approved and published policy version 4',
            }),
          });
          // Should not include changes for approval actions
          const callArg = mockCreate.mock.calls[0][0];
          expect(callArg.data.data).not.toHaveProperty('changes');
          done();
        }, 50);
      },
    });
  });

  it('should describe denying policy changes', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['approve'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'POST',
      url: '/v1/policies/pol_123/deny-changes',
      params: { id: 'pol_123' },
      body: { approverId: 'mem_approver' },
    });
    const handler = createMockCallHandler({
      data: { success: true },
    });

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              description: 'Denied policy changes',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should log GET requests with @AuditRead() decorator', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['read'] }];
      }
      if (key === AUDIT_READ_KEY) return true;
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'GET',
      url: '/v1/policies/pol_123/pdf/signed-url?versionId=ver_456',
      params: { id: 'pol_123' },
    });
    const handler = createMockCallHandler({ url: 'https://s3.example.com/policy.pdf' });

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              entityType: 'policy',
              entityId: 'pol_123',
              description: 'Downloaded policy PDF',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should describe regenerating a policy', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['update'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'POST',
      url: '/v1/policies/pol_123/regenerate',
      params: { id: 'pol_123' },
    });
    const handler = createMockCallHandler({ success: true });

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              entityType: 'policy',
              entityId: 'pol_123',
              description: 'Regenerated policy',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should describe archiving a policy', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['update'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });
    mockPolicyFindUnique.mockResolvedValue({ isArchived: false });

    const context = createMockExecutionContext({
      method: 'PATCH',
      url: '/v1/policies/pol_123',
      params: { id: 'pol_123' },
      body: { isArchived: true },
    });
    const handler = createMockCallHandler({ isArchived: true });

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              entityType: 'policy',
              entityId: 'pol_123',
              description: 'Archived policy',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should describe restoring a policy', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['update'] }];
      }
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });
    mockPolicyFindUnique.mockResolvedValue({ isArchived: true });

    const context = createMockExecutionContext({
      method: 'PATCH',
      url: '/v1/policies/pol_123',
      params: { id: 'pol_123' },
      body: { isArchived: false },
    });
    const handler = createMockCallHandler({ isArchived: false });

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              entityType: 'policy',
              entityId: 'pol_123',
              description: 'Restored policy',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should still skip GET requests without @AuditRead()', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return [{ resource: 'policy', actions: ['read'] }];
      }
      if (key === AUDIT_READ_KEY) return false;
      if (key === SKIP_AUDIT_LOG_KEY) return false;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'GET',
      url: '/v1/policies/pol_123',
      params: { id: 'pol_123' },
    });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        expect(mockCreate).not.toHaveBeenCalled();
        done();
      },
    });
  });
});

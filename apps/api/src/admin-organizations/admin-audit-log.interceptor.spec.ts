import { of } from 'rxjs';
import { AdminAuditLogInterceptor } from './admin-audit-log.interceptor';

const mockCreate = jest.fn().mockResolvedValue({});
const mockPolicyFind = jest.fn();
const mockTaskFind = jest.fn();
const mockVendorFind = jest.fn();
const mockFindingFind = jest.fn();
const mockContextFind = jest.fn();

jest.mock('@db', () => ({
  AuditLogEntityType: {
    organization: 'organization',
    finding: 'finding',
    policy: 'policy',
    task: 'task',
    vendor: 'vendor',
  },
  Prisma: {},
  db: {
    auditLog: {
      get create() {
        return mockCreate;
      },
    },
    policy: {
      get findFirst() {
        return mockPolicyFind;
      },
    },
    taskItem: {
      get findFirst() {
        return mockTaskFind;
      },
    },
    vendor: {
      get findFirst() {
        return mockVendorFind;
      },
    },
    finding: {
      get findFirst() {
        return mockFindingFind;
      },
    },
    context: {
      get findFirst() {
        return mockContextFind;
      },
    },
  },
}));

jest.mock('../audit/audit-log.constants', () => ({
  MUTATION_METHODS: new Set(['POST', 'PATCH', 'PUT', 'DELETE']),
  SENSITIVE_KEYS: new Set(['password', 'token']),
}));

function buildContext(overrides: {
  method?: string;
  url?: string;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  userId?: string;
}) {
  const request = {
    method: overrides.method ?? 'PATCH',
    url: overrides.url ?? '/v1/admin/organizations/org_1/policies/pol_1',
    params: overrides.params ?? { orgId: 'org_1' },
    body: overrides.body ?? { status: 'published' },
    userId: 'userId' in overrides ? overrides.userId : 'usr_admin',
  };

  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as Parameters<AdminAuditLogInterceptor['intercept']>[0];
}

const nextHandler = { handle: () => of({ success: true }) };

describe('AdminAuditLogInterceptor', () => {
  let interceptor: AdminAuditLogInterceptor;

  beforeEach(() => {
    interceptor = new AdminAuditLogInterceptor();
    jest.clearAllMocks();
    mockPolicyFind.mockResolvedValue(null);
    mockTaskFind.mockResolvedValue(null);
    mockVendorFind.mockResolvedValue(null);
    mockFindingFind.mockResolvedValue(null);
    mockContextFind.mockResolvedValue(null);
  });

  it('should skip GET requests', (done) => {
    const ctx = buildContext({ method: 'GET' });

    interceptor.intercept(ctx, nextHandler).subscribe({
      complete: () => {
        expect(mockCreate).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should skip when no userId', (done) => {
    const ctx = buildContext({ userId: undefined });

    interceptor.intercept(ctx, nextHandler).subscribe({
      complete: () => {
        expect(mockCreate).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should include policy name in description', (done) => {
    mockPolicyFind.mockResolvedValue({ name: 'Privacy Policy' });

    const ctx = buildContext({
      method: 'PATCH',
      url: '/v1/admin/organizations/org_1/policies/pol_1',
      params: { orgId: 'org_1' },
      body: { status: 'published' },
    });

    interceptor.intercept(ctx, nextHandler).subscribe({
      complete: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              organizationId: 'org_1',
              userId: 'usr_admin',
              entityType: 'policy',
              entityId: 'pol_1',
              description: "Updated policy 'Privacy Policy'",
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should fall back to generic description when name not found', (done) => {
    mockPolicyFind.mockResolvedValue(null);

    const ctx = buildContext({
      method: 'PATCH',
      url: '/v1/admin/organizations/org_1/policies/pol_1',
      params: { orgId: 'org_1' },
    });

    interceptor.intercept(ctx, nextHandler).subscribe({
      complete: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              description: 'Updated policy',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should log POST mutations for findings', (done) => {
    const ctx = buildContext({
      method: 'POST',
      url: '/v1/admin/organizations/org_1/findings',
      params: { orgId: 'org_1' },
      body: { title: 'New finding' },
    });

    interceptor.intercept(ctx, nextHandler).subscribe({
      complete: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              organizationId: 'org_1',
              entityType: 'finding',
              description: 'Created finding',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should handle activate action', (done) => {
    const ctx = buildContext({
      method: 'PATCH',
      url: '/v1/admin/organizations/org_1/activate',
      params: { id: 'org_1' },
      body: {},
    });

    interceptor.intercept(ctx, nextHandler).subscribe({
      complete: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              organizationId: 'org_1',
              entityType: 'organization',
              entityId: 'org_1',
              description: 'Activated organization',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should handle deactivate action', (done) => {
    const ctx = buildContext({
      method: 'PATCH',
      url: '/v1/admin/organizations/org_1/deactivate',
      params: { id: 'org_1' },
      body: {},
    });

    interceptor.intercept(ctx, nextHandler).subscribe({
      complete: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              description: 'Deactivated organization',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should sanitize sensitive keys from body', (done) => {
    mockPolicyFind.mockResolvedValue({ name: 'Test' });

    const ctx = buildContext({
      method: 'PATCH',
      url: '/v1/admin/organizations/org_1/policies/pol_1',
      params: { orgId: 'org_1' },
      body: { status: 'published', password: 'secret123' },
    });

    interceptor.intercept(ctx, nextHandler).subscribe({
      complete: () => {
        setTimeout(() => {
          const callData = mockCreate.mock.calls[0][0].data;
          const changes = callData.data.changes;
          expect(changes.status).toBeDefined();
          expect(changes.password).toBeUndefined();
          done();
        }, 50);
      },
    });
  });

  it('should handle DELETE for invitations', (done) => {
    const ctx = buildContext({
      method: 'DELETE',
      url: '/v1/admin/organizations/org_1/invitations/inv_1',
      params: { id: 'org_1' },
      body: undefined,
    });

    interceptor.intercept(ctx, nextHandler).subscribe({
      complete: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              description: 'Revoked organization invitation',
              entityType: 'organization',
            }),
          });
          done();
        }, 50);
      },
    });
  });

  it('should include task title in description', (done) => {
    mockTaskFind.mockResolvedValue({ title: 'Review access controls' });

    const ctx = buildContext({
      method: 'PATCH',
      url: '/v1/admin/organizations/org_1/tasks/tsk_1',
      params: { orgId: 'org_1' },
      body: { status: 'completed' },
    });

    interceptor.intercept(ctx, nextHandler).subscribe({
      complete: () => {
        setTimeout(() => {
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              description: "Updated task 'Review access controls'",
              data: expect.objectContaining({
                resource: 'admin',
                permission: 'platform-admin',
              }),
            }),
          });
          done();
        }, 50);
      },
    });
  });
});

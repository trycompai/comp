import { of } from 'rxjs';
import { AdminAuditLogInterceptor } from './admin-audit-log.interceptor';

const mockCreate = jest.fn().mockResolvedValue({});
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
    context: {
      get findFirst() {
        return mockContextFind;
      },
    },
  },
}));

jest.mock('../audit/audit-log.constants', () => ({
  MUTATION_METHODS: new Set(['POST', 'PATCH', 'PUT', 'DELETE']),
  SENSITIVE_KEYS: new Set<string>(),
}));

describe('AdminAuditLogInterceptor context parsing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextFind.mockResolvedValue({
      question: 'Which subprocessors are used for production data?',
    });
  });

  it('keeps context entity ids instead of treating them as org-level actions', (done) => {
    const request = {
      method: 'PATCH',
      url: '/v1/admin/organizations/org_1/context/ctx_1',
      params: { orgId: 'org_1' },
      body: { answer: 'Updated answer' },
      userId: 'usr_admin',
    };
    const context = {
      getHandler: () => context,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as Parameters<AdminAuditLogInterceptor['intercept']>[0];
    const interceptor = new AdminAuditLogInterceptor({
      get: jest.fn().mockReturnValue(false),
    } as never);

    interceptor
      .intercept(context, { handle: () => of({ ok: true }) })
      .subscribe({
        complete: () => {
          setTimeout(() => {
            expect(mockContextFind).toHaveBeenCalledWith({
              where: { id: 'ctx_1', organizationId: 'org_1' },
              select: { question: true },
            });
            expect(mockCreate).toHaveBeenCalledWith({
              data: expect.objectContaining({
                entityType: 'organization',
                entityId: 'ctx_1',
                description:
                  "Updated context 'Which subprocessors are used for production data?'",
              }),
            });
            done();
          }, 50);
        },
      });
  });
});

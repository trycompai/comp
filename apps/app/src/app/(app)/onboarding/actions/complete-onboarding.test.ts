import { beforeEach, describe, expect, it, vi } from 'vitest';

type ActionArgs = {
  parsedInput: Record<string, unknown>;
  ctx: { user: { id: string }; session: { activeOrganizationId: string | null } };
};
type ActionHandler = (args: ActionArgs) => Promise<{ success: boolean; error?: string }>;

const mocks = vi.hoisted(() => ({
  memberFindFirst: vi.fn(),
  organizationUpdate: vi.fn(),
  organizationUpdateMany: vi.fn(),
  contextCreateMany: vi.fn(),
  globalVendorsFindFirst: vi.fn(),
  globalVendorsCreate: vi.fn(),
  frameworkInstanceFindFirst: vi.fn(),
  onboardingUpsert: vi.fn(),
  onboardingUpdate: vi.fn(),
  setActiveOrganization: vi.fn(),
  taskTrigger: vi.fn(),
  resolveUserPermissions: vi.fn(),
  initializeOrganization: vi.fn(),
}));

vi.mock('@/actions/safe-action', () => {
  const builder = {
    inputSchema: () => builder,
    metadata: () => builder,
    action: (handler: ActionHandler) => handler,
  };
  return { authActionClientWithoutOrg: builder };
});

// permissions.server.ts starts with `import 'server-only'`, which throws outside
// an RSC build — mock it, and hand back the permission map for the role under test.
vi.mock('@/lib/permissions.server', () => ({
  resolveUserPermissions: mocks.resolveUserPermissions,
}));

vi.mock('@db/server', () => ({
  db: {
    member: { findFirst: mocks.memberFindFirst },
    organization: {
      update: mocks.organizationUpdate,
      updateMany: mocks.organizationUpdateMany,
    },
    context: { createMany: mocks.contextCreateMany },
    globalVendors: {
      findFirst: mocks.globalVendorsFindFirst,
      create: mocks.globalVendorsCreate,
    },
    frameworkInstance: { findFirst: mocks.frameworkInstanceFindFirst },
    onboarding: { upsert: mocks.onboardingUpsert, update: mocks.onboardingUpdate },
  },
}));

vi.mock('@/utils/auth', () => ({
  auth: { api: { setActiveOrganization: mocks.setActiveOrganization } },
}));

vi.mock('@trigger.dev/sdk', () => ({ tasks: { trigger: mocks.taskTrigger } }));

// Imported for their task types only; both pull in @trigger.dev/sdk and @db/server.
vi.mock('@/trigger/tasks/onboarding/onboard-organization', () => ({
  onboardOrganization: {},
}));
vi.mock('@/trigger/tasks/device/create-fleet-label-for-org', () => ({
  createFleetLabelForOrg: {},
}));
vi.mock('@/actions/organization/lib/initialize-organization', () => ({
  initializeOrganization: mocks.initializeOrganization,
}));
vi.mock('@/actions/organization/lib/resolve-framework-ids', () => ({
  resolveFrameworkIds: vi.fn(async () => []),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn(async () => ({ set: vi.fn() })),
}));

import { completeOnboarding } from './complete-onboarding';

const runAction = completeOnboarding as unknown as ActionHandler;

const ORG_ID = 'org_1';

// Only the fields the action reads; the rest of the schema is irrelevant to authorization.
const parsedInput = {
  organizationId: ORG_ID,
  describe: 'We make widgets',
  industry: 'Technology',
  teamSize: '10',
  cSuite: [],
  reportSignatory: { fullName: 'A', jobTitle: 'CEO', email: 'a@example.com' },
  devices: 'laptops',
  authentication: 'sso',
  workLocation: 'remote',
  infrastructure: 'cloud',
  dataTypes: 'customer data',
  geo: 'US',
  shipping: { fullName: 'A', address: 'x' },
};

function call() {
  return runAction({
    parsedInput,
    ctx: { user: { id: 'user_1' }, session: { activeOrganizationId: ORG_ID } },
  });
}

function expectNothingWritten() {
  expect(mocks.contextCreateMany).not.toHaveBeenCalled();
  expect(mocks.globalVendorsCreate).not.toHaveBeenCalled();
  expect(mocks.taskTrigger).not.toHaveBeenCalled();
  expect(mocks.onboardingUpsert).not.toHaveBeenCalled();
}

describe('completeOnboarding — authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.frameworkInstanceFindFirst.mockResolvedValue({ id: 'frk_1' });
    mocks.onboardingUpsert.mockResolvedValue({});
    mocks.onboardingUpdate.mockResolvedValue({});
    mocks.taskTrigger.mockResolvedValue({ id: 'run_1', publicAccessToken: 'pat_1' });
    mocks.setActiveOrganization.mockResolvedValue({});
  });

  it('refuses a portal-only employee, even though they are a member of the org', async () => {
    mocks.memberFindFirst.mockResolvedValue({ id: 'mem_1', role: 'employee' });
    mocks.resolveUserPermissions.mockResolvedValue({
      policy: ['read'],
      portal: ['read', 'update'],
    });

    const result = await call();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Access denied');
    expect(mocks.organizationUpdateMany).not.toHaveBeenCalled();
    expect(mocks.organizationUpdate).not.toHaveBeenCalled();
    expectNothingWritten();
  });

  it('refuses a portal-only contractor', async () => {
    mocks.memberFindFirst.mockResolvedValue({ id: 'mem_1', role: 'contractor' });
    mocks.resolveUserPermissions.mockResolvedValue({
      policy: ['read'],
      portal: ['read', 'update'],
    });

    const result = await call();

    expect(result.success).toBe(false);
    expectNothingWritten();
  });

  it('refuses a read-only auditor', async () => {
    mocks.memberFindFirst.mockResolvedValue({ id: 'mem_1', role: 'auditor' });
    mocks.resolveUserPermissions.mockResolvedValue({
      organization: ['read'],
      policy: ['read'],
      app: ['read'],
    });

    const result = await call();

    expect(result.success).toBe(false);
    expectNothingWritten();
  });

  it('refuses a custom role with no app access', async () => {
    mocks.memberFindFirst.mockResolvedValue({ id: 'mem_1', role: 'policy-reader' });
    mocks.resolveUserPermissions.mockResolvedValue({ policy: ['read'] });

    const result = await call();

    expect(result.success).toBe(false);
    expectNothingWritten();
  });

  it('refuses a deactivated or inactive member', async () => {
    mocks.memberFindFirst.mockResolvedValue(null);

    const result = await call();

    expect(result.success).toBe(false);
    expect(mocks.resolveUserPermissions).not.toHaveBeenCalled();
    expectNothingWritten();
  });

  it('refuses an org that already completed onboarding, even for the owner', async () => {
    mocks.memberFindFirst.mockResolvedValue({ id: 'mem_1', role: 'owner' });
    mocks.resolveUserPermissions.mockResolvedValue({
      organization: ['read', 'update', 'delete'],
      app: ['read'],
    });
    mocks.organizationUpdateMany.mockResolvedValue({ count: 0 }); // claim lost

    const result = await call();

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already been completed/i);
    expectNothingWritten();
  });

  it('allows an owner on a not-yet-onboarded org and claims the flag first', async () => {
    mocks.memberFindFirst.mockResolvedValue({ id: 'mem_1', role: 'owner' });
    mocks.resolveUserPermissions.mockResolvedValue({
      organization: ['read', 'update', 'delete'],
      app: ['read'],
    });
    mocks.organizationUpdateMany.mockResolvedValue({ count: 1 });

    const result = await call();

    expect(result.success).toBe(true);
    expect(mocks.organizationUpdateMany).toHaveBeenCalledWith({
      where: { id: ORG_ID, onboardingCompleted: false },
      data: { onboardingCompleted: true },
    });
    // Claim precedes every write and the job trigger.
    expect(mocks.organizationUpdateMany.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.contextCreateMany.mock.invocationCallOrder[0],
    );
    expect(mocks.contextCreateMany).toHaveBeenCalled();
    expect(mocks.taskTrigger).toHaveBeenCalledWith(
      'onboard-organization',
      { organizationId: ORG_ID },
      { tags: [ORG_ID] },
    );
  });

  it('allows an admin on a not-yet-onboarded org', async () => {
    mocks.memberFindFirst.mockResolvedValue({ id: 'mem_1', role: 'admin' });
    mocks.resolveUserPermissions.mockResolvedValue({
      organization: ['read', 'update'],
      app: ['read'],
    });
    mocks.organizationUpdateMany.mockResolvedValue({ count: 1 });

    const result = await call();

    expect(result.success).toBe(true);
    expect(mocks.taskTrigger).toHaveBeenCalled();
  });
});

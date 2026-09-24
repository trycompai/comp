import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.fn();
const mockTaskFindUnique = vi.fn();
const mockAutomationFindUnique = vi.fn();
const mockRevalidatePath = vi.fn();
const mockFetch = vi.fn();

vi.mock('@/utils/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock('@db/server', () => ({
  db: {
    task: { findUnique: mockTaskFindUnique },
    evidenceAutomation: { findUnique: mockAutomationFindUnique },
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.stubGlobal('fetch', mockFetch);

const {
  uploadAutomationScript,
  executeAutomationScript,
  publishAutomation,
  restoreVersion,
} = await import('./task-automation-actions');

const ORG_ID = 'org_abc';

function mockSession(activeOrganizationId: string | null | undefined) {
  mockGetSession.mockResolvedValue({
    session: { activeOrganizationId },
    user: { id: 'user_1' },
  });
}

function mockEnterpriseOk(data: unknown = {}) {
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ success: true, data }), { status: 200 }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ENTERPRISE_API_SECRET = 'test-key';
  mockSession(ORG_ID);
});

describe('uploadAutomationScript', () => {
  const payload = { orgId: ORG_ID, taskId: 'tsk_1', content: 'code' };

  it("rejects when the task belongs to another organization", async () => {
    mockTaskFindUnique.mockResolvedValue({ organizationId: 'org_other' });

    const result = await uploadAutomationScript(payload);

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects when the task does not exist', async () => {
    mockTaskFindUnique.mockResolvedValue(null);

    const result = await uploadAutomationScript(payload);

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("uploads when the task belongs to the caller's organization", async () => {
    mockTaskFindUnique.mockResolvedValue({ organizationId: ORG_ID });
    mockEnterpriseOk({ key: `${ORG_ID}/tsk_1.js` });

    const result = await uploadAutomationScript(payload);

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('executeAutomationScript', () => {
  const payload = { orgId: ORG_ID, taskId: 'tsk_1', automationId: 'aut_1' };

  it("rejects when the automation belongs to another organization", async () => {
    mockAutomationFindUnique.mockResolvedValue({
      task: { organizationId: 'org_other' },
    });

    const result = await executeAutomationScript(payload);

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects when the automation does not exist', async () => {
    mockAutomationFindUnique.mockResolvedValue(null);

    const result = await executeAutomationScript(payload);

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("executes when the automation belongs to the caller's organization", async () => {
    mockAutomationFindUnique.mockResolvedValue({
      task: { organizationId: ORG_ID },
    });
    mockEnterpriseOk({ runId: 'run_1' });

    const result = await executeAutomationScript(payload);

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('publishAutomation', () => {
  it("rejects before calling the enterprise API when the automation belongs to another organization", async () => {
    mockAutomationFindUnique.mockResolvedValue({
      task: { organizationId: 'org_other' },
    });

    const result = await publishAutomation(ORG_ID, 'tsk_1', 'aut_1');

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects when the automation does not exist', async () => {
    mockAutomationFindUnique.mockResolvedValue(null);

    const result = await publishAutomation(ORG_ID, 'tsk_1', 'aut_1');

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('restoreVersion', () => {
  it("rejects before calling the enterprise API when the automation belongs to another organization", async () => {
    mockAutomationFindUnique.mockResolvedValue({
      task: { organizationId: 'org_other' },
    });

    const result = await restoreVersion(ORG_ID, 'tsk_1', 'aut_1', 2);

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("restores when the automation belongs to the caller's organization", async () => {
    mockAutomationFindUnique.mockResolvedValue({
      task: { organizationId: ORG_ID },
    });
    mockEnterpriseOk({ success: true });

    const result = await restoreVersion(ORG_ID, 'tsk_1', 'aut_1', 2);

    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

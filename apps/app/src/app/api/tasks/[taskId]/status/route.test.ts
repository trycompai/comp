import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getAccess: vi.fn(), retrieve: vi.fn() }));
vi.mock('@/lib/api-server', () => ({ serverApi: { get: mocks.getAccess } }));
vi.mock('@trigger.dev/sdk', () => ({ runs: { retrieve: mocks.retrieve } }));

import { GET } from './route';

const access = (permissions: Record<string, string[]> = { policy: ['read'] }) => ({
  status: 200,
  data: { organizationId: 'org_mine', permissions },
});
const run = () => ({
  taskIdentifier: 'update-policy',
  status: 'COMPLETED',
  output: { result: 'private policy content' },
  tags: ['org_mine'],
  payload: { organizationId: 'org_mine' },
});
const request = () => new NextRequest('http://localhost/api/tasks/run_123/status');
const params = (taskId = 'run_123') => ({ params: Promise.resolve({ taskId }) });

describe('GET /api/tasks/[taskId]/status', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getAccess.mockResolvedValue(access());
    mocks.retrieve.mockResolvedValue(run());
  });

  it.each([401, 403])(
    'denies an API-rejected session (%s) before retrieving a run',
    async (status) => {
      mocks.getAccess.mockResolvedValue({ status, error: 'No active membership' });
      const response = await GET(request(), params());
      expect(response.status).toBe(status);
      expect(mocks.retrieve).not.toHaveBeenCalled();
      expect(await response.json()).not.toHaveProperty('output');
    },
  );

  it('authorizes membership and permissions through the API', async () => {
    const response = await GET(request(), params());
    expect(mocks.getAccess).toHaveBeenCalledWith('/v1/auth/task-status-access');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'COMPLETED', output: run().output });
  });

  it('allows an auditor with resource read permission without write permission', async () => {
    mocks.getAccess.mockResolvedValue(access({ policy: ['read'], app: ['read'] }));
    expect((await GET(request(), params())).status).toBe(200);
  });

  it('denies a same-organization user without policy read access', async () => {
    mocks.getAccess.mockResolvedValue(access({ app: ['read'], vendor: ['read'] }));
    const response = await GET(request(), params());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Run not found' });
  });

  it('does not treat write permission alone as read permission', async () => {
    mocks.getAccess.mockResolvedValue(access({ policy: ['update'] }));
    expect((await GET(request(), params())).status).toBe(404);
  });

  it.each([
    { tags: ['org_other'] },
    { tags: [] },
    { tags: ['org_mine', 'org_other'] },
    { tags: ['org_mine', 'org:org_other'] },
    { tags: null },
    { taskIdentifier: 'unknown-task' },
    { taskIdentifier: 'constructor' },
    { taskIdentifier: undefined },
    { payload: { organizationId: 'org_other' } },
    { payload: { organizationId: 'org_mine', scoreContext: { organizationId: 'org_other' } } },
    { payload: undefined },
  ])('hides unowned, ambiguous, unknown or malformed runs: %j', async (override) => {
    mocks.retrieve.mockResolvedValue({ ...run(), ...override });
    const response = await GET(request(), params());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Run not found' });
  });

  it('supports organization tags added by the API workers', async () => {
    mocks.retrieve.mockResolvedValue({ ...run(), tags: ['org:org_mine', 'policy'] });
    expect((await GET(request(), params())).status).toBe(200);
  });

  it('requires every resource permission for tasks with combined output', async () => {
    mocks.retrieve.mockResolvedValue({
      ...run(),
      taskIdentifier: 'link-risks-and-vendors-to-work',
    });
    mocks.getAccess.mockResolvedValue(access({ risk: ['read'], vendor: ['read'] }));
    expect((await GET(request(), params())).status).toBe(404);
    mocks.getAccess.mockResolvedValue(access({ risk: ['read'], vendor: ['read'], task: ['read'] }));
    expect((await GET(request(), params())).status).toBe(200);
  });

  it.each([0, 500])(
    'fails closed when the authorization API is unavailable (%s)',
    async (status) => {
      mocks.getAccess.mockResolvedValue({ status, error: 'internal secret error' });
      const response = await GET(request(), params());
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: 'Unable to verify access' });
      expect(mocks.retrieve).not.toHaveBeenCalled();
    },
  );

  it.each([
    { organizationId: 'org_mine', permissions: { policy: 'read' } },
    { permissions: { policy: ['read'] } },
    { organizationId: '', permissions: { policy: ['read'] } },
  ])('denies malformed authorization responses', async (data) => {
    mocks.getAccess.mockResolvedValue({ status: 200, data });
    expect((await GET(request(), params())).status).toBe(503);
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });

  it('rejects missing run IDs', async () => {
    expect((await GET(request(), params(''))).status).toBe(400);
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });

  it('does not expose SDK exception details', async () => {
    mocks.retrieve.mockRejectedValue(new Error('secret credential'));
    const response = await GET(request(), params());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Failed to retrieve run status' });
  });

  it('does not expose raw worker error details', async () => {
    mocks.retrieve.mockResolvedValue({ ...run(), error: { message: 'secret credential' } });
    const response = await GET(request(), params());
    expect(response.status).toBe(200);
    expect((await response.json()).error).toBe('Task failed');
  });
});

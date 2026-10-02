import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/permissions.server', () => ({
  requireApiPermission: vi.fn(),
}));

vi.mock('@trigger.dev/sdk', () => ({
  runs: {
    retrieve: vi.fn(),
  },
}));

import { GET } from './route';
import { requireApiPermission } from '@/lib/permissions.server';
import { runs } from '@trigger.dev/sdk';

const mockRequirePermission = vi.mocked(requireApiPermission);
const mockRunsRetrieve = vi.mocked(runs.retrieve);

type RetrievedRun = Awaited<ReturnType<typeof runs.retrieve>>;

function createRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/tasks/run_123/status');
}

function createParams(taskId: string): { params: Promise<{ taskId: string }> } {
  return { params: Promise.resolve({ taskId }) };
}

function grant(organizationId: string) {
  mockRequirePermission.mockResolvedValue({
    organizationId,
    userId: 'usr_1',
    permissions: { task: ['read'] },
  });
}

function mockRun(run: { status: string; output: unknown; tags: string[] }) {
  mockRunsRetrieve.mockResolvedValue({
    error: undefined,
    ...run,
  } as unknown as RetrievedRun);
}

describe('GET /api/tasks/[taskId]/status', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('requires the task:read permission', async () => {
    grant('org_mine');
    mockRun({ status: 'COMPLETED', output: {}, tags: ['org_mine'] });

    await GET(createRequest(), createParams('run_123'));

    expect(mockRequirePermission).toHaveBeenCalledWith(
      expect.any(NextRequest),
      'task',
      'read',
    );
  });

  it('forwards the 401 when not authenticated and never reads the run', async () => {
    mockRequirePermission.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );

    const response = await GET(createRequest(), createParams('run_123'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(mockRunsRetrieve).not.toHaveBeenCalled();
  });

  it('returns 403 without reading the run when the role lacks task:read', async () => {
    mockRequirePermission.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    );

    const response = await GET(createRequest(), createParams('run_123'));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
    expect(mockRunsRetrieve).not.toHaveBeenCalled();
  });

  it('should return 404 (not leaking existence) when the run belongs to another organization', async () => {
    grant('org_mine');
    mockRun({
      status: 'COMPLETED',
      output: { secret: 'someone else policy' },
      tags: ['org_other'],
    });

    const response = await GET(createRequest(), createParams('run_123'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Run not found');
    expect(data.output).toBeUndefined();
  });

  it('should return 404 when the run has no tags at all', async () => {
    grant('org_mine');
    mockRun({ status: 'COMPLETED', output: { secret: 'untagged run' }, tags: [] });

    const response = await GET(createRequest(), createParams('run_123'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Run not found');
  });

  it('should return the run status when permitted and the run is tagged with the caller organization', async () => {
    grant('org_mine');
    mockRun({
      status: 'COMPLETED',
      output: { result: 'my own output' },
      tags: ['org_mine'],
    });

    const response = await GET(createRequest(), createParams('run_123'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('COMPLETED');
    expect(data.output).toEqual({ result: 'my own output' });
  });
});

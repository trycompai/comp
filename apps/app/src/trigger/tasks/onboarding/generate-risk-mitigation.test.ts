import { describe, expect, it, vi } from 'vitest';

// generate-risk-mitigation.ts calls task()/queue() at import time and pulls in
// the Prisma client, axios, and onboarding helpers. Mock those so we can import
// and unit-test the pure buildMitigationDefaultWrites helper in isolation.
vi.mock('@trigger.dev/sdk', () => ({
  task: vi.fn((config) => config),
  queue: vi.fn((config) => config),
  tags: { add: vi.fn() },
  metadata: { set: vi.fn(), increment: vi.fn(), decrement: vi.fn() },
  tasks: { trigger: vi.fn(), batchTriggerAndWait: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@db/server', () => ({
  db: {},
  Prisma: {},
  RiskStatus: { open: 'open', pending: 'pending', closed: 'closed', archived: 'archived' },
}));
vi.mock('axios', () => ({ default: { post: vi.fn() } }));
vi.mock('./onboard-organization-helpers', () => ({
  createRiskMitigationComment: vi.fn(),
  findCommentAuthor: vi.fn(),
}));

import { buildMitigationDefaultWrites } from './generate-risk-mitigation';

describe('buildMitigationDefaultWrites', () => {
  const riskId = 'rsk_1';
  const organizationId = 'org_1';

  it('promotes a still-open risk to pending, scoped to status: open', () => {
    const writes = buildMitigationDefaultWrites({ riskId, organizationId });

    expect(writes).toHaveLength(1);
    expect(writes[0]).toEqual({
      where: { id: riskId, organizationId, status: 'open' },
      data: { status: 'pending' },
    });
  });

  it('never issues an unconditional status write — the where-clause must constrain status to open so an async re-run (Regenerate / task-unlink) cannot reopen a user-closed risk', () => {
    const writes = buildMitigationDefaultWrites({ riskId, organizationId, authorId: 'mem_1' });

    for (const write of writes) {
      const data = write.data as { status?: string };
      if (data.status === 'pending') {
        expect(write.where).toMatchObject({ status: 'open' });
      }
    }
  });

  it('assigns the author only when the risk is still unassigned', () => {
    const writes = buildMitigationDefaultWrites({ riskId, organizationId, authorId: 'mem_1' });

    expect(writes).toHaveLength(2);
    expect(writes[1]).toEqual({
      where: { id: riskId, organizationId, assigneeId: null },
      data: { assigneeId: 'mem_1' },
    });
  });

  it('skips the assignee write entirely on the task-unlink path (no author)', () => {
    const writes = buildMitigationDefaultWrites({ riskId, organizationId });

    expect(writes.some((w) => 'assigneeId' in (w.data as object))).toBe(false);
  });
});

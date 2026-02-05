import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@db', async () => {
  const { mockDb } = await import('@/test-utils/mocks/db');
  return { db: mockDb };
});

import { mockDb } from '@/test-utils/mocks/db';

const { getContextEntries } = await import('./getContextEntries');

describe('getContextEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should query using the provided orgId directly without session checks', async () => {
    const orgId = 'org_abc';
    const mockEntries = [{ id: '1', question: 'Test?', organizationId: orgId }];

    mockDb.context.findMany.mockResolvedValue(mockEntries);
    mockDb.context.count.mockResolvedValue(1);

    const result = await getContextEntries({ orgId, page: 1, perPage: 10 });

    expect(result.data).toEqual(mockEntries);
    expect(result.pageCount).toBe(1);
    expect(mockDb.context.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: orgId },
      }),
    );
  });

  it('should apply search filter when provided', async () => {
    const orgId = 'org_abc';

    mockDb.context.findMany.mockResolvedValue([]);
    mockDb.context.count.mockResolvedValue(0);

    await getContextEntries({ orgId, search: 'keyword', page: 1, perPage: 10 });

    expect(mockDb.context.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: orgId,
          question: { contains: 'keyword', mode: 'insensitive' },
        },
      }),
    );
  });

  it('should paginate correctly', async () => {
    const orgId = 'org_abc';

    mockDb.context.findMany.mockResolvedValue([]);
    mockDb.context.count.mockResolvedValue(25);

    const result = await getContextEntries({ orgId, page: 2, perPage: 10 });

    expect(mockDb.context.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      }),
    );
    expect(result.pageCount).toBe(3);
  });
});

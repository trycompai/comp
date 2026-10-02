import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createToken, getSession } = vi.hoisted(() => ({
  createToken: vi.fn(),
  getSession: vi.fn(),
}));
vi.mock('@trigger.dev/sdk', () => ({ auth: { createTriggerPublicToken: createToken } }));
vi.mock('@/utils/auth', () => ({ auth: { api: { getSession } } }));

import { POST } from './route';

describe('retired questionnaire token endpoint', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['admin', 'auditor', 'employee', 'unauthenticated'])(
    'issues no trigger capability for %s callers',
    async (role) => {
      getSession.mockResolvedValue(
        role === 'unauthenticated'
          ? null
          : {
              user: { id: 'user', role },
              session: { activeOrganizationId: 'org_aaaaaaaaaaaaaaaaaaaaaaaa' },
            },
      );

      const response = await POST();

      expect(response.status).toBe(410);
      expect(await response.json()).not.toHaveProperty('token');
      expect(createToken).not.toHaveBeenCalled();
    },
  );
});

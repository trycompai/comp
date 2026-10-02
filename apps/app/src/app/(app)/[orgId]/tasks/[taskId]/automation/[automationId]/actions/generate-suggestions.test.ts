import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findMember: vi.fn(),
  findVendors: vi.fn(),
  findContext: vi.fn(),
  resolvePermissions: vi.fn(),
  generateObject: vi.fn(),
}));

vi.mock('@/utils/auth', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('@db/server', () => ({
  db: {
    member: { findFirst: mocks.findMember },
    vendor: { findMany: mocks.findVendors },
    context: { findMany: mocks.findContext },
  },
}));
vi.mock('@/lib/permissions.server', () => ({
  resolveUserPermissions: mocks.resolvePermissions,
}));
vi.mock('@ai-sdk/groq', () => ({ groq: () => 'mock-model' }));
vi.mock('ai', () => ({
  generateObject: mocks.generateObject,
  NoObjectGeneratedError: { isInstance: () => false },
}));

import { resolveBuiltInPermissions, type UserPermissions } from '@/lib/permissions';
import { generateAutomationSuggestions } from './generate-suggestions';

const organizationId = 'org_aaaaaaaaaaaaaaaaaaaaaaaa';
const allowedPermissions: UserPermissions = {
  task: ['read'],
  vendor: ['read'],
  evidence: ['read'],
};

function expectNoPrivateDataAccess() {
  expect(mocks.findVendors).not.toHaveBeenCalled();
  expect(mocks.findContext).not.toHaveBeenCalled();
  expect(mocks.generateObject).not.toHaveBeenCalled();
}

describe('automation suggestions authorization', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getSession.mockResolvedValue({
      session: { activeOrganizationId: organizationId },
      user: { id: 'user_authorized' },
    });
    mocks.findMember.mockResolvedValue({ role: 'admin' });
    mocks.resolvePermissions.mockResolvedValue(allowedPermissions);
    mocks.findVendors.mockResolvedValue([{ name: 'Private vendor', website: 'vendor.example' }]);
    mocks.findContext.mockResolvedValue([
      { question: 'Private question', answer: 'Private answer' },
    ]);
    mocks.generateObject.mockResolvedValue({
      object: {
        suggestions: [
          {
            title: 'Check vendor',
            prompt: 'Read vendor settings',
            vendorName: 'Private vendor',
            vendorWebsite: 'vendor.example',
          },
        ],
      },
    });
  });

  it('denies unauthenticated requests before membership or data access', async () => {
    mocks.getSession.mockResolvedValue(null);
    expect(await generateAutomationSuggestions('Task description', organizationId)).toEqual([]);
    expect(mocks.findMember).not.toHaveBeenCalled();
    expectNoPrivateDataAccess();
  });

  it('denies a different valid organization ID', async () => {
    expect(
      await generateAutomationSuggestions('Task description', 'org_bbbbbbbbbbbbbbbbbbbbbbbb'),
    ).toEqual([]);
    expect(mocks.findMember).not.toHaveBeenCalled();
    expectNoPrivateDataAccess();
  });

  it('denies revoked or inactive memberships even if the session still selects the org', async () => {
    mocks.findMember.mockResolvedValue(null);
    expect(await generateAutomationSuggestions('Task description', organizationId)).toEqual([]);
    expect(mocks.findMember).toHaveBeenCalledWith({
      where: { userId: 'user_authorized', organizationId, deactivated: false, isActive: true },
      select: { role: true },
    });
    expectNoPrivateDataAccess();
  });

  it.each(['employee', 'contractor'])('denies portal-only %s users', async (role) => {
    mocks.findMember.mockResolvedValue({ role });
    mocks.resolvePermissions.mockResolvedValue(resolveBuiltInPermissions(role).permissions);
    expect(await generateAutomationSuggestions('Task description', organizationId)).toEqual([]);
    expectNoPrivateDataAccess();
  });

  it.each(['task', 'vendor', 'evidence'])(
    'denies a custom role missing %s:read',
    async (resource) => {
      const permissions = { ...allowedPermissions, [resource]: [] };
      mocks.findMember.mockResolvedValue({ role: 'custom_role' });
      mocks.resolvePermissions.mockResolvedValue(permissions);
      expect(await generateAutomationSuggestions('Task description', organizationId)).toEqual([]);
      expectNoPrivateDataAccess();
    },
  );

  it.each(['owner', 'admin', 'auditor'])(
    'allows %s read access scoped to the authorized org',
    async (role) => {
      mocks.findMember.mockResolvedValue({ role });
      mocks.resolvePermissions.mockResolvedValue(resolveBuiltInPermissions(role).permissions);
      expect(await generateAutomationSuggestions('Task description', organizationId)).toHaveLength(
        1,
      );
      expect(mocks.resolvePermissions).toHaveBeenCalledWith(role, organizationId);
      expect(mocks.findVendors).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId } }),
      );
      expect(mocks.findContext).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId } }),
      );
      expect(mocks.generateObject).toHaveBeenCalledOnce();
    },
  );

  it('allows a custom role that explicitly grants all required reads', async () => {
    mocks.findMember.mockResolvedValue({ role: 'custom_role' });
    expect(await generateAutomationSuggestions('Task description', organizationId)).toHaveLength(1);
    expect(mocks.resolvePermissions).toHaveBeenCalledWith('custom_role', organizationId);
  });

  it('fails closed when permissions cannot be resolved', async () => {
    mocks.resolvePermissions.mockRejectedValue(new Error('Permission lookup failed'));
    expect(await generateAutomationSuggestions('Task description', organizationId)).toEqual([]);
    expectNoPrivateDataAccess();
  });
});

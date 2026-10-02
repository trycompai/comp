import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.fn();
const mockCreatePublicToken = vi.fn();
const mockOnboardingFindFirst = vi.fn();
const mockKnowledgeBaseDocumentFindFirst = vi.fn();
const mockRemediationBatchFindFirst = vi.fn();
const mockCookieSet = vi.fn();

vi.mock('@/utils/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock('@trigger.dev/sdk', () => ({
  auth: {
    createPublicToken: mockCreatePublicToken,
  },
}));

vi.mock('@db/server', () => ({
  db: {
    onboarding: { findFirst: mockOnboardingFindFirst },
    knowledgeBaseDocument: { findFirst: mockKnowledgeBaseDocumentFindFirst },
    remediationBatch: { findFirst: mockRemediationBatchFindFirst },
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn(async () => ({ set: mockCookieSet })),
}));

const { createAccessToken, healAndSetAccessToken } = await import('./heal-access-token');

const RUN_ID = 'run_123';
const ORG_ID = 'org_abc';

function mockSession(activeOrganizationId: string | null | undefined) {
  mockGetSession.mockResolvedValue({
    session: { activeOrganizationId },
    user: { id: 'user_1' },
  });
}

function mockOwnership(owner: 'onboarding' | 'knowledgeBaseDocument' | 'remediationBatch' | null) {
  mockOnboardingFindFirst.mockResolvedValue(
    owner === 'onboarding' ? { organizationId: ORG_ID } : null,
  );
  mockKnowledgeBaseDocumentFindFirst.mockResolvedValue(
    owner === 'knowledgeBaseDocument' ? { id: 'kbd_1' } : null,
  );
  mockRemediationBatchFindFirst.mockResolvedValue(
    owner === 'remediationBatch' ? { id: 'rmb_1' } : null,
  );
}

describe('healAndSetAccessToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null without minting a token when there is no session', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await healAndSetAccessToken(RUN_ID);

    expect(result).toBeNull();
    expect(mockCreatePublicToken).not.toHaveBeenCalled();
  });

  it('returns null without minting a token when the session has no active organization', async () => {
    mockSession(null);

    const result = await healAndSetAccessToken(RUN_ID);

    expect(result).toBeNull();
    expect(mockCreatePublicToken).not.toHaveBeenCalled();
  });

  it('returns null without minting a token when the run id is not owned by the active organization', async () => {
    mockSession(ORG_ID);
    mockOwnership(null);

    const result = await healAndSetAccessToken(RUN_ID);

    expect(result).toBeNull();
    expect(mockCreatePublicToken).not.toHaveBeenCalled();
    expect(mockOnboardingFindFirst).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, triggerJobId: RUN_ID },
      select: { organizationId: true },
    });
  });

  it('mints and cookies a token when the run id belongs to an onboarding job for the active organization', async () => {
    mockSession(ORG_ID);
    mockOwnership('onboarding');
    mockCreatePublicToken.mockResolvedValue('public-token');

    const result = await healAndSetAccessToken(RUN_ID);

    expect(result).toBe('public-token');
    expect(mockCreatePublicToken).toHaveBeenCalledWith({
      scopes: { read: { runs: [RUN_ID] } },
    });
    expect(mockCookieSet).toHaveBeenCalledWith('publicAccessToken', 'public-token');
  });

  it('mints a token when the run id belongs to a knowledge base document for the active organization', async () => {
    mockSession(ORG_ID);
    mockOwnership('knowledgeBaseDocument');
    mockCreatePublicToken.mockResolvedValue('public-token');

    const result = await healAndSetAccessToken(RUN_ID);

    expect(result).toBe('public-token');
  });

  it('mints a token when the run id belongs to a remediation batch for the active organization', async () => {
    mockSession(ORG_ID);
    mockOwnership('remediationBatch');
    mockCreatePublicToken.mockResolvedValue('public-token');

    const result = await healAndSetAccessToken(RUN_ID);

    expect(result).toBe('public-token');
  });

  it('returns null when the run id is owned by a different organization than the caller is active in', async () => {
    mockSession('some-other-org');
    mockOwnership(null);

    const result = await healAndSetAccessToken(RUN_ID);

    expect(result).toBeNull();
    expect(mockCreatePublicToken).not.toHaveBeenCalled();
  });
});

describe('createAccessToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null without minting a token when there is no session', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await createAccessToken(RUN_ID);

    expect(result).toBeNull();
    expect(mockCreatePublicToken).not.toHaveBeenCalled();
  });

  it('returns null without minting a token when the run id is not owned by the active organization', async () => {
    mockSession(ORG_ID);
    mockOwnership(null);

    const result = await createAccessToken(RUN_ID);

    expect(result).toBeNull();
    expect(mockCreatePublicToken).not.toHaveBeenCalled();
  });

  it('mints a token without setting a cookie when the run id is owned by the active organization', async () => {
    mockSession(ORG_ID);
    mockOwnership('onboarding');
    mockCreatePublicToken.mockResolvedValue('public-token');

    const result = await createAccessToken(RUN_ID);

    expect(result).toBe('public-token');
    expect(mockCookieSet).not.toHaveBeenCalled();
  });
});

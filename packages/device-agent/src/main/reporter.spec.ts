import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

const getAuthMock = vi.fn();
const setAuthMock = vi.fn();
const getApiUrlMock = vi.fn().mockReturnValue('https://api.example.test');

vi.mock('./store', () => ({
  getAuth: () => getAuthMock(),
  setAuth: (a: unknown) => setAuthMock(a),
  getApiUrl: () => getApiUrlMock(),
}));
vi.mock('./logger', () => ({ log: vi.fn() }));

const getCurrentOSVersionMock = vi.fn();
vi.mock('./device-info', () => ({
  getCurrentOSVersion: () => getCurrentOSVersionMock(),
}));

const SINGLE_ORG_AUTH = {
  sessionToken: 'tok',
  cookieName: 'better-auth.session_token',
  userId: 'usr_1',
  organizations: [{ organizationId: 'org_1', organizationName: 'A', deviceId: 'dev_1' }],
};

function sentBody(): Record<string, unknown> {
  const [, init] = (globalThis.fetch as unknown as Mock).mock.calls[0];
  return JSON.parse((init as RequestInit).body as string);
}

describe('reportCheckResults OS version', () => {
  beforeEach(() => {
    getAuthMock.mockReset().mockReturnValue(SINGLE_ORG_AUTH);
    getCurrentOSVersionMock.mockReset();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ isCompliant: true, nextCheckIn: '' }),
    }) as unknown as typeof fetch;
  });

  it('sends the current OS version so the server can refresh it after an OS update', async () => {
    getCurrentOSVersionMock.mockReturnValue('15.8.1');

    const { reportCheckResults } = await import('./reporter');
    await reportCheckResults([]);

    expect(sentBody()).toMatchObject({ deviceId: 'dev_1', osVersion: '15.8.1' });
  });

  it('omits osVersion when it cannot be read, so a failed read never overwrites a good value', async () => {
    getCurrentOSVersionMock.mockReturnValue(undefined);

    const { reportCheckResults } = await import('./reporter');
    await reportCheckResults([]);

    expect(sentBody()).not.toHaveProperty('osVersion');
  });
});

describe('reportCheckResults silent upgrade', () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    setAuthMock.mockReset();
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
  });

  it('swaps the token when the first response returns upgradedSessionToken', async () => {
    getAuthMock.mockReturnValue({
      sessionToken: 'old_tok',
      cookieName: 'better-auth.session_token',
      userId: 'usr_1',
      organizations: [
        { organizationId: 'org_1', organizationName: 'A', deviceId: 'dev_1' },
        { organizationId: 'org_2', organizationName: 'B', deviceId: 'dev_2' },
      ],
    });
    ((globalThis.fetch as unknown) as Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isCompliant: true, nextCheckIn: '', upgradedSessionToken: 'new_tok' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isCompliant: true, nextCheckIn: '' }),
      });

    const { reportCheckResults } = await import('./reporter');
    await reportCheckResults([]);

    const calls = ((globalThis.fetch as unknown) as Mock).mock.calls;
    // First call uses old token
    expect((calls[0][1] as RequestInit).headers).toMatchObject({ Authorization: 'Bearer old_tok' });
    // Second call uses new token (proves we swapped mid-loop)
    expect((calls[1][1] as RequestInit).headers).toMatchObject({ Authorization: 'Bearer new_tok' });
    // Auth was persisted
    expect(setAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({ sessionToken: 'new_tok' }),
    );
  });

  it('aborts further check-ins if persisting the upgraded token fails', async () => {
    getAuthMock.mockReturnValue({
      sessionToken: 'old_tok',
      cookieName: 'better-auth.session_token',
      userId: 'usr_1',
      organizations: [
        { organizationId: 'org_1', organizationName: 'A', deviceId: 'dev_1' },
        { organizationId: 'org_2', organizationName: 'B', deviceId: 'dev_2' },
      ],
    });
    setAuthMock.mockImplementation(() => { throw new Error('disk full'); });
    ((globalThis.fetch as unknown) as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ isCompliant: true, nextCheckIn: '', upgradedSessionToken: 'new_tok' }),
    });

    const { reportCheckResults } = await import('./reporter');
    const result = await reportCheckResults([]);

    expect(result.allSucceeded).toBe(false);
    expect(((globalThis.fetch as unknown) as Mock).mock.calls).toHaveLength(1);
  });
});

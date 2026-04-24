import { createDeviceAgentSession, DEVICE_AGENT_SESSION_TTL_MS } from './device-agent-session.helper';

const createSessionMock = jest.fn();

jest.mock('../auth/auth.server', () => ({
  auth: {
    $context: Promise.resolve({
      internalAdapter: {
        createSession: (...args: unknown[]) => createSessionMock(...args),
      },
    }),
  },
}));

const FIXED_NOW = new Date('2026-04-22T00:00:00.000Z');

describe('createDeviceAgentSession', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(FIXED_NOW);
    createSessionMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls better-auth internalAdapter.createSession with deviceAgent=true and 1-year expiry', async () => {
    createSessionMock.mockResolvedValue({
      id: 'ses_123',
      token: 'tok_abc',
      userId: 'usr_1',
      expiresAt: new Date(FIXED_NOW.getTime() + DEVICE_AGENT_SESSION_TTL_MS),
    });

    const result = await createDeviceAgentSession({ userId: 'usr_1' });

    expect(createSessionMock).toHaveBeenCalledTimes(1);
    const [userId, dontRememberMe, override, overrideAll] = createSessionMock.mock.calls[0];
    expect(userId).toBe('usr_1');
    expect(dontRememberMe).toBe(false);
    expect(override).toMatchObject({ deviceAgent: true });
    expect(override.expiresAt).toEqual(new Date(FIXED_NOW.getTime() + DEVICE_AGENT_SESSION_TTL_MS));
    expect(overrideAll).toBe(true);
    expect(result).toEqual({
      sessionId: 'ses_123',
      token: 'tok_abc',
      expiresAt: new Date(FIXED_NOW.getTime() + DEVICE_AGENT_SESSION_TTL_MS),
    });
  });
});

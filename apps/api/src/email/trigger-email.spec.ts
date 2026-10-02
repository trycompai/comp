import { createElement } from 'react';
import { triggerEmail } from './trigger-email';

const mockRender = jest.fn().mockResolvedValue('<p>Test</p>');
const mockTrigger = jest.fn().mockResolvedValue({ id: 'run_email' });
const mockCreateKey = jest.fn((key: string, options: { scope: 'global' }) =>
  Promise.resolve(`${options.scope}:${key}`),
);

jest.mock('@react-email/render', () => ({
  render: (...args: unknown[]) => mockRender(...args),
}));
jest.mock('@trigger.dev/sdk', () => ({
  tasks: { trigger: (...args: unknown[]) => mockTrigger(...args) },
  idempotencyKeys: {
    create: (key: string, options: { scope: 'global' }) =>
      mockCreateKey(key, options),
  },
}));

const email = {
  to: 'review@example.invalid',
  subject: 'Local test',
  react: createElement('p', null, 'Test'),
  trustPortal: true,
};

describe('email task idempotency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrigger.mockResolvedValue({ id: 'run_email' });
  });

  it('uses a global key so different submission runs deduplicate the same notice', async () => {
    const params = { ...email, idempotencyKey: 'pending-request-notice' };
    await triggerEmail(params);
    await triggerEmail(params);

    expect(mockCreateKey.mock.calls).toEqual([
      ['pending-request-notice', { scope: 'global' }],
      ['pending-request-notice', { scope: 'global' }],
    ]);
    expect(mockTrigger.mock.calls.map((call) => call[2])).toEqual([
      {
        idempotencyKey: 'global:pending-request-notice',
        idempotencyKeyTTL: '7d',
      },
      {
        idempotencyKey: 'global:pending-request-notice',
        idempotencyKeyTTL: '7d',
      },
    ]);
  });

  it('preserves ordinary email behavior without an idempotency key', async () => {
    expect(await triggerEmail(email)).toEqual({ id: 'run_email' });
    expect(mockCreateKey).not.toHaveBeenCalled();
    expect(mockTrigger.mock.calls[0][2]).toBeUndefined();
  });

  it('propagates enqueue failure so the submission worker can retry', async () => {
    mockTrigger.mockRejectedValueOnce(new Error('Queue unavailable'));
    const log = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    await expect(triggerEmail(email)).rejects.toThrow('Queue unavailable');
    log.mockRestore();
  });
});

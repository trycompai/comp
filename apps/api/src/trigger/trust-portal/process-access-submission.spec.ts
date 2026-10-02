import './process-access-submission';

jest.mock('@trigger.dev/sdk', () => ({
  tasks: { trigger: jest.fn() },
  queue: jest.fn((options: unknown) => options),
  schemaTask: jest.fn((options: unknown) => options),
}));
jest.mock('../../trust-portal/email.service', () => ({
  TrustEmailService: class {},
}));
jest.mock('../../trust-portal/trust-access-submission.processor', () => ({
  processTrustAccessSubmissionPayload: jest.fn(),
}));

const mockSdk = jest.requireMock<{ schemaTask: jest.Mock; queue: jest.Mock }>(
  '@trigger.dev/sdk',
);
const mockProcessor = jest.requireMock<{
  processTrustAccessSubmissionPayload: jest.Mock;
}>(
  '../../trust-portal/trust-access-submission.processor',
).processTrustAccessSubmissionPayload;

describe('Trust access task durable processing', () => {
  it('serializes jobs in each recipient queue and retries failures', () => {
    expect(mockSdk.queue).toHaveBeenCalledWith({
      name: 'trust-portal-access-submissions',
      concurrencyLimit: 1,
    });
    expect(mockSdk.schemaTask).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'trust-portal-process-access-submission',
        queue: { name: 'trust-portal-access-submissions', concurrencyLimit: 1 },
        retry: expect.objectContaining({ maxAttempts: 5 }),
      }),
    );
  });

  it('awaits processor completion and propagates failure for durable retry', async () => {
    const config: unknown = mockSdk.schemaTask.mock.calls[0][0];
    if (
      typeof config !== 'object' ||
      !config ||
      !('run' in config) ||
      typeof config.run !== 'function'
    ) {
      throw new Error('Missing task callback');
    }
    const payload = {
      kind: 'reclaim',
      organizationId: 'org_local',
      email: 'jane@example.com',
    };
    mockProcessor.mockRejectedValueOnce(new Error('email enqueue failed'));
    await expect(
      config.run(payload, { ctx: { run: { id: 'run_local' } } }),
    ).rejects.toThrow('email enqueue failed');
    expect(mockProcessor).toHaveBeenCalledWith(
      expect.objectContaining({ payload, runId: 'run_local' }),
    );
  });
});

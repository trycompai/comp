import { BillingWebhookService } from './billing-webhook.service';
import {
  claimStripeWebhookEvent,
  markStripeWebhookFailed,
} from './stripe-webhook-records';

jest.mock('@db', () => ({
  Prisma: {},
  db: {},
}));

jest.mock('./stripe-webhook-records', () => ({
  claimStripeWebhookEvent: jest.fn(),
  markStripeWebhookFailed: jest.fn(),
  markStripeWebhookProcessed: jest.fn(),
}));

const mockClaimStripeWebhookEvent = claimStripeWebhookEvent as jest.Mock;
const mockMarkStripeWebhookFailed = markStripeWebhookFailed as jest.Mock;

describe('BillingWebhookService', () => {
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    mockClaimStripeWebhookEvent.mockResolvedValue({ status: 'claimed' });
  });

  afterAll(() => {
    if (typeof originalSecret === 'string') {
      process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
      return;
    }
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it('rethrows the processing error when marking the webhook failed also fails', async () => {
    const processingError = new Error('processing failed');
    mockMarkStripeWebhookFailed.mockRejectedValue(new Error('db failed'));
    const service = new BillingWebhookService(
      {
        getClient: () => ({
          webhooks: {
            constructEvent: () => ({
              id: 'evt_1',
              type: 'invoice.payment_failed',
              data: { object: { customer: 'cus_missing' } },
            }),
          },
        }),
      } as never,
      {} as never,
    );
    jest
      .spyOn(
        service as unknown as { processEvent: () => Promise<void> },
        'processEvent',
      )
      .mockRejectedValue(processingError);

    await expect(
      service.handleWebhook({
        rawBody: Buffer.from('{}'),
        signature: 'sig',
      }),
    ).rejects.toBe(processingError);
  });
});

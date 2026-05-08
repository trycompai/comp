import { Prisma, db } from '@db';
import { claimStripeWebhookEvent } from './stripe-webhook-records';

jest.mock('@db', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;

    constructor(message: string, params: { code: string }) {
      super(message);
      this.code = params.code;
    }
  }

  return {
    Prisma: {
      PrismaClientKnownRequestError,
    },
    db: {
      stripeWebhookEvent: {
        create: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
    },
  };
});

const stripeWebhookEventCreate = db.stripeWebhookEvent
  .create as unknown as jest.Mock;
const stripeWebhookEventUpdateMany = db.stripeWebhookEvent
  .updateMany as unknown as jest.Mock;

describe('stripe webhook records', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2026-04-30T12:00:00.000Z').getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('claims a new Stripe webhook event', async () => {
    stripeWebhookEventCreate.mockResolvedValue({});

    await expect(
      claimStripeWebhookEvent({
        stripeEventId: 'evt_1',
        eventType: 'invoice.paid',
        payload: { id: 'in_1' },
      }),
    ).resolves.toEqual({ status: 'claimed' });

    expect(stripeWebhookEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        stripeEventId: 'evt_1',
        status: 'processing',
      }),
    });
  });

  it('atomically reclaims failed webhook events', async () => {
    stripeWebhookEventCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    stripeWebhookEventUpdateMany.mockResolvedValue({ count: 1 });

    await expect(
      claimStripeWebhookEvent({
        stripeEventId: 'evt_1',
        eventType: 'invoice.paid',
        payload: { id: 'in_1' },
      }),
    ).resolves.toEqual({ status: 'claimed' });

    expect(stripeWebhookEventUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          stripeEventId: 'evt_1',
          OR: expect.arrayContaining([
            expect.objectContaining({ status: 'failed' }),
          ]),
        }),
        data: expect.objectContaining({ status: 'processing', error: null }),
      }),
    );
  });

  it('reclaims only one stale processing webhook retry', async () => {
    stripeWebhookEventCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    stripeWebhookEventUpdateMany.mockResolvedValue({ count: 0 });

    await expect(
      claimStripeWebhookEvent({
        stripeEventId: 'evt_1',
        eventType: 'invoice.paid',
        payload: { id: 'in_1' },
      }),
    ).resolves.toEqual({ status: 'duplicate' });

    expect(stripeWebhookEventUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              status: 'processing',
              processedAt: { lt: new Date('2026-04-30T11:45:00.000Z') },
            }),
          ]),
        }),
      }),
    );
  });
});

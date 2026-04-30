import { Prisma, db } from '@db';

const processingReclaimAfterMs = 15 * 60 * 1000;

export type StripeWebhookClaim =
  | { status: 'claimed' }
  | { status: 'duplicate' };

export async function claimStripeWebhookEvent(params: {
  stripeEventId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
}): Promise<StripeWebhookClaim> {
  try {
    await db.stripeWebhookEvent.create({
      data: {
        stripeEventId: params.stripeEventId,
        eventType: params.eventType,
        payload: params.payload,
        status: 'processing',
      },
    });
    return { status: 'claimed' };
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const reclaimBefore = new Date(Date.now() - processingReclaimAfterMs);
    const reclaimed = await db.stripeWebhookEvent.updateMany({
      where: {
        stripeEventId: params.stripeEventId,
        OR: [
          { status: 'failed' },
          { status: 'processing', processedAt: { lt: reclaimBefore } },
        ],
      },
      data: {
        eventType: params.eventType,
        payload: params.payload,
        status: 'processing',
        error: null,
        processedAt: new Date(),
      },
    });

    if (reclaimed.count === 1) {
      return { status: 'claimed' };
    }

    return { status: 'duplicate' };
  }
}

export async function markStripeWebhookProcessed(
  stripeEventId: string,
): Promise<void> {
  await db.stripeWebhookEvent.update({
    where: { stripeEventId },
    data: { status: 'processed', error: null, processedAt: new Date() },
  });
}

export async function markStripeWebhookFailed(params: {
  stripeEventId: string;
  error: unknown;
}): Promise<void> {
  await db.stripeWebhookEvent.update({
    where: { stripeEventId: params.stripeEventId },
    data: {
      status: 'failed',
      error:
        params.error instanceof Error ? params.error.message : 'Unknown error',
    },
  });
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

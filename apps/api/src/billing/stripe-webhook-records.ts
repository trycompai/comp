import { Prisma, db } from '@db';

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
    const existing = await db.stripeWebhookEvent.findUnique({
      where: { stripeEventId: params.stripeEventId },
      select: { status: true },
    });
    if (existing?.status === 'failed') {
      await db.stripeWebhookEvent.update({
        where: { stripeEventId: params.stripeEventId },
        data: { status: 'processing', error: null },
      });
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

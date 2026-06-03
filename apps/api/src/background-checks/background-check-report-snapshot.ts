import { Prisma } from '@db';
import type { BackgroundCheckStatus } from '@db';
import type { BackgroundCheckIdentityClient } from './background-check-identity.client';

export function shouldSyncReportSnapshot({
  status,
  eventType,
}: {
  status: BackgroundCheckStatus;
  eventType: string;
}): boolean {
  return (
    eventType === 'background_check.completed' ||
    status === 'completed' ||
    status === 'completed_with_flags'
  );
}

export function toInputJsonValue(value: unknown): Prisma.InputJsonValue | null {
  if (value === null || value === undefined) {
    return null;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function fetchCompletedReportSnapshot({
  identityClient,
  identityBackgroundCheckId,
  eventType,
  status,
}: {
  identityClient: BackgroundCheckIdentityClient;
  identityBackgroundCheckId: string;
  eventType: string;
  status: BackgroundCheckStatus;
}): Promise<Prisma.InputJsonValue | null> {
  if (!shouldSyncReportSnapshot({ status, eventType })) {
    return null;
  }

  try {
    const snapshot = await identityClient.getBackgroundCheck(
      identityBackgroundCheckId,
    );
    return toInputJsonValue(snapshot);
  } catch {
    return null;
  }
}

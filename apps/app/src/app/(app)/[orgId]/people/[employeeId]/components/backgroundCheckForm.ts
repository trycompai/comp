import { z } from 'zod';

export const backgroundCheckSchema = z.object({
  employeeName: z.string().trim().min(1, 'Employee name is required'),
  employeeEmail: z.string().trim().email('Enter a valid personal email'),
  requesterNotes: z.string().trim().max(2000, 'Notes must be under 2,000 characters').optional(),
});

export type BackgroundCheckFormValues = z.infer<typeof backgroundCheckSchema>;

const pendingBackgroundCheckSchema = backgroundCheckSchema.extend({
  memberId: z.string(),
  organizationId: z.string(),
});

export type PendingBackgroundCheckRequest = z.infer<typeof pendingBackgroundCheckSchema>;

function pendingRequestKey({
  memberId,
  organizationId,
}: {
  memberId: string;
  organizationId: string;
}): string {
  return `background-check:${organizationId}:${memberId}:pending-request`;
}

export function readPendingBackgroundCheckRequest({
  memberId,
  organizationId,
}: {
  memberId: string;
  organizationId: string;
}): PendingBackgroundCheckRequest | null {
  if (typeof window === 'undefined') return null;

  const key = pendingRequestKey({ memberId, organizationId });
  const stored = window.sessionStorage.getItem(key);
  if (!stored) return null;

  try {
    const parsed: unknown = JSON.parse(stored);
    const result = pendingBackgroundCheckSchema.safeParse(parsed);
    if (result.success) return result.data;
  } catch {
    window.sessionStorage.removeItem(key);
    return null;
  }

  window.sessionStorage.removeItem(key);
  return null;
}

export function writePendingBackgroundCheckRequest({
  memberId,
  organizationId,
  values,
}: {
  memberId: string;
  organizationId: string;
  values: BackgroundCheckFormValues;
}) {
  if (typeof window === 'undefined') return;

  const pendingRequest: PendingBackgroundCheckRequest = {
    organizationId,
    memberId,
    employeeName: values.employeeName,
    employeeEmail: values.employeeEmail,
    requesterNotes: values.requesterNotes,
  };
  window.sessionStorage.setItem(
    pendingRequestKey({ memberId, organizationId }),
    JSON.stringify(pendingRequest),
  );
}

export function clearPendingBackgroundCheckRequest({
  memberId,
  organizationId,
}: {
  memberId: string;
  organizationId: string;
}) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(pendingRequestKey({ memberId, organizationId }));
}

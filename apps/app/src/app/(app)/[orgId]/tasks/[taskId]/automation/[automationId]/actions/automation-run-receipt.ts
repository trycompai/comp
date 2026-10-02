import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { AutomationAccessError, identifierSchema } from './automation-security';
import { getEnterpriseConfig } from './enterprise-api';

const PURPOSE = 'comp-task-automation-run:v1:';
const RECEIPT_LIFETIME_MS = 24 * 60 * 60 * 1000;
const receiptSchema = z
  .object({
    organizationId: identifierSchema,
    taskId: identifierSchema,
    automationId: identifierSchema,
    runId: identifierSchema,
    expiresAt: z.number().int().positive(),
  })
  .strict();
type RunReceipt = z.infer<typeof receiptSchema>;

function sign(payload: string) {
  const { enterpriseApiKey } = getEnterpriseConfig();
  return createHmac('sha256', enterpriseApiKey).update(PURPOSE).update(payload).digest();
}

export function issueRunReceipt(scope: Omit<RunReceipt, 'expiresAt'>) {
  const receipt = receiptSchema.parse({ ...scope, expiresAt: Date.now() + RECEIPT_LIFETIME_MS });
  const payload = Buffer.from(JSON.stringify(receipt)).toString('base64url');
  return `v1.${payload}.${sign(payload).toString('base64url')}`;
}

export function verifyRunReceipt({
  token,
  organizationId,
}: {
  token: string;
  organizationId: string;
}): RunReceipt {
  // Legacy raw run IDs have no trustworthy tenant mapping and fail closed.
  if (typeof token !== 'string' || token.length > 2048) throw new AutomationAccessError();
  const parts = token.split('.');
  const [version, payload, signature] = parts;
  if (
    parts.length !== 3 ||
    version !== 'v1' ||
    !payload ||
    !signature ||
    !/^[A-Za-z0-9_-]+$/.test(payload) ||
    !/^[A-Za-z0-9_-]+$/.test(signature)
  )
    throw new AutomationAccessError();
  const expected = sign(payload);
  const supplied = Buffer.from(signature, 'base64url');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new AutomationAccessError();
  }
  try {
    const receipt = receiptSchema.parse(
      JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')),
    );
    if (receipt.organizationId !== organizationId || receipt.expiresAt <= Date.now()) {
      throw new AutomationAccessError();
    }
    return receipt;
  } catch {
    throw new AutomationAccessError();
  }
}

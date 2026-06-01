import {
  DescribeKeyCommand,
  GetKeyRotationStatusCommand,
  KMSClient,
  ListKeysCommand,
} from '@aws-sdk/client-kms';
import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  assumeAwsSession,
  type AwsSession,
  type CheckOutcome,
  emitOutcomes,
} from './shared';

export interface KmsKeyInfo {
  keyId: string;
  region: string;
  customerManaged: boolean;
  rotationEnabled: boolean;
}

/** Only customer-managed keys are evaluated — AWS-managed keys rotate automatically. */
export function evaluateKmsRotation(keys: KmsKeyInfo[]): CheckOutcome[] {
  return keys
    .filter((k) => k.customerManaged)
    .map((k) =>
      k.rotationEnabled
        ? {
            kind: 'pass',
            title: `KMS key rotation enabled: ${k.keyId}`,
            description: `Customer-managed KMS key "${k.keyId}" (${k.region}) has automatic rotation enabled.`,
            resourceType: 'aws-kms-key',
            resourceId: k.keyId,
            evidence: { keyId: k.keyId, region: k.region },
          }
        : {
            kind: 'fail',
            title: `KMS key rotation disabled: ${k.keyId}`,
            description: `Customer-managed KMS key "${k.keyId}" (${k.region}) does not have automatic rotation enabled.`,
            resourceType: 'aws-kms-key',
            resourceId: k.keyId,
            severity: 'medium',
            remediation: 'Enable automatic annual key rotation on the customer-managed KMS key.',
            evidence: { keyId: k.keyId, region: k.region },
          },
    );
}

async function listKmsKeys(session: AwsSession): Promise<KmsKeyInfo[]> {
  const out: KmsKeyInfo[] = [];
  for (const region of session.regions) {
    const kms = new KMSClient({ region, credentials: session.credentials });
    let marker: string | undefined;
    do {
      const resp = await kms.send(new ListKeysCommand({ Marker: marker }));
      for (const k of resp.Keys ?? []) {
        const keyId = k.KeyId;
        if (!keyId) continue;
        const desc = await kms.send(new DescribeKeyCommand({ KeyId: keyId }));
        const meta = desc.KeyMetadata;
        const customerManaged =
          meta?.KeyManager === 'CUSTOMER' && meta?.KeyState === 'Enabled';
        let rotationEnabled = false;
        if (customerManaged) {
          try {
            const rot = await kms.send(new GetKeyRotationStatusCommand({ KeyId: keyId }));
            rotationEnabled = rot.KeyRotationEnabled === true;
          } catch {
            rotationEnabled = false;
          }
        }
        out.push({ keyId, region, customerManaged, rotationEnabled });
      }
      marker = resp.NextMarker;
    } while (marker);
  }
  return out;
}

export const kmsKeyRotationCheck: IntegrationCheck = {
  id: 'aws-kms-key-rotation',
  name: 'KMS — customer key rotation enabled',
  description: 'Verify customer-managed KMS keys have automatic rotation enabled.',
  service: 'kms',
  taskMapping: TASK_TEMPLATES.encryptionAtRest,
  run: async (ctx: CheckContext) => {
    const session = await assumeAwsSession(ctx);
    if (!session) {
      ctx.log('AWS KMS check: connection not configured — skipping');
      return;
    }
    const keys = await listKmsKeys(session);
    const customerKeys = keys.filter((k) => k.customerManaged);
    if (customerKeys.length === 0) return; // nothing to evidence
    emitOutcomes(ctx, evaluateKmsRotation(keys));
  },
};

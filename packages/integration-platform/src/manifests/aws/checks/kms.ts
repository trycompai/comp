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
  /**
   * Customer-managed, enabled, symmetric ENCRYPT_DECRYPT key with AWS_KMS
   * origin — the only key kind that supports automatic rotation. Asymmetric,
   * HMAC, external, and CloudHSM keys cannot rotate and must not be failed.
   */
  rotationEligible: boolean;
  /** false when GetKeyRotationStatus couldn't be read → emit no finding. */
  rotationStatusKnown: boolean;
  rotationEnabled: boolean;
}

/**
 * Every rotation-eligible key produces an outcome. A key whose rotation status
 * couldn't be read is surfaced as "could not verify" (medium) rather than
 * dropped — silently excluding it would let a permission gap pass as clean.
 */
export function evaluateKmsRotation(keys: KmsKeyInfo[]): CheckOutcome[] {
  return keys
    .filter((k) => k.rotationEligible)
    .map((k): CheckOutcome => {
      if (!k.rotationStatusKnown) {
        return {
          kind: 'fail',
          title: `Could not verify KMS key rotation: ${k.keyId}`,
          description: `Rotation status for customer-managed KMS key "${k.keyId}" (${k.region}) could not be read, so rotation is unverified.`,
          resourceType: 'aws-kms-key',
          resourceId: k.keyId,
          severity: 'medium',
          remediation:
            'Grant kms:GetKeyRotationStatus to the integration role so rotation can be verified, then re-run.',
          evidence: { keyId: k.keyId, region: k.region },
        };
      }
      return k.rotationEnabled
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
          };
    });
}

async function listKmsKeys(
  ctx: CheckContext,
  session: AwsSession,
): Promise<KmsKeyInfo[]> {
  const out: KmsKeyInfo[] = [];
  for (const region of session.regions) {
    const kms = new KMSClient({ region, credentials: session.credentials });
    let marker: string | undefined;
    do {
      const resp = await kms.send(new ListKeysCommand({ Marker: marker }));
      for (const k of resp.Keys ?? []) {
        const keyId = k.KeyId;
        if (!keyId) continue;
        let meta;
        try {
          meta = (await kms.send(new DescribeKeyCommand({ KeyId: keyId }))).KeyMetadata;
        } catch (err) {
          // Skip this key rather than aborting the whole scan.
          ctx.log(
            `KMS: could not describe key ${keyId} in ${region}: ${err instanceof Error ? err.message : String(err)}`,
          );
          continue;
        }
        // Only symmetric, enabled, AWS-managed-material, encrypt/decrypt
        // customer keys can have automatic rotation.
        const rotationEligible =
          meta?.KeyManager === 'CUSTOMER' &&
          meta?.KeyState === 'Enabled' &&
          meta?.KeySpec === 'SYMMETRIC_DEFAULT' &&
          meta?.KeyUsage === 'ENCRYPT_DECRYPT' &&
          meta?.Origin === 'AWS_KMS';

        let rotationEnabled = false;
        let rotationStatusKnown = false;
        if (rotationEligible) {
          try {
            const rot = await kms.send(new GetKeyRotationStatusCommand({ KeyId: keyId }));
            rotationEnabled = rot.KeyRotationEnabled === true;
            rotationStatusKnown = true;
          } catch (err) {
            ctx.log(
              `KMS: could not read rotation status for ${keyId} in ${region}: ${err instanceof Error ? err.message : String(err)}`,
            );
            rotationStatusKnown = false;
          }
        }
        out.push({ keyId, region, rotationEligible, rotationStatusKnown, rotationEnabled });
      }
      marker = resp.NextMarker;
    } while (marker);
  }
  return out;
}

export const kmsKeyRotationCheck: IntegrationCheck = {
  id: 'aws-kms-key-rotation',
  name: 'KMS — customer key rotation enabled',
  description: 'Verify rotation-eligible customer-managed KMS keys have automatic rotation enabled.',
  service: 'kms',
  taskMapping: TASK_TEMPLATES.encryptionAtRest,
  run: async (ctx: CheckContext) => {
    const session = await assumeAwsSession(ctx);
    if (!session) {
      ctx.log('AWS KMS check: connection not configured — skipping');
      return;
    }
    const keys = await listKmsKeys(ctx, session);
    // Genuine no-op only when there are NO rotation-eligible keys at all. If
    // eligible keys exist but their status is unreadable, evaluateKmsRotation
    // emits "could not verify" rather than passing silently.
    if (!keys.some((k) => k.rotationEligible)) return;
    emitOutcomes(ctx, evaluateKmsRotation(keys));
  },
};

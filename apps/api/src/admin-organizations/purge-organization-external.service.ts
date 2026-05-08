import { Injectable, Logger } from '@nestjs/common';
import {
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  type ObjectIdentifier,
} from '@aws-sdk/client-s3';
import { tasks } from '@trigger.dev/sdk';
import type Stripe from 'stripe';
import { StripeService } from '../stripe/stripe.service';
import {
  APP_AWS_KNOWLEDGE_BASE_BUCKET,
  APP_AWS_ORG_ASSETS_BUCKET,
  APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET,
  BUCKET_NAME,
  s3Client,
} from '../app/s3';
import type { deleteKnowledgeBaseDocumentTask } from '../trigger/vector-store/delete-knowledge-base-document';
import type { deleteAllManualAnswersOrchestratorTask } from '../trigger/vector-store/delete-all-manual-answers-orchestrator';
import type {
  PurgeExternalCleanupResult,
  PurgeS3BucketRef,
  PurgeSnapshot,
} from './purge-organization.types';

const BUCKET_ENV: Record<PurgeS3BucketRef, string | undefined> = {
  orgAssets: APP_AWS_ORG_ASSETS_BUCKET,
  default: BUCKET_NAME,
  knowledgeBase: APP_AWS_KNOWLEDGE_BASE_BUCKET,
  questionnaire: APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET,
};

const BUCKET_REFS: PurgeS3BucketRef[] = [
  'orgAssets',
  'default',
  'knowledgeBase',
  'questionnaire',
];

@Injectable()
export class PurgeOrganizationExternalService {
  private readonly logger = new Logger(PurgeOrganizationExternalService.name);

  constructor(private readonly stripeService: StripeService) {}

  async cleanupStripe(
    stripe: PurgeSnapshot['stripe'],
  ): Promise<PurgeExternalCleanupResult['stripe']> {
    const result = { customerDeleted: false, subscriptionCanceled: false };

    if (!this.stripeService.isConfigured()) {
      this.logger.warn('Stripe not configured — skipping Stripe cleanup');
      return result;
    }

    const client = this.stripeService.getClient();

    if (stripe.subscriptionId) {
      try {
        await client.subscriptions.cancel(stripe.subscriptionId);
        result.subscriptionCanceled = true;
      } catch (err) {
        if (this.isStripeMissingResource(err)) {
          this.logger.log(
            `Stripe subscription ${stripe.subscriptionId} already gone`,
          );
        } else {
          throw err;
        }
      }
    }

    if (stripe.customerId) {
      try {
        await client.customers.del(stripe.customerId);
        result.customerDeleted = true;
      } catch (err) {
        if (this.isStripeMissingResource(err)) {
          this.logger.log(
            `Stripe customer ${stripe.customerId} already gone`,
          );
        } else {
          throw err;
        }
      }
    }

    return result;
  }

  private isStripeMissingResource(err: unknown): boolean {
    const e = err as Partial<Stripe.StripeRawError> | undefined;
    return !!e && e.code === 'resource_missing';
  }

  async cleanupVectorStore(
    snapshot: PurgeSnapshot,
  ): Promise<PurgeExternalCleanupResult['vectorStore']> {
    const result = {
      knowledgeBaseTasksTriggered: 0,
      manualAnswerOrchestratorTriggered: false,
    };

    for (const documentId of snapshot.knowledgeBaseDocumentIds) {
      await tasks.trigger<typeof deleteKnowledgeBaseDocumentTask>(
        'delete-knowledge-base-document-from-vector',
        { documentId, organizationId: snapshot.organization.id },
      );
      result.knowledgeBaseTasksTriggered += 1;
    }

    if (snapshot.manualAnswerIds.length > 0) {
      await tasks.trigger<typeof deleteAllManualAnswersOrchestratorTask>(
        'delete-all-manual-answers-orchestrator',
        {
          organizationId: snapshot.organization.id,
          manualAnswerIds: snapshot.manualAnswerIds,
        },
      );
      result.manualAnswerOrchestratorTriggered = true;
    }

    return result;
  }

  async cleanupS3(
    organizationId: string,
    snapshot: PurgeSnapshot,
  ): Promise<PurgeExternalCleanupResult['s3']> {
    if (!s3Client) {
      this.logger.warn('S3 client not configured — skipping S3 cleanup');
      return { objectsDeleted: 0 };
    }

    let totalDeleted = 0;
    for (const ref of BUCKET_REFS) {
      const bucket = BUCKET_ENV[ref];
      if (!bucket) continue;

      const keys = new Set<string>(snapshot.s3KeysByBucket[ref] ?? []);

      let continuationToken: string | undefined;
      do {
        const listed = await s3Client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: `${organizationId}/`,
            ContinuationToken: continuationToken,
          }),
        );
        for (const obj of listed.Contents ?? []) {
          if (obj.Key) keys.add(obj.Key);
        }
        continuationToken = listed.IsTruncated
          ? listed.NextContinuationToken
          : undefined;
      } while (continuationToken);

      if (keys.size === 0) continue;

      totalDeleted += await this.deleteBatched(
        bucket,
        [...keys],
        organizationId,
      );
    }

    return { objectsDeleted: totalDeleted };
  }

  private async deleteBatched(
    bucket: string,
    keys: string[],
    organizationId: string,
  ): Promise<number> {
    if (!s3Client) return 0;
    let deleted = 0;
    for (let i = 0; i < keys.length; i += 1000) {
      const batch = keys
        .slice(i, i + 1000)
        .map<ObjectIdentifier>((Key) => ({ Key }));
      const res = await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: batch, Quiet: true },
        }),
      );
      const errorCount = res.Errors?.length ?? 0;
      deleted += batch.length - errorCount;
      if (errorCount > 0) {
        this.logger.error(
          `S3 reported ${errorCount} delete errors in bucket ${bucket} ` +
            `during purge of ${organizationId}`,
          JSON.stringify(res.Errors!.slice(0, 5)),
        );
        throw new Error(
          `S3 delete reported ${errorCount} errors in bucket ${bucket}`,
        );
      }
    }
    return deleted;
  }

  async verifyS3Clean(
    organizationId: string,
    snapshot: PurgeSnapshot,
  ): Promise<boolean> {
    if (!s3Client) return true;
    for (const ref of BUCKET_REFS) {
      const bucket = BUCKET_ENV[ref];
      if (!bucket) continue;

      const remaining = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: `${organizationId}/`,
          MaxKeys: 1,
        }),
      );
      if ((remaining.Contents ?? []).length > 0) return false;

      // Schema-referenced keys may not live under the `${orgId}/` prefix
      // (legacy uploads, cross-org-shared paths, etc.), so verify each
      // captured key is actually gone.
      const keys = snapshot.s3KeysByBucket[ref] ?? [];
      for (const key of keys) {
        if (key.startsWith(`${organizationId}/`)) continue;
        try {
          await s3Client.send(
            new HeadObjectCommand({ Bucket: bucket, Key: key }),
          );
          return false;
        } catch (err) {
          if (!this.isS3NotFound(err)) throw err;
        }
      }
    }
    return true;
  }

  private isS3NotFound(err: unknown): boolean {
    const e = err as
      | { name?: string; $metadata?: { httpStatusCode?: number } }
      | undefined;
    return (
      !!e &&
      (e.name === 'NotFound' ||
        e.name === 'NoSuchKey' ||
        e.$metadata?.httpStatusCode === 404)
    );
  }
}

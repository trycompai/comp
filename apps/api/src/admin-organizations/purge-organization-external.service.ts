import { Injectable, Logger } from '@nestjs/common';
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  type ObjectIdentifier,
} from '@aws-sdk/client-s3';
import { tasks } from '@trigger.dev/sdk';
import type Stripe from 'stripe';
import { StripeService } from '../stripe/stripe.service';
import { APP_AWS_ORG_ASSETS_BUCKET, s3Client } from '../app/s3';
import type { deleteKnowledgeBaseDocumentTask } from '../trigger/vector-store/delete-knowledge-base-document';
import type { deleteAllManualAnswersOrchestratorTask } from '../trigger/vector-store/delete-all-manual-answers-orchestrator';
import type {
  PurgeExternalCleanupResult,
  PurgeSnapshot,
} from './purge-organization.types';

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
      try {
        await tasks.trigger<typeof deleteKnowledgeBaseDocumentTask>(
          'delete-knowledge-base-document-from-vector',
          { documentId, organizationId: snapshot.organization.id },
        );
        result.knowledgeBaseTasksTriggered += 1;
      } catch (err) {
        this.logger.error(
          `Failed to trigger KB vector delete for ${documentId}`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    if (snapshot.manualAnswerIds.length > 0) {
      try {
        await tasks.trigger<typeof deleteAllManualAnswersOrchestratorTask>(
          'delete-all-manual-answers-orchestrator',
          {
            organizationId: snapshot.organization.id,
            manualAnswerIds: snapshot.manualAnswerIds,
          },
        );
        result.manualAnswerOrchestratorTriggered = true;
      } catch (err) {
        this.logger.error(
          `Failed to trigger manual answer orchestrator for ${snapshot.organization.id}`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    return result;
  }

  async cleanupS3(
    organizationId: string,
    snapshot: PurgeSnapshot,
  ): Promise<PurgeExternalCleanupResult['s3']> {
    if (!s3Client || !APP_AWS_ORG_ASSETS_BUCKET) {
      this.logger.warn(
        'S3 client or ORG assets bucket not configured — skipping S3 cleanup',
      );
      return { objectsDeleted: 0 };
    }

    const keys = new Set<string>(snapshot.s3KeysFromSchema);

    let continuationToken: string | undefined;
    do {
      const listed = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: APP_AWS_ORG_ASSETS_BUCKET,
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

    if (keys.size === 0) return { objectsDeleted: 0 };

    const allKeys = [...keys];
    let deleted = 0;

    for (let i = 0; i < allKeys.length; i += 1000) {
      const batch = allKeys
        .slice(i, i + 1000)
        .map<ObjectIdentifier>((Key) => ({ Key }));
      const res = await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: APP_AWS_ORG_ASSETS_BUCKET,
          Delete: { Objects: batch, Quiet: true },
        }),
      );
      deleted += batch.length - (res.Errors?.length ?? 0);
      if (res.Errors && res.Errors.length > 0) {
        this.logger.error(
          `S3 reported ${res.Errors.length} delete errors during purge of ${organizationId}`,
          JSON.stringify(res.Errors.slice(0, 5)),
        );
      }
    }

    return { objectsDeleted: deleted };
  }

  async verifyS3Clean(organizationId: string): Promise<boolean> {
    if (!s3Client || !APP_AWS_ORG_ASSETS_BUCKET) return true;
    const remaining = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: APP_AWS_ORG_ASSETS_BUCKET,
        Prefix: `${organizationId}/`,
        MaxKeys: 1,
      }),
    );
    return (remaining.Contents ?? []).length === 0;
  }
}

import { awsScanBinding } from '../../src/cloud-security/aws-scan-binding';
import { seedNativeCompletionEvidence } from './native-completion-data';
import { CompletionDatabase, ORG } from './aws-task-completion-db';
import { NOW } from './aws-task-completion-data';
import { NATIVE_SOURCE_FIXTURE } from './native-completion-sdk';

export async function seedAwsScanEvidence({
  database,
  connectionId = 'connection',
  runId = 'current-run',
  variables = {},
  metadata = {},
}: {
  database: CompletionDatabase;
  connectionId?: string;
  runId?: string;
  variables?: Record<string, string[]>;
  metadata?: Record<string, string>;
}) {
  await seedNativeCompletionEvidence({
    database,
    connectionId,
    runId,
    variables,
    metadata,
  });
  const binding = awsScanBinding({
    connection: { id: connectionId, variables, metadata },
    organizationId: ORG,
    credentialRevision: `${connectionId}-revision-1`,
    sourceIdentity: NATIVE_SOURCE_FIXTURE,
    runId,
    startedAt: NOW,
  });
  if (!binding) throw new Error('Known synthetic AWS scan must bind');
  const n = database.namespace;
  await database.admin.$executeRaw`UPDATE ${n}."IntegrationCheckRun"
    SET "taskId"=NULL,"checkId"='aws-security-scan',"completionEvidenceBinding"=${binding},
      "scannedServices"=ARRAY['kms'],"scanMode"='comp_scanners' WHERE id=${runId}`;
  await database.admin.$executeRaw`UPDATE ${n}."IntegrationCheckResult"
    SET evidence='{"serviceId":"kms"}' WHERE "checkRunId"=${runId}`;
}

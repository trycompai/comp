import { createNativeCompletionBinding } from '../../../../packages/integration-platform/src/runtime/completion-binding';
import { CompletionDatabase, ORG, TASK } from './aws-task-completion-db';
import { NOW } from './aws-task-completion-data';
import { NATIVE_SOURCE_FIXTURE } from './native-completion-sdk';

export async function seedNativeCompletionEvidence({
  database,
  connectionId = 'connection',
  runId = 'current-run',
  checkId = 'synthetic-check',
  variables = {},
  metadata = {},
}: {
  database: CompletionDatabase;
  connectionId?: string;
  runId?: string;
  checkId?: string;
  variables?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  const n = database.namespace;
  const revisionId = `${connectionId}-revision-1`;
  const binding = createNativeCompletionBinding({
    sourceIdentity: NATIVE_SOURCE_FIXTURE,
    definitionIdentity: null,
    manifestIdentity: null,
    organizationId: ORG,
    connectionId,
    checkId,
    context: {
      taskId: TASK,
      credentialRevision: revisionId,
      configurationMetadata: metadata,
    },
    variables,
  });
  if (!binding) throw new Error('Known synthetic native fixture must bind');
  await database.admin.$executeRaw`INSERT INTO ${n}."IntegrationProvider"
    VALUES ('provider','aws',true,'synthetic-display-hash',${NOW}) ON CONFLICT DO NOTHING`;
  await database.admin.$executeRaw`INSERT INTO ${n}."IntegrationConnection"
    (id,"providerId","organizationId",status,metadata,variables,"activeCredentialVersionId")
    VALUES (${connectionId},'provider',${ORG},'active',${JSON.stringify(metadata)}::jsonb,
      ${JSON.stringify(variables)}::jsonb,${revisionId})`;
  await database.admin
    .$executeRaw`INSERT INTO ${n}."IntegrationCredentialVersion"
    (id,"connectionId",version) VALUES (${revisionId},${connectionId},1)`;
  await database.admin.$executeRaw`INSERT INTO ${n}."IntegrationCheckRun"
    (id,"connectionId","taskId","checkId",status,"createdAt","startedAt","completedAt",
      "totalChecked","passedCount","failedCount","completionEvidenceBinding")
    VALUES (${runId},${connectionId},${TASK},${checkId},'success',${NOW},${NOW},${NOW},1,1,0,${binding})`;
  await database.admin.$executeRaw`INSERT INTO ${n}."IntegrationCheckResult"
    (id,"checkRunId",passed,"resourceId") VALUES (${runId + '-pass'},${runId},true,'passing-resource')`;
}

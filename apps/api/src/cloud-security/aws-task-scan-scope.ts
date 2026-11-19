import type { Prisma } from '@db';
import type {
  CompletionClient,
  CompletionConnection,
} from '../tasks/automatic-completion/native-completion-inventory';
import { awsScanEvidence, type AwsScanReference } from './aws-scan-evidence';

/** A task-level AWS decision covers every connected AWS account, not one green account. */
export async function awsTaskScanScope({
  organizationId,
  taskTemplateId,
  reference,
  connections,
  client,
}: {
  organizationId: string;
  taskTemplateId: string | null;
  reference: AwsScanReference;
  connections: CompletionConnection[];
  client: CompletionClient;
}) {
  const accounts = connections
    .filter((connection) => connection.provider.slug === 'aws')
    .sort((left, right) => left.id.localeCompare(right.id));
  if (
    !taskTemplateId ||
    !accounts.some((account) => account.id === reference.connectionId)
  )
    return null;
  const conditions: Prisma.TaskWhereInput[] = [];
  // The existing cloud scan is organization/account scoped. Per-task disabling
  // validates manifest check IDs; it does not establish a shared-scan exclusion.
  // Paused/disconnected accounts were already excluded by the explicit inventory.
  for (const account of accounts) {
    const latest =
      account.id === reference.connectionId
        ? reference
        : await client.integrationCheckRun
            .findFirst({
              where: {
                connectionId: account.id,
                checkId: 'aws-security-scan',
                taskId: null,
              },
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
              select: { id: true },
            })
            .then((run) =>
              run ? { connectionId: account.id, runId: run.id } : null,
            );
    if (!latest) return null;
    const evidence = await awsScanEvidence({
      organizationId,
      reference: latest,
      client,
      connections,
      lock: true,
    });
    if (!evidence?.eligibleTemplateIds.includes(taskTemplateId)) return null;
    conditions.push(evidence.condition);
  }
  return { conditions };
}

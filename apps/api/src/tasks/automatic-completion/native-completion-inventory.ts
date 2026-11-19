import { db, type Prisma } from '@db';
import {
  getManifest,
  isCodeManifest,
  declarativeDefinitionIdentity,
  dynamicManifestIdentity,
} from '@trycompai/integration-platform';
import { isCheckDisabledForTask } from '../../integration-platform/utils/disabled-task-checks';

export const connectionCompletionSelect = {
  id: true,
  providerId: true,
  status: true,
  metadata: true,
  variables: true,
  activeCredentialVersionId: true,
  credentialVersions: {
    orderBy: { version: 'desc' },
    take: 1,
    select: { id: true, version: true },
  },
  provider: {
    select: {
      id: true,
      slug: true,
      isActive: true,
      manifestHash: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.IntegrationConnectionSelect;

export type CompletionConnection = Prisma.IntegrationConnectionGetPayload<{
  select: typeof connectionCompletionSelect;
}>;

export type CompletionClient = Pick<
  Prisma.TransactionClient,
  | 'integrationConnection'
  | 'dynamicIntegration'
  | 'integrationCheckRun'
  | 'integrationCheckResult'
  | 'findingException'
  | 'task'
  | '$queryRaw'
>;

export function selectedCredentialRevision(connection: CompletionConnection) {
  return (
    connection.activeCredentialVersionId ??
    connection.credentialVersions[0]?.id ??
    null
  );
}

export async function loadCompletionConnections({
  organizationId,
  client = db,
}: {
  organizationId: string;
  client?: CompletionClient;
}) {
  return client.integrationConnection.findMany({
    where: {
      organizationId,
      status: { notIn: ['disconnected', 'paused'] },
      provider: { isActive: true },
    },
    select: connectionCompletionSelect,
    orderBy: { id: 'asc' },
  });
}

export async function expectedNativeChecks({
  taskId,
  taskTemplateId,
  connections,
  client,
}: {
  taskId: string;
  taskTemplateId: string | null;
  connections: CompletionConnection[];
  client: CompletionClient;
}) {
  const expected: Array<{
    connection: CompletionConnection;
    checkId: string;
    definitionIdentity: string | null;
    manifestIdentity: string | null;
  }> = [];
  if (!taskTemplateId) return expected;
  for (const connection of connections) {
    if (isCodeManifest(connection.provider.slug)) {
      const manifest = getManifest(connection.provider.slug);
      if (!manifest) return null;
      for (const check of manifest.checks ?? []) {
        if (
          check.taskMapping === taskTemplateId &&
          !isCheckDisabledForTask(connection.metadata, taskId, check.id)
        ) {
          expected.push({
            connection,
            checkId: check.id,
            definitionIdentity: null,
            manifestIdentity: null,
          });
        }
      }
      continue;
    }
    const dynamic = await client.dynamicIntegration.findUnique({
      where: { slug: connection.provider.slug },
      select: {
        isActive: true,
        slug: true,
        authConfig: true,
        baseUrl: true,
        defaultHeaders: true,
        syncDefinition: true,
        services: true,
        checks: {
          where: { isEnabled: true, taskMapping: taskTemplateId },
          select: {
            checkSlug: true,
            name: true,
            description: true,
            definition: true,
            taskMapping: true,
            defaultSeverity: true,
            variables: true,
            service: true,
          },
        },
      },
    });
    if (!dynamic?.isActive) return null;
    const manifestIdentity = dynamicManifestIdentity(dynamic);
    if (!manifestIdentity) return null;
    for (const check of dynamic.checks) {
      if (
        isCheckDisabledForTask(connection.metadata, taskId, check.checkSlug)
      ) {
        continue;
      }
      const definitionIdentity = declarativeDefinitionIdentity({
        id: check.checkSlug,
        name: check.name,
        description: check.description,
        definition: check.definition,
        taskMapping: check.taskMapping ?? undefined,
        defaultSeverity: check.defaultSeverity ?? 'medium',
        variables:
          Array.isArray(check.variables) && check.variables.length > 0
            ? check.variables
            : undefined,
        service: check.service ?? undefined,
      });
      if (!definitionIdentity) return null;
      expected.push({
        connection,
        checkId: check.checkSlug,
        definitionIdentity,
        manifestIdentity,
      });
    }
  }
  return expected;
}

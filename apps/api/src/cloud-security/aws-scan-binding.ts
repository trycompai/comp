import { createNativeScanCompletionBinding } from '@trycompai/integration-platform';
import type { CompletionConnection } from '../tasks/automatic-completion/native-completion-inventory';
import { cloudScanServices } from './cloud-scan-configuration';
import { resolveAwsScanMode } from './aws-scan-mode';

export function awsConfiguredScanMode(
  connection: Pick<CompletionConnection, 'metadata'>,
) {
  const metadata = connection.metadata;
  return resolveAwsScanMode(
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? metadata.awsScanMode
      : undefined,
  );
}

export function awsScanBinding({
  connection,
  organizationId,
  credentialRevision,
  sourceIdentity,
  runId,
  startedAt,
}: {
  connection: Pick<CompletionConnection, 'id' | 'metadata' | 'variables'>;
  organizationId: string;
  credentialRevision: string | null;
  sourceIdentity: string | null;
  runId: string;
  startedAt: Date;
}) {
  const variables = connection.variables || {};
  if (typeof variables !== 'object' || Array.isArray(variables)) return null;
  const metadata = connection.metadata;
  const scanMode = awsConfiguredScanMode(connection);
  const services = cloudScanServices({ provider: 'aws', variables });
  return createNativeScanCompletionBinding({
    sourceIdentity,
    organizationId,
    connectionId: connection.id,
    runId,
    startedAt: startedAt.toISOString(),
    credentialRevision,
    variables,
    configurationMetadata: metadata,
    scanMode,
    baselineServices: services.baselineServices,
    enabledServices: services.enabledServices ?? null,
  });
}

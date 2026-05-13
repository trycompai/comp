'use client';

import { CloudShellSetup } from '@/components/integrations/CloudShellSetup';
import { CredentialInput } from '@/components/integrations/CredentialInput';
import type { IntegrationProvider } from '@/hooks/use-integration-platform';
import {
  useIntegrationConnection,
  useIntegrationMutations,
} from '@/hooks/use-integration-platform';
import { Button } from '@trycompai/design-system';
import {
  getAwsCloudShellUrl,
  getAwsRemediationScript,
  normalizeAwsEnvironment,
} from '@trycompai/integration-platform';
import { Badge } from '@trycompai/ui/badge';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  AccountSettingsFieldGroup,
  AccountSettingsInfoRow,
  AccountSettingsSection,
} from './account-settings-shared-ui';

export function AwsAccountSettingsBody({
  open,
  connectionId,
  provider,
  orgId,
  onUpdated,
}: {
  open: boolean;
  connectionId: string;
  provider: IntegrationProvider;
  orgId: string;
  onUpdated?: () => void;
}) {
  const { connection, isLoading } = useIntegrationConnection(open ? connectionId : null);
  const { updateConnectionCredentials, updateConnectionMetadata, deleteConnection } =
    useIntegrationMutations();

  const [roleArn, setRoleArn] = useState('');
  const [remediationRoleArn, setRemediationRoleArn] = useState('');
  const [regions, setRegions] = useState<string[]>([]);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [savingRemediation, setSavingRemediation] = useState(false);
  const [savingRegions, setSavingRegions] = useState(false);
  const [savingAwsType, setSavingAwsType] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [awsType, setAwsType] = useState('');

  const metadata = (connection?.metadata ?? {}) as Record<string, unknown>;
  const displayName =
    (metadata.connectionName as string) ?? (metadata.accountId as string) ?? connectionId;
  const accountId = metadata.accountId as string | undefined;
  const externalId = (metadata.externalId as string) ?? orgId;
  const hasRemediation = Boolean(metadata.remediationRoleArn);
  const regionsField = provider.credentialFields?.find((f) => f.id === 'regions');
  const awsEnvironment = normalizeAwsEnvironment(awsType);
  const remediationScript = getAwsRemediationScript(awsEnvironment);
  const cloudShellUrl = getAwsCloudShellUrl(awsEnvironment);
  const filteredRegionOptions =
    regionsField?.options?.filter((option) =>
      awsEnvironment === 'aws-us-gov'
        ? option.value.startsWith('us-gov-')
        : !option.value.startsWith('us-gov-'),
    ) ?? [];

  useEffect(() => {
    if (!connection) return;
    const nextAwsType = typeof metadata.awsType === 'string' ? metadata.awsType : 'aws';
    setRoleArn((metadata.roleArn as string) ?? '');
    setRemediationRoleArn((metadata.remediationRoleArn as string) ?? '');
    setRegions(
      Array.isArray(metadata.regions)
        ? (metadata.regions as string[]).filter((region) =>
            nextAwsType === 'aws-us-gov'
              ? region.startsWith('us-gov-')
              : !region.startsWith('us-gov-'),
          )
        : [],
    );
    setAwsType(nextAwsType);
  }, [
    connection,
    metadata.roleArn,
    metadata.remediationRoleArn,
    metadata.regions,
    metadata.awsType,
  ]);

  const saveField = useCallback(
    async (
      creds: Record<string, string | string[]>,
      metaUpdates: Record<string, unknown>,
      setLoading: (v: boolean) => void,
      successMsg: string,
    ) => {
      setLoading(true);
      try {
        const result = await updateConnectionCredentials(connectionId, creds);
        if (!result.success) {
          toast.error(result.error || 'Failed to save');
          return;
        }
        if (Object.keys(metaUpdates).length > 0) {
          await updateConnectionMetadata(connectionId, metaUpdates);
        }
        toast.success(successMsg);
        onUpdated?.();
      } catch {
        toast.error('Failed to save');
      } finally {
        setLoading(false);
      }
    },
    [connectionId, updateConnectionCredentials, updateConnectionMetadata, onUpdated],
  );

  const handleSaveCredentials = useCallback(async () => {
    if (!roleArn.trim()) {
      toast.error('Role ARN is required');
      return;
    }
    const expectedPrefix =
      awsEnvironment === 'aws-us-gov'
        ? 'arn:aws-us-gov:iam::'
        : 'arn:aws:iam::';
    if (!roleArn.startsWith(expectedPrefix)) {
      toast.error('Role ARN must match the selected AWS environment');
      return;
    }
    const meta: Record<string, unknown> = { roleArn };
    const arnMatch = roleArn.match(/^arn:(?:aws|aws-us-gov):iam::(\d{12}):role\/.+$/);
    if (arnMatch) meta.accountId = arnMatch[1];
    await saveField({ roleArn }, meta, setSavingCredentials, 'Credentials saved');
  }, [awsEnvironment, roleArn, saveField]);

  const handleSaveRemediation = useCallback(async () => {
    const expectedPrefix =
      awsEnvironment === 'aws-us-gov'
        ? 'arn:aws-us-gov:iam::'
        : 'arn:aws:iam::';
    if (remediationRoleArn && !remediationRoleArn.startsWith(expectedPrefix)) {
      toast.error('Remediation Role ARN must match the selected AWS environment');
      return;
    }
    await saveField(
      { remediationRoleArn },
      { remediationRoleArn },
      setSavingRemediation,
      'Remediation role saved',
    );
  }, [awsEnvironment, remediationRoleArn, saveField]);

  const handleSaveRegions = useCallback(async () => {
    if (regions.length === 0) {
      toast.error('Select at least one region');
      return;
    }
    await saveField({ regions }, { regions }, setSavingRegions, 'Regions saved');
  }, [regions, saveField]);

  const handleSaveAwsType = useCallback(async () => {
    if (!awsType) {
      toast.error('Select an AWS environment');
      return;
    }
    await saveField(
      { awsType, regions: [] },
      { awsType, regions: [] },
      setSavingAwsType,
      'AWS environment saved',
    );
    setRegions([]);
  }, [awsType, saveField]);

  const handleDisconnect = useCallback(async () => {
    if (!confirm('Are you sure? All associated data will be removed.')) return;
    setDisconnecting(true);
    try {
      const result = await deleteConnection(connectionId);
      if (result.success) {
        toast.success('Disconnected');
        onUpdated?.();
      } else toast.error(result.error || 'Failed');
    } catch {
      toast.error('Failed');
    } finally {
      setDisconnecting(false);
    }
  }, [connectionId, deleteConnection, onUpdated]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 py-5">
      <div className="rounded-md border bg-muted/20 px-3 py-2.5 space-y-1">
        <AccountSettingsInfoRow
          label="Status"
          badge={
            connection?.status === 'active' ? (
              <Badge
                variant="outline"
                className="gap-1 text-[9px] px-1.5 py-0 border-emerald-200 bg-emerald-50 text-emerald-700"
              >
                <CheckCircle2 className="h-2.5 w-2.5" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                {connection?.status}
              </Badge>
            )
          }
        />
        {accountId && <AccountSettingsInfoRow label="Account ID" value={accountId} mono />}
        {displayName && !accountId && (
          <AccountSettingsInfoRow label="Account" value={displayName} mono />
        )}
        {regions.length > 0 && (
          <AccountSettingsInfoRow label="Regions" value={`${regions.length}`} />
        )}
        {connection?.createdAt && (
          <AccountSettingsInfoRow
            label="Created"
            value={new Date(connection.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          />
        )}
      </div>

      <AccountSettingsSection label="AWS Environment">
        <AccountSettingsFieldGroup label="AWS Environment">
          <CredentialInput
            field={{
              id: 'awsType',
              label: '',
              type: 'select',
              required: true,
              placeholder: 'Select AWS environment',
              helpText: 'Choose the AWS partition where this account runs.',
              options: [
                { value: 'aws', label: 'Commercial AWS' },
                { value: 'aws-us-gov', label: 'AWS GovCloud (US)' },
              ],
            }}
            value={awsType}
            onChange={(v) => setAwsType(v as string)}
          />
          <Button
            onClick={() => void handleSaveAwsType()}
            loading={savingAwsType}
            disabled={savingAwsType}
            size="sm"
          >
            Save
          </Button>
        </AccountSettingsFieldGroup>
      </AccountSettingsSection>

      <AccountSettingsSection label="Credentials">
        <AccountSettingsFieldGroup label="Role ARN">
          <CredentialInput
            field={{
              id: 'roleArn',
              label: '',
              type: 'text',
              required: true,
              placeholder: 'arn:aws:iam::123456789012:role/CompAI-Auditor',
            }}
            value={roleArn}
            onChange={(v) => setRoleArn(v as string)}
          />
        </AccountSettingsFieldGroup>
        <AccountSettingsFieldGroup label="External ID">
          <p className="rounded-md border bg-muted/30 px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
            {externalId}
          </p>
        </AccountSettingsFieldGroup>
        <Button
          onClick={() => void handleSaveCredentials()}
          loading={savingCredentials}
          disabled={savingCredentials}
          size="sm"
        >
          Save
        </Button>
      </AccountSettingsSection>

      <AccountSettingsSection label="Auto-Remediation">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Status</span>
          {hasRemediation ? (
            <Badge
              variant="outline"
              className="gap-1 text-[9px] px-1.5 py-0 border-emerald-200 bg-emerald-50 text-emerald-700"
            >
              <CheckCircle2 className="h-2.5 w-2.5" />
              Configured
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
              Not configured
            </Badge>
          )}
        </div>
        <CloudShellSetup
          script={remediationScript}
          externalId={orgId}
          cloudShellUrl={cloudShellUrl}
          title="Setup Script"
          subtitle="Create a write-access role for auto-fix"
          footnote=""
        />
        <AccountSettingsFieldGroup label="Remediation Role ARN">
          <CredentialInput
            field={{
              id: 'remediationRoleArn',
              label: '',
              type: 'text',
              required: false,
              placeholder: 'arn:aws:iam::123456789012:role/CompAI-Remediator',
            }}
            value={remediationRoleArn}
            onChange={(v) => setRemediationRoleArn(v as string)}
          />
        </AccountSettingsFieldGroup>
        <Button
          onClick={() => void handleSaveRemediation()}
          loading={savingRemediation}
          disabled={savingRemediation}
          size="sm"
        >
          Save
        </Button>
      </AccountSettingsSection>

      {regionsField && (
        <AccountSettingsSection label="Scan Regions">
          <CredentialInput
            field={regionsField}
            value={regions}
            onChange={(v) => setRegions(v as string[])}
            optionsOverride={filteredRegionOptions}
          />
          <Button
            onClick={() => void handleSaveRegions()}
            loading={savingRegions}
            disabled={savingRegions}
            size="sm"
          >
            Save
          </Button>
        </AccountSettingsSection>
      )}

      <div className="rounded-md border border-destructive/20 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
            <div>
              <p className="text-xs font-medium">Disconnect</p>
              <p className="text-[10px] text-muted-foreground">Remove this account and all data</p>
            </div>
          </div>
          <Button
            variant="destructive"
            onClick={() => void handleDisconnect()}
            loading={disconnecting}
            disabled={disconnecting}
            size="sm"
          >
            Disconnect
          </Button>
        </div>
      </div>
    </div>
  );
}

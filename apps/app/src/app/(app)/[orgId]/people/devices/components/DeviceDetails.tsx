'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { ArrowLeft, Information } from '@trycompai/design-system/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@trycompai/ui/tooltip';
import type { DeviceWithChecks } from '../types';
import {
  CHECK_FIELDS,
  PLATFORM_LABELS,
  isDeviceOnline,
  sourceChecks,
  sourceReportedTooltipCopy,
  sourceVerdict,
  staleLabel,
  staleTooltipCopy,
} from '../lib/device-source';
import { NotTrackedBadge } from './DeviceListCells';
import { RevokeAgentAccessDialog } from './RevokeAgentAccessDialog';

function DeviceComplianceBadge({ device }: { device: DeviceWithChecks }) {
  if (device.source === 'integration') {
    // Show the SOURCE's own verdict when it reports one (attributed via the
    // same tooltip pattern as the stale/not-tracked badges, so the provenance
    // is reachable by keyboard/touch); otherwise untracked, as before.
    const verdict = sourceVerdict(device);
    if (verdict === undefined) {
      return <NotTrackedBadge device={device} />;
    }
    return (
      <div className="flex items-center gap-1">
        <Badge variant={verdict ? 'default' : 'destructive'}>
          {verdict ? 'Compliant' : 'Non-Compliant'}
        </Badge>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Where does this compliance status come from?"
                className="inline-flex items-center text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <Information size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              {sourceReportedTooltipCopy(device)}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }
  if (device.complianceStatus === 'stale') {
    return (
      <div className="flex items-center gap-1">
        <Badge variant="secondary">{staleLabel(device.daysSinceLastCheckIn)}</Badge>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="What does Stale mean?"
                className="inline-flex items-center text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <Information size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              {staleTooltipCopy(device.daysSinceLastCheckIn)}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }
  if (device.complianceStatus === 'compliant') {
    return <Badge variant="default">Compliant</Badge>;
  }
  return <Badge variant="destructive">Non-Compliant</Badge>;
}

interface DeviceDetailsProps {
  device: DeviceWithChecks;
  onClose: () => void;
}

export const DeviceDetails = ({ device, onClose }: DeviceDetailsProps) => {
  return (
    <Stack gap="4">
      <div>
        <Button variant="outline" size="sm" onClick={onClose}>
          <ArrowLeft size={16} />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                {/* Live status: agent devices report directly; imported devices
                    carry the provider's last-contact timestamp (lastSeenAt), so
                    the same rule applies — and stays consistent with the list. */}
                {(device.source === 'device_agent' ||
                  device.source === 'integration') && (
                  <span
                    className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                      isDeviceOnline(device.lastCheckIn)
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}
                  />
                )}
                <Text size="lg" weight="semibold">
                  {device.name}
                </Text>
                {(device.source === 'device_agent' ||
                  device.source === 'integration') && (
                  <Badge variant="outline">
                    {isDeviceOnline(device.lastCheckIn) ? 'Online' : 'Offline'}
                  </Badge>
                )}
                {device.source === 'integration' && (
                  <Badge variant="outline">
                    {`Imported • ${device.integrationProvider?.name ?? 'Integration'}`}
                  </Badge>
                )}
                {device.source === 'fleet' && <Badge variant="outline">Fleet (Legacy)</Badge>}
              </div>
              <Text size="sm" variant="muted">
                {PLATFORM_LABELS[device.platform] ?? device.platform} {device.osVersion}
                {device.hardwareModel ? ` \u2022 ${device.hardwareModel}` : ''}
              </Text>
            </div>
            <div className="flex items-center gap-2">
              {device.source === 'device_agent' && device.hasActiveAgentSession && (
                <RevokeAgentAccessDialog deviceId={device.id} deviceName={device.name} />
              )}
              <DeviceComplianceBadge device={device} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Text size="sm" variant="muted">
                User
              </Text>
              <Text size="sm" weight="medium">
                {device.user.name}
              </Text>
              <Text size="xs" variant="muted">
                {device.user.email}
              </Text>
            </div>
            <div>
              <Text size="sm" variant="muted">
                Hostname
              </Text>
              <Text size="sm" weight="medium">
                {device.hostname}
              </Text>
            </div>
            <div>
              <Text size="sm" variant="muted">
                Serial Number
              </Text>
              <Text size="sm" weight="medium">
                {device.serialNumber?.startsWith('fallback:')
                  ? 'Generic serial number'
                  : (device.serialNumber ?? 'N/A')}
              </Text>
            </div>
            <div>
              <Text size="sm" variant="muted">
                {device.source === 'integration' ? 'Last synced' : 'Last Check-in'}
              </Text>
              <Text size="sm" weight="medium">
                {device.lastCheckIn ? new Date(device.lastCheckIn).toLocaleString() : 'Never'}
              </Text>
            </div>
            <div>
              <Text size="sm" variant="muted">
                {device.source === 'integration' ? 'Source' : 'Agent Version'}
              </Text>
              <Text size="sm" weight="medium">
                {device.source === 'integration'
                  ? (device.integrationProvider?.name ?? 'Integration')
                  : (device.agentVersion ?? 'N/A')}
              </Text>
            </div>
            <div>
              <Text size="sm" variant="muted">
                Installed
              </Text>
              <Text size="sm" weight="medium">
                {new Date(device.installedAt).toLocaleDateString()}
              </Text>
            </div>
          </div>
        </CardContent>
      </Card>

      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead>Check</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Result</TableHead>
            <TableHead>Exception</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Imported device with SOURCE-reported checks: show those (provider
              vocabulary) instead of CompAI's fixed agent checks. */}
          {device.source === 'integration' && sourceChecks(device).length > 0 &&
            sourceChecks(device).map((check) => (
              <TableRow key={check.id}>
                <TableCell>
                  <Text size="sm" weight="medium">
                    {check.label}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text size="sm" variant="muted">
                    Reported by {device.integrationProvider?.name ?? 'the integration'}
                  </Text>
                </TableCell>
                <TableCell>
                  <Badge variant={check.passed ? 'default' : 'destructive'}>
                    {check.passed ? 'Pass' : 'Fail'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Text size="sm" variant="muted">
                    —
                  </Text>
                </TableCell>
              </TableRow>
            ))}
          {!(device.source === 'integration' && sourceChecks(device).length > 0) &&
          CHECK_FIELDS.map(({ key, dbKey, label }) => {
            const isIntegration = device.source === 'integration';
            const isFleetUnsupported =
              device.source === 'fleet' && key !== 'diskEncryptionEnabled';
            const isUntracked = isIntegration || isFleetUnsupported;
            const untrackedCopy = isIntegration
              ? 'Not collected for imported devices'
              : 'Not tracked by Fleet';
            const isStale = device.complianceStatus === 'stale';
            const passed = device[key];
            const details = device.checkDetails?.[dbKey];
            return (
              <TableRow key={key}>
                <TableCell>
                  <Text size="sm" weight="medium">
                    {label}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text size="sm" variant="muted">
                    {isUntracked
                      ? untrackedCopy
                      : isStale
                        ? '—'
                        : (details?.message ?? '—')}
                  </Text>
                </TableCell>
                <TableCell>
                  {isUntracked ? (
                    <Badge variant="outline">N/A</Badge>
                  ) : isStale ? (
                    <Badge
                      variant="secondary"
                      title={`${label} — unknown (device is stale)`}
                    >
                      —
                    </Badge>
                  ) : (
                    <Badge variant={passed ? 'default' : 'destructive'}>
                      {passed ? 'Pass' : 'Fail'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Text size="sm" variant="muted">
                    {isUntracked || isStale ? '—' : (details?.exception ?? '—')}
                  </Text>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Stack>
  );
};

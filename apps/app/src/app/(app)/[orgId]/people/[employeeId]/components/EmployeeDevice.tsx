'use client';

import type { Organization } from '@db';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Stack,
  Text,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@trycompai/design-system';
import { Information, InformationFilled } from '@trycompai/design-system/icons';
import { PolicyItem } from '../../devices/components/PolicyItem';
import type { DeviceWithChecks, FleetPolicy, Host } from '../../devices/types';

const CHECK_FIELDS = [
  { key: 'diskEncryptionEnabled' as const, dbKey: 'disk_encryption', label: 'Disk Encryption' },
  { key: 'antivirusEnabled' as const, dbKey: 'antivirus', label: 'Antivirus' },
  { key: 'passwordPolicySet' as const, dbKey: 'password_policy', label: 'Password Policy' },
  { key: 'screenLockEnabled' as const, dbKey: 'screen_lock', label: 'Screen Lock' },
];

const PLATFORM_LABELS: Record<string, string> = {
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
};

interface EmployeeDeviceProps {
  organization: Organization;
  memberDevice: DeviceWithChecks | null;
  host: Host;
  fleetPolicies: FleetPolicy[];
}

function staleLabel(daysSinceLastCheckIn: number | null): string {
  return daysSinceLastCheckIn === null ? 'Stale' : `Stale (${daysSinceLastCheckIn}d)`;
}

function staleTooltipCopy(daysSinceLastCheckIn: number | null): string {
  return daysSinceLastCheckIn === null
    ? "This device was registered but hasn't sent a compliance check yet. If it's not new, the agent may not be running or the device may be offline."
    : "This device hasn't reported to CompAI in over 7 days, so we can't verify its current compliance. It may be offline, the agent may need to be updated, or the device may no longer be in use. Check with the employee.";
}

function DeviceComplianceBadge({ device }: { device: DeviceWithChecks }) {
  if (device.complianceStatus === 'stale') {
    return (
      <div className="flex items-center gap-1">
        <Badge variant="secondary">{staleLabel(device.daysSinceLastCheckIn)}</Badge>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              aria-label="What does Stale mean?"
              onClick={(event) => event.stopPropagation()}
            >
              <Information size={14} />
            </TooltipTrigger>
            <TooltipContent>{staleTooltipCopy(device.daysSinceLastCheckIn)}</TooltipContent>
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

export function EmployeeDevice({
  organization,
  memberDevice,
  host,
  fleetPolicies,
}: EmployeeDeviceProps) {
  return (
    <>
      {!organization.deviceAgentStepEnabled ? (
        <div className="flex items-center gap-3 rounded-lg border border-muted bg-muted/30 p-4">
          <span className="shrink-0 text-muted-foreground">
            <InformationFilled size={20} />
          </span>
          <div>
            <Text weight="medium">Device agent is managed outside of Comp AI</Text>
            <Text size="sm" variant="muted">
              Evidence for device compliance can be logged in the Secure Device and Device List
              evidence tasks.
            </Text>
          </div>
        </div>
      ) : memberDevice ? (
        <Stack gap="4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <Text size="lg" weight="semibold">
                    {memberDevice.name}
                  </Text>
                  <Text size="sm" variant="muted">
                    {PLATFORM_LABELS[memberDevice.platform] ?? memberDevice.platform}{' '}
                    {memberDevice.osVersion}
                    {memberDevice.hardwareModel ? ` - ${memberDevice.hardwareModel}` : ''}
                  </Text>
                </div>
                <DeviceComplianceBadge device={memberDevice} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {CHECK_FIELDS.map(({ key, dbKey, label }) => {
                  const isFleetUnsupported =
                    memberDevice.source === 'fleet' && key !== 'diskEncryptionEnabled';
                  const isStale = memberDevice.complianceStatus === 'stale';
                  const passed = memberDevice[key];
                  const details = memberDevice.checkDetails?.[dbKey];
                  return (
                    <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <span className="text-sm font-medium">{label}</span>
                        {!isFleetUnsupported && !isStale && details?.message && (
                          <p className="text-muted-foreground text-xs">{details.message}</p>
                        )}
                        {isFleetUnsupported && (
                          <p className="text-muted-foreground text-xs">Not tracked by Fleet</p>
                        )}
                        {!isFleetUnsupported && !isStale && details?.exception && (
                          <p className="text-amber-600 dark:text-amber-400 text-xs mt-0.5">
                            {details.exception}
                          </p>
                        )}
                      </div>
                      {isFleetUnsupported ? (
                        <Badge variant="outline">N/A</Badge>
                      ) : isStale ? (
                        <Badge variant="secondary" title={`${label} - unknown (device is stale)`}>
                          -
                        </Badge>
                      ) : (
                        <Badge variant={passed ? 'default' : 'destructive'}>
                          {passed ? 'Pass' : 'Fail'}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
              {memberDevice.lastCheckIn && (
                <p className="text-muted-foreground text-xs mt-3">
                  Last check-in: {new Date(memberDevice.lastCheckIn).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        </Stack>
      ) : host ? (
        <Card>
          <CardHeader>
            <CardTitle>{host.computer_name}&apos;s Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fleetPolicies.map((policy) => (
                <PolicyItem key={policy.id} policy={policy} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="py-6 text-center">
          <Text variant="muted">No device found.</Text>
        </div>
      )}
    </>
  );
}

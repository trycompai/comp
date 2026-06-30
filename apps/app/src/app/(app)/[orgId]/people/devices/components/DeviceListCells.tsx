'use client';

import {
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  TableCell,
  TableRow,
  Text,
} from '@trycompai/design-system';
import {
  Information,
  OverflowMenuVertical,
  TrashCan,
} from '@trycompai/design-system/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@trycompai/ui/tooltip';
import Link from 'next/link';
import type { DeviceWithChecks } from '../types';
import { isComplianceTracked, sourceLabel } from '../lib/device-source';

export const CHECK_FIELDS = [
  { key: 'diskEncryptionEnabled' as const, label: 'Disk Encryption' },
  { key: 'antivirusEnabled' as const, label: 'Antivirus' },
  { key: 'passwordPolicySet' as const, label: 'Password Policy' },
  { key: 'screenLockEnabled' as const, label: 'Screen Lock' },
];

export const PLATFORM_LABELS: Record<string, string> = {
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
};

export function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/** Device is considered online if it checked in within the last 2 hours. */
export function isDeviceOnline(lastCheckIn: string | null): boolean {
  if (!lastCheckIn) return false;
  const diffMs = Date.now() - new Date(lastCheckIn).getTime();
  return diffMs < 2 * 60 * 60 * 1000;
}

function staleLabel(daysSinceLastCheckIn: number | null): string {
  return daysSinceLastCheckIn === null ? 'Stale' : `Stale (${daysSinceLastCheckIn}d)`;
}

function staleTooltipCopy(daysSinceLastCheckIn: number | null): string {
  return daysSinceLastCheckIn === null
    ? "This device was registered but hasn't sent a compliance check yet. If it's not new, the agent may not be running or the device may be offline."
    : "This device hasn't reported to CompAI in over 7 days, so we can't verify its current compliance. It may be offline, the agent may need to be updated, or the device may no longer be in use. Check with the employee.";
}

function InfoTooltip({ label, copy }: { label: string; copy: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className="inline-flex items-center text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <Information size={14} />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{copy}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function SourceBadge({ device }: { device: DeviceWithChecks }) {
  return <Badge variant="outline">{sourceLabel(device)}</Badge>;
}

export function UserNameCell({
  device,
  orgId,
}: {
  device: DeviceWithChecks;
  orgId: string;
}) {
  const memberId = device.memberId;

  if (!memberId) {
    return (
      <div className="flex flex-col">
        <Text size="sm" weight="medium">{device.user.name}</Text>
        <Text size="xs" variant="muted">{device.user.email}</Text>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Link
        href={`/${orgId}/people/${memberId}`}
        className="truncate text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {device.user.name}
      </Link>
      <Text size="xs" variant="muted">{device.user.email}</Text>
    </div>
  );
}

export function CompliantBadge({ device }: { device: DeviceWithChecks }) {
  // Integration-imported devices are inventory records, not compliance records —
  // CompAI never ran security checks on them, so showing "No" (red) would be a
  // false negative. Present them as untracked instead.
  if (!isComplianceTracked(device)) {
    const provider = device.integrationProvider?.name ?? 'an integration';
    return (
      <div className="flex items-center gap-1">
        <Badge variant="secondary">Not tracked</Badge>
        <InfoTooltip
          label="Why is compliance not tracked?"
          copy={`This device was imported from ${provider}. CompAI doesn't collect compliance checks for imported devices — install the CompAI agent to track its security posture.`}
        />
      </div>
    );
  }

  if (device.complianceStatus === 'stale') {
    return (
      <div className="flex items-center gap-1">
        <Badge variant="secondary">{staleLabel(device.daysSinceLastCheckIn)}</Badge>
        <InfoTooltip
          label="What does Stale mean?"
          copy={staleTooltipCopy(device.daysSinceLastCheckIn)}
        />
      </div>
    );
  }
  if (device.complianceStatus === 'compliant') {
    return <Badge variant="default">Yes</Badge>;
  }
  return <Badge variant="destructive">No</Badge>;
}

export function CheckBadges({ device }: { device: DeviceWithChecks }) {
  if (!isComplianceTracked(device) || device.complianceStatus === 'stale') {
    const reason = !isComplianceTracked(device)
      ? 'not collected for imported devices'
      : 'unknown (device is stale)';
    return (
      <div className="flex flex-wrap gap-1">
        {CHECK_FIELDS.map(({ key, label }) => (
          <Badge key={key} variant="secondary" title={`${label} — ${reason}`}>
            —
          </Badge>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {CHECK_FIELDS.map(({ key, label }) => (
        <Badge key={key} variant={device[key] ? 'default' : 'destructive'}>
          {label}
        </Badge>
      ))}
    </div>
  );
}

export interface DeviceTableRowProps {
  device: DeviceWithChecks;
  orgId: string;
  canRemoveDevice: boolean;
  onSelect: (device: DeviceWithChecks) => void;
  onRequestRemove: (device: DeviceWithChecks) => void;
}

export function DeviceTableRow({
  device,
  orgId,
  canRemoveDevice,
  onSelect,
  onRequestRemove,
}: DeviceTableRowProps) {
  const isAgent = device.source === 'device_agent';
  const showOnline = isAgent && isDeviceOnline(device.lastCheckIn);
  return (
    <TableRow onClick={() => onSelect(device)} style={{ cursor: 'pointer' }}>
      <TableCell>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${
              showOnline ? 'bg-green-500' : 'bg-gray-300'
            }`}
            title={
              isAgent
                ? showOnline
                  ? 'Online'
                  : 'Offline'
                : 'Imported device (no live status)'
            }
          />
          <Text size="sm" weight="medium">
            {device.name}
          </Text>
        </div>
      </TableCell>
      <TableCell>
        <UserNameCell device={device} orgId={orgId} />
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <Text size="sm">{PLATFORM_LABELS[device.platform] ?? device.platform}</Text>
          <Text size="xs" variant="muted">
            {device.osVersion}
          </Text>
        </div>
      </TableCell>
      <TableCell>
        <SourceBadge device={device} />
      </TableCell>
      <TableCell>
        <Text size="sm">{formatTimeAgo(device.lastCheckIn)}</Text>
      </TableCell>
      <TableCell>
        <CheckBadges device={device} />
      </TableCell>
      <TableCell>
        <CompliantBadge device={device} />
      </TableCell>
      <TableCell>
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Open device actions"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <OverflowMenuVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" style={{ width: 'auto' }}>
              <DropdownMenuItem
                disabled={!canRemoveDevice}
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestRemove(device);
                }}
                variant="destructive"
              >
                <TrashCan size={16} className="mr-2" />
                <span className="whitespace-nowrap">Remove Device</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}

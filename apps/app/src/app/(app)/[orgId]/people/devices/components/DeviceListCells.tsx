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
import {
  CHECK_FIELDS,
  PLATFORM_LABELS,
  formatTimeAgo,
  isComplianceTracked,
  isDeviceOnline,
  notTrackedTooltipCopy,
  sourceChecks,
  sourceLabel,
  sourceReportedTooltipCopy,
  sourceVerdict,
  staleLabel,
  staleTooltipCopy,
} from '../lib/device-source';

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

/**
 * Compliance badge for an integration-imported device. Shared with the details
 * panel so the "Not tracked" copy and provider fallback stay consistent.
 */
export function NotTrackedBadge({ device }: { device: DeviceWithChecks }) {
  return (
    <div className="flex items-center gap-1">
      <Badge variant="secondary">Not tracked</Badge>
      <InfoTooltip
        label="Why is compliance not tracked?"
        copy={notTrackedTooltipCopy(device)}
      />
    </div>
  );
}

export function CompliantBadge({ device }: { device: DeviceWithChecks }) {
  // Integration-imported devices: CompAI never ran security checks on them, so
  // a red "No" from OUR checks would be a false negative. But when the SOURCE
  // reports its own verdict (e.g. Intune complianceState), show that — clearly
  // attributed to the provider. No verdict → untracked, as before.
  if (!isComplianceTracked(device)) {
    const verdict = sourceVerdict(device);
    if (verdict === undefined) {
      return <NotTrackedBadge device={device} />;
    }
    return (
      <div className="flex items-center gap-1">
        <Badge variant={verdict ? 'default' : 'destructive'}>
          {verdict ? 'Yes' : 'No'}
        </Badge>
        <InfoTooltip
          label="Where does this compliance status come from?"
          copy={sourceReportedTooltipCopy(device)}
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
  // Imported devices: render whatever checks the SOURCE reported, in the
  // provider's own naming. Nothing reported → placeholder dashes, as before.
  if (!isComplianceTracked(device)) {
    const checks = sourceChecks(device);
    if (checks.length > 0) {
      return (
        <div className="flex flex-wrap gap-1">
          {checks.map((check) => (
            <Badge
              key={check.id}
              variant={check.passed ? 'default' : 'destructive'}
              title={`${check.label} — ${sourceReportedTooltipCopy(device)}`}
            >
              {check.label}
            </Badge>
          ))}
        </div>
      );
    }
  }
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
  // Imported devices carry the PROVIDER's last-contact timestamp in
  // lastCheckIn (see device sync lastSeenAt), so the same online rule applies
  // honestly to them too. Fleet rows keep the spacer.
  const showsLiveDot = isAgent || device.source === 'integration';
  const showOnline = showsLiveDot && isDeviceOnline(device.lastCheckIn);
  return (
    <TableRow onClick={() => onSelect(device)} style={{ cursor: 'pointer' }}>
      <TableCell>
        <div className="flex items-center gap-2">
          {showsLiveDot ? (
            <span
              className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                showOnline ? 'bg-green-500' : 'bg-gray-300'
              }`}
              title={showOnline ? 'Online' : 'Offline'}
            />
          ) : (
            <span className="inline-block h-2 w-2 shrink-0" aria-hidden="true" />
          )}
          {/* A focusable control so the details view is reachable by keyboard,
              not just by clicking the row. */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(device);
            }}
            className="text-left text-sm font-medium hover:underline"
          >
            {device.name}
          </button>
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

'use client';

import { useVendorChecksSummary } from '@/hooks/use-vendor-integrations';
import { Badge, HStack, Text } from '@trycompai/design-system';
import {
  CheckmarkFilled,
  ErrorFilled,
  Time,
} from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface VendorChecksSummaryProps {
  vendorId: string;
}

export function VendorChecksSummary({ vendorId }: VendorChecksSummaryProps) {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;
  const { summary, isLoading } = useVendorChecksSummary(vendorId);

  // Render nothing when there are no integrations or still loading
  if (isLoading || !summary || summary.total === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-border p-3">
      <HStack justify="between" align="center">
        <HStack gap="sm" align="center">
          <Text size="sm" weight="medium">
            Integration Checks
          </Text>
          <HStack gap="xs" align="center">
            {summary.passing > 0 && (
              <Badge variant="default">
                <CheckmarkFilled size={12} />
                {summary.passing} passing
              </Badge>
            )}
            {summary.failing > 0 && (
              <Badge variant="destructive">
                <ErrorFilled size={12} />
                {summary.failing} failing
              </Badge>
            )}
          </HStack>
          {summary.lastRunAt && (
            <HStack gap="xs" align="center">
              <div className="text-muted-foreground">
                <Time size={14} />
              </div>
              <Text size="xs" variant="muted">
                {formatRelativeTime(summary.lastRunAt)}
              </Text>
            </HStack>
          )}
        </HStack>
        <Link
          href={`/${orgId}/vendors/${vendorId}?tab=tasks`}
          className="text-xs font-medium text-primary hover:underline"
        >
          View in Tasks
        </Link>
      </HStack>
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

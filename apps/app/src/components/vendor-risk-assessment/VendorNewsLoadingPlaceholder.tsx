'use client';

import { Stack, Text } from '@trycompai/design-system';

export function VendorNewsLoadingPlaceholder() {
  return (
    <Stack gap="sm">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <Text size="sm" weight="medium">Gathering recent news...</Text>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-muted" />
        <div className="h-3 w-9/12 animate-pulse rounded bg-muted" />
      </div>
    </Stack>
  );
}

'use client';

import { Card, CardContent, CardHeader, CardTitle, Text } from '@trycompai/design-system';
import { Skeleton } from '@trycompai/ui/skeleton';

export function VendorNewsLoadingPlaceholder() {
  return (
    <div className="border border-primary/20 rounded-md">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="text-sm font-semibold flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <Text size="sm" weight="medium">Gathering recent news...</Text>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-9/12" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useFrameworkUpdateStatuses } from '@/hooks/use-framework-update-statuses';
import { usePermissions } from '@/hooks/use-permissions';
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  HStack,
  Text,
} from '@trycompai/design-system';
import { ChevronUp, Upgrade } from '@trycompai/design-system/icons';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * The framework-updates card, with NO outer layout wrapper — the host (e.g. the
 * Overview nudge stack) owns width/spacing. Returns null when there are no
 * updates, so it's safe to mount unconditionally.
 */
export function FrameworkUpdatesCard() {
  const { data: statuses } = useFrameworkUpdateStatuses();
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const { orgId } = useParams<{ orgId: string }>();
  const [open, setOpen] = useState(true);

  const canUpdate = hasPermission('framework', 'update');

  if (!statuses || statuses.length === 0) return null;

  const count = statuses.length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between rounded-t-lg bg-secondary px-4 py-3">
          <HStack gap="3" align="center">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Upgrade size={16} />
            </div>
            <Text size="sm" weight="medium">
              {count} framework {count === 1 ? 'update' : 'updates'} available
            </Text>
            <Badge variant="default">NEW</Badge>
          </HStack>
          <CollapsibleTrigger className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            {open ? `Hide ${count}` : `Show ${count}`}
            <ChevronUp
              size={16}
              className={`transition-transform ${open ? '' : 'rotate-180'}`}
            />
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="border-t">
            {statuses.map((status, index) => (
              <div
                key={status.frameworkInstanceId}
                className={`flex items-center justify-between px-4 py-3 ${
                  index < count - 1 ? 'border-b' : ''
                }`}
              >
                <HStack gap="4" align="center">
                  <Text size="sm" weight="medium">
                    {status.frameworkName ?? 'Framework'}
                  </Text>
                  <Text size="sm" variant="muted">
                    v{status.currentVersion?.version ?? '—'} → v
                    {status.latestVersion?.version}
                  </Text>
                </HStack>
                {canUpdate && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      router.push(
                        `/${orgId}/frameworks/${status.frameworkInstanceId}/review-update`,
                      )
                    }
                  >
                    Review update
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

'use client';

import { FindingsTab } from '../components/FindingsTab';
import { OverviewTabs } from '../components/OverviewTabs';
import { usePermissions } from '@/hooks/use-permissions';
import {
  Button,
  PageHeader,
  PageLayout,
} from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { useState } from 'react';

/**
 * Client wrapper for the Findings route. Hosts the "Add finding" action in the
 * page header so it stays out of the table/filter row, and forwards the open
 * state into the FindingsTab sheet.
 */
export function FindingsPage({ orgId }: { orgId: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('finding', 'create');

  return (
    <PageLayout
      header={
        <PageHeader
          title="Overview"
          tabs={<OverviewTabs />}
          actions={
            canCreate ? (
              <Button
                size="sm"
                iconLeft={<Add size={16} />}
                onClick={() => setCreateOpen(true)}
              >
                Add finding
              </Button>
            ) : null
          }
        />
      }
    >
      <FindingsTab
        organizationId={orgId}
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
      />
    </PageLayout>
  );
}

'use client';

import { useOrganizationFindings } from '@/hooks/use-findings-api';
import { useFeatureFlag } from '@trycompai/analytics';
import { FindingStatus } from '@db';
import { TabsList, TabsTrigger, Tabs } from '@trycompai/design-system';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

/**
 * Overview nav tabs. Renders link-based tabs so each sub-route (`/overview`,
 * `/overview/findings`, `/overview/timeline`) paints without loading the
 * other's data.
 */
export function OverviewTabs() {
  const { orgId } = useParams<{ orgId: string }>();
  const pathname = usePathname();
  const isTimelineEnabled = useFeatureFlag('is-timeline-enabled');

  const activeValue = pathname?.endsWith('/findings')
    ? 'findings'
    : pathname?.endsWith('/timeline')
      ? 'timeline'
      : 'overview';

  // Lightweight count for the tab badge — filters to status=open on the server.
  const { data: openFindingsData } = useOrganizationFindings({
    status: FindingStatus.open,
  });
  const openCount = Array.isArray(openFindingsData?.data)
    ? openFindingsData.data.length
    : 0;

  const overviewHref = `/${orgId}/overview`;
  const findingsHref = `/${orgId}/overview/findings`;
  const timelineHref = `/${orgId}/overview/timeline`;

  return (
    <Tabs value={activeValue}>
      <TabsList variant="underline">
        <TabsTrigger
          value="overview"
          nativeButton={false}
          render={<Link href={overviewHref} prefetch />}
        >
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="findings"
          nativeButton={false}
          render={<Link href={findingsHref} prefetch />}
        >
          Findings{openCount > 0 ? ` (${openCount})` : ''}
        </TabsTrigger>
        {isTimelineEnabled && (
          <TabsTrigger
            value="timeline"
            nativeButton={false}
            render={<Link href={timelineHref} prefetch />}
          >
            Timeline
          </TabsTrigger>
        )}
      </TabsList>
    </Tabs>
  );
}

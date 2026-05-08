import { serverApi } from '@/lib/api-server';
import { PageHeader, PageLayout } from '@trycompai/design-system';
import { OverviewTabs } from '../components/OverviewTabs';
import { TimelineOverview } from '../components/TimelineOverview';
import type { Timeline } from '@/hooks/use-timelines';

export function generateMetadata() {
  return { title: 'Timeline' };
}

export default async function TimelinePage() {
  const timelinesRes = await serverApi.get<{ data: Timeline[]; count: number }>(
    '/v1/timelines',
  );
  const timelines = timelinesRes.data?.data ?? [];

  return (
    <PageLayout header={<PageHeader title="Overview" tabs={<OverviewTabs />} />}>
      <TimelineOverview initialData={timelines} />
    </PageLayout>
  );
}

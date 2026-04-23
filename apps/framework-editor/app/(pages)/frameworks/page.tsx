import { serverApi } from '@/app/lib/api-server';
import { isAuthorized } from '@/app/lib/utils';
import { redirect } from 'next/navigation';
import { FrameworksClientPage, type FrameworkWithCounts } from './FrameworksClientPage';

export default async function Page() {
  const isAllowed = await isAuthorized();
  if (!isAllowed) redirect('/auth');

  // `/framework` now returns latestVersion per framework in a single query,
  // so we no longer need the N+1 loop that fetched versions per framework.
  const frameworks = await serverApi<FrameworkWithCounts[]>('/framework');

  const enriched = frameworks.map((fw) => ({
    ...fw,
    version: fw.latestVersion?.version ?? fw.version,
  }));

  return <FrameworksClientPage initialFrameworks={enriched} />;
}

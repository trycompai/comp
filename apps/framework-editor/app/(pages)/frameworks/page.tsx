import { serverApi } from '@/app/lib/api-server';
import { isAuthorized } from '@/app/lib/utils';
import { redirect } from 'next/navigation';
import { FrameworksClientPage, type FrameworkWithCounts } from './FrameworksClientPage';

export default async function Page() {
  const isAllowed = await isAuthorized();
  if (!isAllowed) redirect('/auth');

  const frameworks = await serverApi<FrameworkWithCounts[]>('/framework');

  // Enrich each framework with the latest published version (from FrameworkVersion).
  // Falls back to the catalog version string if no versions have been published.
  const enriched = await Promise.all(
    frameworks.map(async (fw) => {
      try {
        const res = await serverApi<{ data: Array<{ id: string; version: string }> }>(
          `/framework/${fw.id}/versions`,
        );
        const latest = Array.isArray(res?.data) ? res.data[0]?.version : undefined;
        return { ...fw, version: latest ?? fw.version };
      } catch {
        return fw;
      }
    }),
  );

  return <FrameworksClientPage initialFrameworks={enriched} />;
}

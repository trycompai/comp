import { serverApi } from '@/app/lib/api-server';
import { isAuthorized } from '@/app/lib/utils';
import { redirect } from 'next/navigation';
import {
  FrameworksClientPage,
  type FrameworkFamilyWithCount,
  type FrameworkWithCounts,
} from './FrameworksClientPage';

export default async function Page() {
  const isAllowed = await isAuthorized();
  if (!isAllowed) redirect('/auth');

  // `/framework` returns latestVersion + counts per framework; `/framework-family`
  // returns the families (folders) with their framework counts (FRAME-20). The
  // grouped view does the version fallback per row, so no pre-mapping needed.
  const [frameworks, families] = await Promise.all([
    serverApi<FrameworkWithCounts[]>('/framework'),
    serverApi<FrameworkFamilyWithCount[]>('/framework-family'),
  ]);

  return (
    <FrameworksClientPage initialFrameworks={frameworks} initialFamilies={families} />
  );
}

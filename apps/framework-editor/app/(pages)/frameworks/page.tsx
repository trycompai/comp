import { serverApi } from '@/app/lib/api-server';
import { isAuthorized } from '@/app/lib/utils';
import { redirect } from 'next/navigation';
import { FrameworksClientPage, type FrameworkWithCounts } from './FrameworksClientPage';

export default async function Page() {
  const isAllowed = await isAuthorized();
  if (!isAllowed) redirect('/auth');

  const frameworks = await serverApi<FrameworkWithCounts[]>('/framework');

  return <FrameworksClientPage initialFrameworks={frameworks} />;
}

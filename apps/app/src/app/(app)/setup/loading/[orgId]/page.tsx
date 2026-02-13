import { SetupLoadingStep } from '@/app/(app)/setup/components/SetupLoadingStep';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

interface SetupLoadingPageProps {
  params: Promise<{ orgId: string }>;
}

export default async function SetupLoadingPage({ params }: SetupLoadingPageProps) {
  const { orgId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const user = session?.user;

  if (!session || !session.session || !user) {
    return redirect('/auth');
  }

  return <SetupLoadingStep organizationId={orgId} />;
}

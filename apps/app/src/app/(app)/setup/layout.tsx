import { MinimalHeader } from '@/components/layout/MinimalHeader';
import { getOrganizations } from '@/data/getOrganizations';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AnimatedGradientBackgroundWrapper } from './components/AnimatedGradientBackgroundWrapper';

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect('/auth');
  }

  const { organizations } = await getOrganizations();
  const currentOrganization = null; // No current org in setup

  return (
    <main className="flex min-h-screen flex-col">
      <AnimatedGradientBackgroundWrapper />
      <MinimalHeader
        user={session.user}
        organizations={organizations}
        currentOrganization={currentOrganization}
        variant="setup"
      />
      <div>{children}</div>
    </main>
  );
}

'use server';

import { AnimatedGradientBackgroundWrapper } from '@/app/(app)/setup/components/AnimatedGradientBackgroundWrapper';
import { MinimalHeader } from '@/components/layout/MinimalHeader';
import { getOrganizations } from '@/data/getOrganizations';
import { auth } from '@/utils/auth';
import type { Organization } from '@trycompai/db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

interface OnboardingLayoutProps {
  children: ReactNode;
  variant?: 'setup' | 'onboarding';
  currentOrganization?: Organization | null;
}

export async function OnboardingLayout({
  children,
  variant = 'setup',
  currentOrganization = null,
}: OnboardingLayoutProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect('/auth');
  }

  const { organizations } = await getOrganizations();

  return (
    <main className="flex min-h-dvh flex-col">
      <AnimatedGradientBackgroundWrapper />
      <MinimalHeader
        user={session.user}
        organizations={organizations}
        currentOrganization={currentOrganization}
        variant={variant}
      />
      <div>{children}</div>
    </main>
  );
}

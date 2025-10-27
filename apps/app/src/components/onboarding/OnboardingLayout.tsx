'use server';

import { getOrganizations } from '@/data/getOrganizations';
import { auth } from '@/utils/auth';
import type { Organization } from '@db';
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
      <div className="flex flex-1">{children}</div>
    </main>
  );
}

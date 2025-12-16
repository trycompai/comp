'use client';

import { changeOrganizationAction } from '@/actions/change-organization';
import { Logo } from '@/app/(app)/setup/components/Logo';
import type { Organization } from '@db';
import type { User } from 'better-auth';
import { useAction } from 'next-safe-action/hooks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OnboardingUserMenu } from './OnboardingUserMenu';

interface MinimalHeaderProps {
  user: User;
  organizations: Organization[];
  currentOrganization: Organization | null;
  variant?: 'setup' | 'upgrade' | 'onboarding';
}

export function MinimalHeader({
  user,
  organizations,
  currentOrganization,
  variant = 'upgrade',
}: MinimalHeaderProps) {
  const router = useRouter();

  const changeOrgAction = useAction(changeOrganizationAction, {
    onSuccess: (result) => {
      const orgId = result.data?.data?.id;
      if (orgId) {
        router.push(`/${orgId}/`);
      }
    },
  });

  const hasExistingOrgs = organizations.length > 0;

  return (
    <header className="sticky top-0 z-10 bg-background flex items-center justify-between h-[90px] w-full px-4 md:px-18">
      <Link href="/" className="flex items-center">
        <Logo />
      </Link>
      {(variant === 'onboarding' || variant === 'setup') && (
        <OnboardingUserMenu user={user} />
      )}
    </header>
  );
}

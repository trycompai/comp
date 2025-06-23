'use client';

import { changeOrganizationAction } from '@/actions/change-organization';
import { MinimalOrganizationSwitcher } from '@/components/layout/MinimalOrganizationSwitcher';
import { MinimalUserMenu } from '@/components/layout/MinimalUserMenu';
import type { Organization } from '@comp/db/types';
import { Icons } from '@comp/ui/icons';
import type { User } from 'better-auth';
import { ArrowLeft } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface MinimalHeaderProps {
  user: User;
  organizations: Organization[];
  currentOrganization: Organization | null;
  variant?: 'setup' | 'upgrade';
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
    <header className="bg-background/95 sticky top-0 z-10 flex items-center justify-between border-b px-4 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <Icons.Logo className="h-6 w-6" />
          <span className="hidden sm:inline text-lg font-semibold">Comp AI</span>
        </Link>
        {variant === 'upgrade' ? (
          <div className="w-auto">
            <MinimalOrganizationSwitcher
              organizations={organizations}
              currentOrganization={currentOrganization}
            />
          </div>
        ) : hasExistingOrgs ? (
          <button
            className="flex items-center gap-1.5 text-sm text-foreground/80 hover:text-foreground transition-colors"
            onClick={() => changeOrgAction.execute({ organizationId: organizations[0].id })}
            disabled={changeOrgAction.status === 'executing'}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden md:inline">
              {organizations.length === 1 ? (
                <>Continue with {organizations[0].name || 'your organization'}</>
              ) : (
                <>Back to your organizations</>
              )}
            </span>
            <span className="hidden sm:inline md:hidden">Back</span>
          </button>
        ) : null}
      </div>

      <MinimalUserMenu user={user} />
    </header>
  );
}

"use client";

import type { User } from "better-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { changeOrganizationAction } from "@/actions/change-organization";
import { Logo } from "@/app/(app)/setup/components/Logo";
import { useAction } from "next-safe-action/hooks";

import type { Organization } from "@trycompai/db";

interface MinimalHeaderProps {
  user: User;
  organizations: Organization[];
  currentOrganization: Organization | null;
  variant?: "setup" | "upgrade" | "onboarding";
}

export function MinimalHeader({
  user,
  organizations,
  currentOrganization,
  variant = "upgrade",
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
    <header className="bg-background sticky top-0 z-10 flex h-[90px] w-full items-center px-4 md:px-18">
      <Link href="/" className="flex items-center">
        <Logo />
      </Link>
    </header>
  );
}

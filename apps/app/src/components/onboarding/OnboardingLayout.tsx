"use server";

import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOrganizations } from "@/data/getOrganizations";
import { auth } from "@/utils/auth";

import type { Organization } from "@trycompai/db";

interface OnboardingLayoutProps {
  children: ReactNode;
  variant?: "setup" | "onboarding";
  currentOrganization?: Organization | null;
}

export async function OnboardingLayout({
  children,
  variant = "setup",
  currentOrganization = null,
}: OnboardingLayoutProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/auth");
  }

  const { organizations } = await getOrganizations();

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="flex flex-1">{children}</div>
    </main>
  );
}

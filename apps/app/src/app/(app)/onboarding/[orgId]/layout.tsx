import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CheckoutCompleteDialog } from "@/components/dialogs/checkout-complete-dialog";
import { MinimalHeader } from "@/components/layout/MinimalHeader";
import { auth } from "@/utils/auth";

import { db } from "@trycompai/db";

import { OnboardingSidebar } from "../../setup/components/OnboardingSidebar";

interface OnboardingRouteLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}

export default async function OnboardingRouteLayout({
  children,
  params,
}: OnboardingRouteLayoutProps) {
  const { orgId } = await params;

  // Get current user
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    notFound();
  }

  // Get organization and verify membership
  const organization = await db.organization.findFirst({
    where: {
      id: orgId,
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
  });

  if (!organization) {
    notFound();
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="flex min-h-0 flex-1">
        {/* Form Section - Left Side */}
        <div className="flex flex-1 flex-col">
          <MinimalHeader
            user={session.user}
            organizations={[]}
            currentOrganization={organization}
          />
          {children}
        </div>

        {/* Sidebar Section - Right Side, Hidden on Mobile */}
        <div className="hidden min-h-screen items-end justify-center bg-[#FAFAFA] px-8 py-16 md:flex md:w-1/2">
          <OnboardingSidebar className="mx-auto mt-auto h-1/2 w-full max-w-xl" />
        </div>
      </div>
      <CheckoutCompleteDialog orgId={organization.id} />
    </main>
  );
}

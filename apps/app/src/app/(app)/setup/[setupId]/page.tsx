import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MinimalHeader } from "@/components/layout/MinimalHeader";
import { auth } from "@/utils/auth";

import { OnboardingSidebar } from "../components/OnboardingSidebar";
import { OrganizationSetupForm } from "../components/OrganizationSetupForm";
import { getSetupSession } from "../lib/setup-session";

export const metadata: Metadata = {
  title: "Setup Your Organization | Comp AI",
};

interface SetupPageProps {
  params: Promise<{ setupId: string }>;
  searchParams: Promise<{ inviteCode?: string }>;
}

export default async function SetupWithIdPage({
  params,
  searchParams,
}: SetupPageProps) {
  const { setupId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const user = session?.user;

  if (!session || !session.session || !user) {
    return redirect("/auth");
  }

  // Verify the setup session exists and belongs to this user
  const setupSession = await getSetupSession(setupId);

  if (!setupSession || setupSession.userId !== user.id) {
    // Invalid or expired session, redirect to regular setup
    return redirect("/setup");
  }

  // If there's an inviteCode in the URL, redirect to the new invitation route
  const { inviteCode } = await searchParams;
  if (inviteCode) {
    return redirect(`/invite/${inviteCode}`);
  }

  return (
    <div className="flex min-h-0 flex-1">
      {/* Form Section - Left Side */}
      <div className="flex flex-1 flex-col">
        <MinimalHeader
          user={user}
          organizations={[]}
          currentOrganization={null}
        />

        <OrganizationSetupForm
          setupId={setupId}
          initialData={setupSession.formData}
          currentStep={setupSession.currentStep}
        />
      </div>

      {/* Sidebar Section - Right Side, Hidden on Mobile */}
      <div className="hidden min-h-screen items-end justify-center bg-[#FAFAFA] px-8 py-16 md:flex md:w-1/2">
        <OnboardingSidebar className="mx-auto mt-auto h-1/2 w-full max-w-xl" />
      </div>
    </div>
  );
}

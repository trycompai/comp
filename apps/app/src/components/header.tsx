import { Suspense } from "react";
import { headers } from "next/headers";
import { getFeatureFlags } from "@/app/posthog";
import { UserMenu } from "@/components/user-menu";
import { getOrganizations } from "@/data/getOrganizations";
import { auth } from "@/utils/auth";

import { Skeleton } from "@trycompai/ui/skeleton";

import { AssistantButton } from "./ai/chat-button";
import { MobileMenu } from "./mobile-menu";
import { NotificationBell } from "./notifications/notification-bell";

export async function Header({
  organizationId,
  hideChat = false,
}: {
  organizationId?: string;
  hideChat?: boolean;
}) {
  const { organizations } = await getOrganizations();

  // Check feature flags for menu items
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  let isQuestionnaireEnabled = false;
  let isTrustNdaEnabled = false;
  if (session?.user?.id) {
    const flags = await getFeatureFlags(session.user.id);
    isQuestionnaireEnabled = flags["ai-vendor-questionnaire"] === true;
    isTrustNdaEnabled =
      flags["is-trust-nda-enabled"] === true ||
      flags["is-trust-nda-enabled"] === "true";
  }

  return (
    <header className="border/40 bg-card sticky top-0 z-10 flex items-center justify-between border-b px-4 py-2 backdrop-blur-sm">
      <MobileMenu
        organizations={organizations}
        organizationId={organizationId}
        isQuestionnaireEnabled={isQuestionnaireEnabled}
        isTrustNdaEnabled={isTrustNdaEnabled}
      />

      {!hideChat && <AssistantButton />}

      <div className="mr-2 ml-auto flex items-center">
        <NotificationBell />
      </div>
      <div className="flex items-center space-x-2">
        <Suspense fallback={<Skeleton className="h-8 w-8 rounded-full" />}>
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}

import { IntegrationsHeader } from "@/components/integrations/integrations-header";
import { IntegrationsServer } from "@/components/integrations/integrations.server";
import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function IntegrationsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session.activeOrganizationId) {
    return redirect("/");
  }

  const [organization] = await Promise.all([
    db.organization.findUnique({
      where: {
        id: session?.session.activeOrganizationId ?? "",
      },
    }),
  ]);

  if (!organization) {
    return redirect("/");
  }

  return (
    <div className="m-auto flex max-w-[1200px] flex-col gap-4">
      <IntegrationsHeader />

      <IntegrationsServer />
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Integrations",
  };
}

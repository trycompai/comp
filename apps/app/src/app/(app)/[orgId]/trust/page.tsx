import type { Metadata } from "next";
import PageCore from "@/components/pages/PageCore.tsx";

import { TrustAccessRequestsClient } from "./components/trust-access-request-client";

export default async function TrustAccessPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  return (
    <PageCore className="border-0">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Trust Access Management</h1>
          <p className="text-muted-foreground">
            Manage data access requests and grants
          </p>
        </div>
        <TrustAccessRequestsClient orgId={orgId} />
      </div>
    </PageCore>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Trust Access Management",
  };
}

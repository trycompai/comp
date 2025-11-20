import type { Metadata } from "next";
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";

import { db } from "@trycompai/db";

import { TrustPortalDomain } from "./components/TrustPortalDomain";
import { TrustPortalSwitch } from "./components/TrustPortalSwitch";

export default async function TrustPortalSettings({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const trustPortal = await getTrustPortal(orgId);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <TrustPortalSwitch
        enabled={trustPortal?.enabled ?? false}
        slug={trustPortal?.friendlyUrl ?? orgId}
        domain={trustPortal?.domain ?? ""}
        domainVerified={trustPortal?.domainVerified ?? false}
        contactEmail={trustPortal?.contactEmail ?? null}
        orgId={orgId}
        soc2type1={trustPortal?.soc2type1 ?? false}
        soc2type2={trustPortal?.soc2type2 ?? false}
        iso27001={trustPortal?.iso27001 ?? false}
        iso42001={trustPortal?.iso42001 ?? false}
        gdpr={trustPortal?.gdpr ?? false}
        hipaa={trustPortal?.hipaa ?? false}
        pcidss={trustPortal?.pcidss ?? false}
        nen7510={trustPortal?.nen7510 ?? false}
        soc2type1Status={trustPortal?.soc2type1Status ?? "started"}
        soc2type2Status={trustPortal?.soc2type2Status ?? "started"}
        iso27001Status={trustPortal?.iso27001Status ?? "started"}
        iso42001Status={trustPortal?.iso42001Status ?? "started"}
        gdprStatus={trustPortal?.gdprStatus ?? "started"}
        hipaaStatus={trustPortal?.hipaaStatus ?? "started"}
        pcidssStatus={trustPortal?.pcidssStatus ?? "started"}
        nen7510Status={trustPortal?.nen7510Status ?? "started"}
        friendlyUrl={trustPortal?.friendlyUrl ?? null}
      />
      <TrustPortalDomain
        domain={trustPortal?.domain ?? ""}
        domainVerified={trustPortal?.domainVerified ?? false}
        orgId={orgId}
        isVercelDomain={trustPortal?.isVercelDomain ?? false}
        vercelVerification={trustPortal?.vercelVerification ?? null}
      />
    </div>
  );
}

const getTrustPortal = cache(async (orgId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session.activeOrganizationId) {
    return null;
  }

  const trustPortal = await db.trust.findUnique({
    where: {
      organizationId: orgId,
    },
  });

  return {
    enabled: trustPortal?.status === "published",
    domain: trustPortal?.domain,
    domainVerified: trustPortal?.domainVerified,
    contactEmail: trustPortal?.contactEmail ?? "",
    soc2type1: trustPortal?.soc2type1,
    soc2type2: trustPortal?.soc2type2 || trustPortal?.soc2,
    iso27001: trustPortal?.iso27001,
    iso42001: trustPortal?.iso42001,
    gdpr: trustPortal?.gdpr,
    hipaa: trustPortal?.hipaa,
    pcidss: trustPortal?.pci_dss,
    nen7510: trustPortal?.nen7510,
    soc2type1Status: trustPortal?.soc2type1_status,
    soc2type2Status:
      !trustPortal?.soc2type2 && trustPortal?.soc2
        ? trustPortal?.soc2_status
        : trustPortal?.soc2type2_status,
    iso27001Status: trustPortal?.iso27001_status,
    iso42001Status: trustPortal?.iso42001_status,
    gdprStatus: trustPortal?.gdpr_status,
    hipaaStatus: trustPortal?.hipaa_status,
    pcidssStatus: trustPortal?.pci_dss_status,
    nen7510Status: trustPortal?.nen7510_status,
    isVercelDomain: trustPortal?.isVercelDomain,
    vercelVerification: trustPortal?.vercelVerification,
    friendlyUrl: trustPortal?.friendlyUrl,
  };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return {
    title: "Trust Portal",
  };
}

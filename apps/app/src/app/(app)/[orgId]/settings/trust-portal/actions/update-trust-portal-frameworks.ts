'use server';

import { auth } from '@/utils/auth';
import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';

interface UpdateTrustPortalFrameworksParams {
  orgId: string;
  soc2type1?: boolean;
  soc2type2?: boolean;
  iso27001?: boolean;
  gdpr?: boolean;
  hipaa?: boolean;
  pcidss?: boolean;
  soc2type1Status?: 'started' | 'in_progress' | 'compliant';
  soc2type2Status?: 'started' | 'in_progress' | 'compliant';
  iso27001Status?: 'started' | 'in_progress' | 'compliant';
  gdprStatus?: 'started' | 'in_progress' | 'compliant';
  hipaaStatus?: 'started' | 'in_progress' | 'compliant';
  pcidssStatus?: 'started' | 'in_progress' | 'compliant';
}

export async function updateTrustPortalFrameworks({
  orgId,
  soc2type1,
  soc2type2,
  iso27001,
  gdpr,
  hipaa,
  pcidss,
  soc2type1Status,
  soc2type2Status,
  iso27001Status,
  gdprStatus,
  hipaaStatus,
  pcidssStatus,
}: UpdateTrustPortalFrameworksParams) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session.activeOrganizationId) {
    throw new Error('Not authenticated');
  }

  const trustPortal = await db.trust.findUnique({
    where: {
      organizationId: orgId,
    },
  });

  if (!trustPortal) {
    throw new Error('Trust portal not found');
  }

  await db.trust.update({
    where: {
      organizationId: orgId,
    },
    data: {
      soc2: soc2type2 ?? trustPortal.soc2,
      soc2type1: soc2type1 ?? trustPortal.soc2type1,
      soc2type2: soc2type2 ?? trustPortal.soc2type2,
      iso27001: iso27001 ?? trustPortal.iso27001,
      gdpr: gdpr ?? trustPortal.gdpr,
      hipaa: hipaa ?? trustPortal.hipaa,
      pci_dss: pcidss ?? trustPortal.pci_dss,
      soc2_status: soc2type2Status ?? trustPortal.soc2_status,
      soc2type1_status: soc2type1Status ?? trustPortal.soc2type1_status,
      soc2type2_status: soc2type2Status ?? trustPortal.soc2type2_status,
      iso27001_status: iso27001Status ?? trustPortal.iso27001_status,
      gdpr_status: gdprStatus ?? trustPortal.gdpr_status,
      hipaa_status: hipaaStatus ?? trustPortal.hipaa_status,
      pci_dss_status: pcidssStatus ?? trustPortal.pci_dss_status,
    },
  });

  revalidatePath(`/${orgId}/settings/trust-portal`);
  revalidateTag(`organization_${orgId}`);
}

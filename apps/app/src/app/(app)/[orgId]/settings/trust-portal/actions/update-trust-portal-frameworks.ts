'use server';

import { auth } from '@/utils/auth';
import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';

interface UpdateTrustPortalFrameworksParams {
  orgId: string;
  soc2?: boolean;
  soc2typei?: boolean;
  soc2typeii?: boolean;
  iso27001?: boolean;
  gdpr?: boolean;
  hipaa?: boolean;
  soc2Status?: 'started' | 'in_progress' | 'compliant';
  soc2typeiStatus?: 'started' | 'in_progress' | 'compliant';
  soc2typeiiStatus?: 'started' | 'in_progress' | 'compliant';
  iso27001Status?: 'started' | 'in_progress' | 'compliant';
  gdprStatus?: 'started' | 'in_progress' | 'compliant';
  hipaaStatus?: 'started' | 'in_progress' | 'compliant';
}

export async function updateTrustPortalFrameworks({
  orgId,
  soc2,
  soc2typei,
  soc2typeii,
  iso27001,
  gdpr,
  hipaa,
  soc2Status,
  soc2typeiStatus,
  soc2typeiiStatus,
  iso27001Status,
  gdprStatus,
  hipaaStatus,
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
      soc2: soc2 ?? trustPortal.soc2,
      soc2typei: soc2typei ?? trustPortal.soc2typei,
      soc2typeii: soc2typeii ?? trustPortal.soc2typeii,
      iso27001: iso27001 ?? trustPortal.iso27001,
      gdpr: gdpr ?? trustPortal.gdpr,
      hipaa: hipaa ?? trustPortal.hipaa,
      soc2_status: soc2Status ?? trustPortal.soc2_status,
      soc2typei_status: soc2typeiStatus ?? trustPortal.soc2typei_status,
      soc2typeii_status: soc2typeiiStatus ?? trustPortal.soc2typeii_status,
      iso27001_status: iso27001Status ?? trustPortal.iso27001_status,
      gdpr_status: gdprStatus ?? trustPortal.gdpr_status,
      hipaa_status: hipaaStatus ?? trustPortal.hipaa_status,
    },
  });

  revalidatePath(`/${orgId}/settings/trust-portal`);
  revalidateTag(`organization_${orgId}`);
}

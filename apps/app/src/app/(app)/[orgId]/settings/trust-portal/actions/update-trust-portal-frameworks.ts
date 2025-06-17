'use server';

import { auth } from '@/utils/auth';
import { db } from '@comp/db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';

interface UpdateTrustPortalFrameworksParams {
  orgId: string;
  soc2?: boolean;
  iso27001?: boolean;
  gdpr?: boolean;
  soc2Status?: 'started' | 'in_progress' | 'compliant';
  iso27001Status?: 'started' | 'in_progress' | 'compliant';
  gdprStatus?: 'started' | 'in_progress' | 'compliant';
}

export async function updateTrustPortalFrameworks({
  orgId,
  soc2,
  iso27001,
  gdpr,
  soc2Status,
  iso27001Status,
  gdprStatus,
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
      iso27001: iso27001 ?? trustPortal.iso27001,
      gdpr: gdpr ?? trustPortal.gdpr,
      soc2_status: soc2Status ?? trustPortal.soc2_status,
      iso27001_status: iso27001Status ?? trustPortal.iso27001_status,
      gdpr_status: gdprStatus ?? trustPortal.gdpr_status,
    },
  });

  revalidatePath(`/${orgId}/settings/trust-portal`);
  revalidateTag(`organization_${orgId}`);
}

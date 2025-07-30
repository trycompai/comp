'use server';

import { auth } from '@/utils/auth';
import { db, Policy } from '@db';
import { headers } from 'next/headers';

interface GetRelatedPoliciesParams {
  organizationId: string;
  controlId: string;
}

export const getRelatedPolicies = async ({
  organizationId,
  controlId,
}: GetRelatedPoliciesParams): Promise<Policy[]> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.session.activeOrganizationId) {
      return [];
    }

    // Fetch the control with its policies
    const control = await db.control.findUnique({
      where: {
        id: controlId,
        organizationId: organizationId,
      },
      include: {
        policies: true,
      },
    });

    if (!control || !control.policies) {
      return [];
    }

    return control.policies || [];
  } catch (error) {
    console.error('Error fetching Linked Policies:', error);
    return [];
  }
};

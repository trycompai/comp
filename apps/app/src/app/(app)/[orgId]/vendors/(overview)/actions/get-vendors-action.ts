'use server';

import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { getVendors } from '../data/queries';
import type { GetVendorsSchema } from '../data/validations';

export async function getVendorsAction(input: GetVendorsSchema) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session.activeOrganizationId) {
    return { data: [], pageCount: 0 };
  }

  return await getVendors(session.session.activeOrganizationId, input);
}


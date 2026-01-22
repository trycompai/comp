'use server';

import { getVendors } from '../data/queries';
import type { GetVendorsSchema } from '../data/validations';

export type GetVendorsActionInput = {
  orgId: string;
  searchParams: GetVendorsSchema;
};

export async function getVendorsAction({ orgId, searchParams }: GetVendorsActionInput) {
  if (!orgId) {
    return { data: [], pageCount: 0 };
  }

  return await getVendors(orgId, searchParams);
}

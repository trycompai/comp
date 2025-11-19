'use server';

import { getVendors } from '../data/queries';
import type { GetVendorsSchema } from '../data/validations';

export async function getVendorsAction(orgId: string, input: GetVendorsSchema) {
  return await getVendors(orgId, input);
}

'use server';

import { getRisks } from '../data/getRisks';
import type { GetRiskSchema } from '../data/validations';

export async function getRisksAction(orgId: string, input: GetRiskSchema) {
  return await getRisks(orgId, input);
}

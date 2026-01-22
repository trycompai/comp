'use server';

import { getRisks } from '../data/getRisks';
import type { GetRiskSchema } from '../data/validations';

type GetRisksActionInput = {
  orgId: string;
  searchParams: GetRiskSchema;
};

export async function getRisksAction({ orgId, searchParams }: GetRisksActionInput) {
  return await getRisks({ orgId, searchParams });
}

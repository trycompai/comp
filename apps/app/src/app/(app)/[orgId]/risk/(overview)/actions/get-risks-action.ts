"use server";

import type { GetRiskSchema } from "../data/validations";
import { getRisks } from "../data/getRisks";

export async function getRisksAction(input: GetRiskSchema) {
  return await getRisks(input);
}

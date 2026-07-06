import { z } from 'zod';

export const UpdateSecurityQuestionnaireSchema = z.object({
  enabled: z.boolean(),
});

export type UpdateSecurityQuestionnaireDto = z.infer<
  typeof UpdateSecurityQuestionnaireSchema
>;

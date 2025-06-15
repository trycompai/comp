import { z } from "zod";
import { Frequency, Departments } from "@prisma/client"; // Assuming enums are available here

export const CreatePolicySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  frequency: z.nativeEnum(Frequency),
  department: z.nativeEnum(Departments),
});

export type CreatePolicySchemaType = z.infer<typeof CreatePolicySchema>;

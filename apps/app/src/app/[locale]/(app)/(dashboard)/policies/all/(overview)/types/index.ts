import { z } from "zod";

export const policySchema = z.object({
  id: z.string(),
  status: z.enum(["draft", "published", "archived"]),
  createdAt: z.date(),
  updatedAt: z.date(),
  policy: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    slug: z.string(),
  }),
});

export const policiesInputSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  ownerId: z.string().optional(),
  sort: z.string().optional(),
  page: z.number().default(1),
  per_page: z.number().default(10),
});

export type Policy = z.infer<typeof policySchema>;
export type PoliciesInput = z.infer<typeof policiesInputSchema>;

export interface PoliciesResponse {
  policies: Policy[];
  total: number;
}

export type AppError = {
  code: "UNAUTHORIZED" | "UNEXPECTED_ERROR";
  message: string;
};

export const appErrors = {
  UNAUTHORIZED: {
    code: "UNAUTHORIZED" as const,
    message: "You are not authorized to view policies",
  },
  UNEXPECTED_ERROR: {
    code: "UNEXPECTED_ERROR" as const,
    message: "An unexpected error occurred",
  },
} as const;

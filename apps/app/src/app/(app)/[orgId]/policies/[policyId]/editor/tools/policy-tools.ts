import { type InferUITools, tool } from 'ai';
import { z } from 'zod';

export function getPolicyTools() {
  return {
    proposePolicy: tool({
      description:
        'Propose an updated version of the policy. Use this tool whenever the user asks you to make changes, edits, or improvements to the policy. You must provide the COMPLETE policy content, not just the changes.',
      inputSchema: z.object({
        content: z
          .string()
          .describe(
            'The complete updated policy content in markdown format. Must include the entire policy, not just the changed sections.',
          ),
        summary: z
          .string()
          .describe('One to two sentences summarizing the changes. No bullet points.'),
        title: z
          .string()
          .describe(
            'A short, sentence-case heading (~4–10 words) that clearly states the main change, for use in a small review banner.',
          ),
        detail: z
          .string()
          .describe(
            'One or two plain-text sentences briefly explaining what changed and why, shown in the review banner.',
          ),
        reviewHint: z
          .string()
          .describe(
            'A very short imperative phrase that tells the user to review the updated policy content in the editor below.',
          ),
      }),
      execute: async ({ summary, title, detail, reviewHint }) => ({
        success: true,
        summary,
        title,
        detail,
        reviewHint,
      }),
    }),
  };
}

export type PolicyToolSet = InferUITools<ReturnType<typeof getPolicyTools>>;

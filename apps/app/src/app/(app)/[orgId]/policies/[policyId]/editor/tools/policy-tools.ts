import { type InferUITools, tool } from 'ai';
import { db } from '@db';
import { z } from 'zod';

interface PolicyToolsOptions {
  organizationId: string;
  currentPolicyId: string;
}

export function getPolicyTools({ organizationId, currentPolicyId }: PolicyToolsOptions) {
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

    listVendors: tool({
      description:
        'List all vendors in the organization. Returns basic info: name, category, status, website. Use getVendor to get full details for a specific vendor.',
      inputSchema: z.object({}),
      execute: async () => {
        const vendors = await db.vendor.findMany({
          where: { organizationId },
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            status: true,
            website: true,
          },
          orderBy: { name: 'asc' },
        });
        return { vendors, count: vendors.length };
      },
    }),

    getVendor: tool({
      description:
        'Get full details for a specific vendor by ID, including contacts, risk assessment, and compliance badges.',
      inputSchema: z.object({
        vendorId: z.string().describe('The vendor ID to look up'),
      }),
      execute: async ({ vendorId }) => {
        const vendor = await db.vendor.findFirst({
          where: { id: vendorId, organizationId },
          include: {
            contacts: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            assignee: {
              select: {
                user: {
                  select: { name: true, email: true },
                },
              },
            },
          },
        });
        if (!vendor) return { error: 'Vendor not found' };
        return { vendor };
      },
    }),

    listPolicies: tool({
      description:
        'List all other policies in the organization. Returns name, description, status, and department. Useful for cross-referencing or ensuring consistency across policies.',
      inputSchema: z.object({}),
      execute: async () => {
        const policies = await db.policy.findMany({
          where: {
            organizationId,
            id: { not: currentPolicyId },
            isArchived: false,
          },
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            department: true,
          },
          orderBy: { name: 'asc' },
        });
        return { policies, count: policies.length };
      },
    }),

    getPolicy: tool({
      description:
        'Get the full content of another policy by ID. Useful for referencing specific policy language or ensuring consistency.',
      inputSchema: z.object({
        policyId: z.string().describe('The policy ID to look up'),
      }),
      execute: async ({ policyId }) => {
        if (policyId === currentPolicyId) {
          return { error: 'This is the current policy. Its content is already in context.' };
        }
        const policy = await db.policy.findFirst({
          where: { id: policyId, organizationId, isArchived: false },
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            department: true,
            content: true,
          },
        });
        if (!policy) return { error: 'Policy not found' };
        return { policy };
      },
    }),

    listEvidence: tool({
      description:
        'List evidence submissions in the organization. Returns form type, status, submission date, and submitter info. Useful for referencing compliance evidence when editing policies.',
      inputSchema: z.object({
        formType: z
          .string()
          .optional()
          .describe(
            'Optional filter by form type: board-meeting, it-leadership-meeting, risk-committee-meeting, meeting, access-request, whistleblower-report, penetration-test, rbac-matrix, infrastructure-inventory, employee-performance-evaluation, network-diagram, tabletop-exercise',
          ),
      }),
      execute: async ({ formType }) => {
        const where: Record<string, unknown> = { organizationId };
        if (formType) {
          where.formType = formType;
        }
        const evidence = await db.evidenceSubmission.findMany({
          where,
          select: {
            id: true,
            formType: true,
            status: true,
            submittedAt: true,
            submittedBy: {
              select: { name: true, email: true },
            },
          },
          orderBy: { submittedAt: 'desc' },
          take: 50,
        });
        return { evidence, count: evidence.length };
      },
    }),
  };
}

export type PolicyToolSet = InferUITools<ReturnType<typeof getPolicyTools>>;

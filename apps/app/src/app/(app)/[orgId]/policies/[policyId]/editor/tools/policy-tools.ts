import { env } from '@/env.mjs';
import { type InferUITools, tool } from 'ai';
import { z } from 'zod';

interface PolicyToolsOptions {
  currentPolicyId: string;
  cookieHeader: string;
}

/**
 * Make an authenticated API call to the NestJS backend,
 * forwarding the user's session cookies for RBAC enforcement.
 */
async function apiCall<T = unknown>({
  endpoint,
  cookieHeader,
}: {
  endpoint: string;
  cookieHeader: string;
}): Promise<T> {
  const baseUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

export function getPolicyTools({ currentPolicyId, cookieHeader }: PolicyToolsOptions) {
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
        const result = await apiCall<{ data: Array<Record<string, unknown>>; count: number }>({
          endpoint: '/v1/vendors',
          cookieHeader,
        });
        return { vendors: result.data, count: result.count };
      },
    }),

    getVendor: tool({
      description:
        'Get full details for a specific vendor by ID, including contacts, risk assessment, and compliance badges.',
      inputSchema: z.object({
        vendorId: z.string().describe('The vendor ID to look up'),
      }),
      execute: async ({ vendorId }) => {
        try {
          const vendor = await apiCall<Record<string, unknown>>({
            endpoint: `/v1/vendors/${vendorId}`,
            cookieHeader,
          });
          return { vendor };
        } catch {
          return { error: 'Vendor not found' };
        }
      },
    }),

    listPolicies: tool({
      description:
        'List all other policies in the organization. Returns name, description, status, and department. Useful for cross-referencing or ensuring consistency across policies.',
      inputSchema: z.object({}),
      execute: async () => {
        const result = await apiCall<{ data: Array<Record<string, unknown>>; count: number }>({
          endpoint: '/v1/policies',
          cookieHeader,
        });
        // Filter out the current policy
        const filtered = result.data.filter(
          (p) => p.id !== currentPolicyId,
        );
        return { policies: filtered, count: filtered.length };
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
        try {
          const policy = await apiCall<Record<string, unknown>>({
            endpoint: `/v1/policies/${policyId}`,
            cookieHeader,
          });
          return { policy };
        } catch {
          return { error: 'Policy not found' };
        }
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
        const params = formType ? `?formType=${formType}` : '';
        const result = await apiCall<{ data: Array<Record<string, unknown>>; count: number }>({
          endpoint: `/v1/evidence${params}`,
          cookieHeader,
        });
        return { evidence: result.data, count: result.count };
      },
    }),
  };
}

export type PolicyToolSet = InferUITools<ReturnType<typeof getPolicyTools>>;

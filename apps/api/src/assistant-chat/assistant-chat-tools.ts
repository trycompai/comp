import { db, Departments, RiskCategory, RiskStatus } from '@db';
import { z } from 'zod';

type Permissions = Record<string, string[]>;

interface ToolContext {
  organizationId: string;
  userId: string;
  permissions: Permissions;
}

function hasPermission(
  permissions: Permissions,
  resource: string,
  action: string,
): boolean {
  return permissions[resource]?.includes(action) ?? false;
}

export function buildTools(ctx: ToolContext) {
  const tools: Record<
    string,
    {
      description: string;
      inputSchema: z.ZodType;
      execute: (...args: any[]) => Promise<unknown>;
    }
  > = {};

  // Always available
  tools.findOrganization = {
    description: "Find the user's organization and its details",
    inputSchema: z.object({}),
    execute: async () => {
      const org = await db.organization.findUnique({
        where: { id: ctx.organizationId },
        select: { name: true },
      });
      return org
        ? { organization: org }
        : { organization: null, message: 'Organization not found' };
    },
  };

  tools.getUser = {
    description: "Get the user's id and organization id",
    inputSchema: z.object({}),
    execute: async () => ({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
    }),
  };

  // Policy tools — require policy:read
  if (hasPermission(ctx.permissions, 'policy', 'read')) {
    tools.getPolicies = {
      description: 'Get all policies for the organization',
      inputSchema: z.object({
        status: z.enum(['draft', 'published']).optional(),
      }),
      execute: async ({ status }: { status?: 'draft' | 'published' }) => {
        const policies = await db.policy.findMany({
          where: { organizationId: ctx.organizationId, status },
          select: { id: true, name: true, description: true, department: true },
        });
        return policies.length === 0
          ? { policies: [], message: 'No policies found' }
          : { policies };
      },
    };

    tools.getPolicyContent = {
      description:
        'Get the content of a specific policy by id. Run getPolicies first to get ids.',
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }: { id: string }) => {
        const policy = await db.policy.findUnique({
          where: { id, organizationId: ctx.organizationId },
          select: { content: true },
        });
        return policy
          ? { content: policy.content }
          : { content: null, message: 'Policy not found' };
      },
    };
  }

  // Risk tools — require risk:read
  if (hasPermission(ctx.permissions, 'risk', 'read')) {
    tools.getRisks = {
      description: 'Get risks for the organization',
      inputSchema: z.object({
        status: z
          .enum(Object.values(RiskStatus) as [RiskStatus, ...RiskStatus[]])
          .optional(),
        department: z
          .enum(Object.values(Departments) as [Departments, ...Departments[]])
          .optional(),
        category: z
          .enum(
            Object.values(RiskCategory) as [RiskCategory, ...RiskCategory[]],
          )
          .optional(),
        owner: z.string().optional(),
      }),
      execute: async (input: {
        status?: RiskStatus;
        department?: Departments;
        category?: RiskCategory;
        owner?: string;
      }) => {
        const risks = await db.risk.findMany({
          where: {
            organizationId: ctx.organizationId,
            status: input.status,
            department: input.department,
            category: input.category,
            assigneeId: input.owner,
          },
          select: { id: true, title: true, status: true },
        });
        return risks.length === 0
          ? { risks: [], message: 'No risks found' }
          : { risks };
      },
    };

    tools.getRiskById = {
      description: 'Get a risk by id',
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }: { id: string }) => {
        const risk = await db.risk.findUnique({
          where: { id, organizationId: ctx.organizationId },
        });
        return risk ? { risk } : { risk: null, message: 'Risk not found' };
      },
    };
  }

  return tools;
}

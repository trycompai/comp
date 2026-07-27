import { db } from '@db';
import type { Prisma } from '@db';
import type { IsmsTeamSizeBand, OperationalOwnershipRow } from './types';
import { teamSizeBand } from './roles';

/**
 * Extra data the Roles document (5.3) needs at export time but that isn't on the
 * document's own rows: display names for assigned members (assignments store a
 * plain memberId, no FK), the live per-artifact operational owners, and the
 * team-size band. Resolved once and frozen into the version snapshot so a
 * historical export re-renders byte-faithfully.
 */
export interface RolesExtras {
  /** memberId → display name (name, else email, else a placeholder). */
  memberNames: Record<string, string>;
  operationalOwnership: OperationalOwnershipRow[];
  band: IsmsTeamSizeBand;
}

type Client = Prisma.TransactionClient | typeof db;

const OWNER_DISPLAY_CAP = 12;

type NamedAssignee = {
  assignee: { user: { name: string | null; email: string | null } | null } | null;
};

function memberDisplayName(user: { name: string | null; email: string | null } | null): string {
  return user?.name?.trim() || user?.email?.trim() || 'Unknown member';
}

function dedupeOwners(rows: NamedAssignee[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const row of rows) {
    if (!row.assignee?.user) continue;
    const name = memberDisplayName(row.assignee.user);
    if (seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  names.sort((a, b) => a.localeCompare(b));
  if (names.length <= OWNER_DISPLAY_CAP) return names;
  return [
    ...names.slice(0, OWNER_DISPLAY_CAP),
    `and ${names.length - OWNER_DISPLAY_CAP} more`,
  ];
}

/** Load the Roles document's export extras for an organization. */
export async function loadRolesExtras({
  organizationId,
  client,
}: {
  organizationId: string;
  client?: Client;
}): Promise<RolesExtras> {
  const prisma = client ?? db;
  const assigneeSelect = {
    assignee: { select: { user: { select: { name: true, email: true } } } },
  } as const;

  const [members, memberCount, policies, risks, tasks, vendors] =
    await Promise.all([
      prisma.member.findMany({
        where: { organizationId },
        select: { id: true, user: { select: { name: true, email: true } } },
      }),
      prisma.member.count({ where: { organizationId, deactivated: false } }),
      prisma.policy.findMany({
        where: { organizationId, assigneeId: { not: null } },
        select: assigneeSelect,
      }),
      prisma.risk.findMany({
        where: { organizationId, assigneeId: { not: null } },
        select: assigneeSelect,
      }),
      prisma.task.findMany({
        where: { organizationId, assigneeId: { not: null } },
        select: assigneeSelect,
      }),
      prisma.vendor.findMany({
        where: { organizationId, assigneeId: { not: null } },
        select: assigneeSelect,
      }),
    ]);

  const memberNames: Record<string, string> = {};
  for (const member of members) {
    memberNames[member.id] = memberDisplayName(member.user);
  }

  // Controls have no owner field in the platform; their ownership is descriptive
  // (assigned per control via their linked tasks). Kept in the matrix per the
  // reference document, without enumerating names.
  const operationalOwnership: OperationalOwnershipRow[] = [
    {
      artifact: 'Policies',
      assignedWhere: 'Policy assignee / approver in Comp AI',
      ownerResponsibility:
        'Keep the policy current and accurate; ensure required acknowledgement.',
      owners: dedupeOwners(policies),
    },
    {
      artifact: 'Controls',
      assignedWhere: 'Control owner in Comp AI',
      ownerResponsibility: 'Implement, operate, and evidence the control.',
      owners: [],
    },
    {
      artifact: 'Risks',
      assignedWhere: 'Risk owner in Comp AI',
      ownerResponsibility:
        'Assess, treat, and monitor the risk within the risk appetite.',
      owners: dedupeOwners(risks),
    },
    {
      artifact: 'Evidence tasks',
      assignedWhere: 'Task assignee in Comp AI',
      ownerResponsibility: 'Complete and evidence the task by its due date.',
      owners: dedupeOwners(tasks),
    },
    {
      artifact: 'Vendors / sub-processors',
      assignedWhere: 'Vendor owner in Comp AI',
      ownerResponsibility:
        'Perform due diligence and ongoing security review; maintain the DPA.',
      owners: dedupeOwners(vendors),
    },
  ];

  return {
    memberNames,
    operationalOwnership,
    band: teamSizeBand(memberCount),
  };
}

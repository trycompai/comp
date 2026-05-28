import { ForbiddenException, Injectable } from '@nestjs/common';
import { db } from '@db';
import { hasAppAccess } from '../auth/app-access';

@Injectable()
export class McpService {
  /**
   * The organizations the user can choose from for MCP access, plus their
   * current selection (null when unset or no longer valid). Only orgs where the
   * user's role grants app access are offered — picking one without it wouldn't
   * work (the MCP guard would reject it).
   */
  async getOrganizationSelection(userId: string) {
    const memberships = await db.member.findMany({
      where: { userId, deactivated: false },
      select: { role: true, organization: { select: { id: true, name: true } } },
    });

    const organizations: Array<{ id: string; name: string }> = [];
    for (const membership of memberships) {
      if (await hasAppAccess(membership.organization.id, membership.role)) {
        organizations.push({
          id: membership.organization.id,
          name: membership.organization.name,
        });
      }
    }

    const binding = await db.mcpOrgBinding.findUnique({
      where: { userId },
      select: { organizationId: true },
    });
    // Drop a stale selection if the user is no longer a member of that org.
    const selectedOrganizationId =
      binding && organizations.some((o) => o.id === binding.organizationId)
        ? binding.organizationId
        : null;

    return { organizations, selectedOrganizationId };
  }

  /**
   * Set which organization the user's MCP/OAuth token acts on. Validates that
   * the user is an active member of the chosen org before saving.
   */
  async setOrganization(userId: string, organizationId: string) {
    const member = await db.member.findFirst({
      where: { userId, organizationId, deactivated: false },
      select: { role: true },
    });
    if (!member) {
      throw new ForbiddenException(
        'You are not a member of the selected organization.',
      );
    }
    if (!(await hasAppAccess(organizationId, member.role))) {
      throw new ForbiddenException(
        "Your role in that organization doesn't have app access, so it can't be used for the MCP.",
      );
    }

    await db.mcpOrgBinding.upsert({
      where: { userId },
      create: { userId, organizationId },
      update: { organizationId },
    });

    return { organizationId };
  }
}

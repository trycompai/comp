import { ForbiddenException, Injectable } from '@nestjs/common';
import { db } from '@db';

@Injectable()
export class McpService {
  /**
   * The organizations the user can choose from for MCP access, plus their
   * current selection (null when unset or no longer valid).
   */
  async getOrganizationSelection(userId: string) {
    const memberships = await db.member.findMany({
      where: { userId, deactivated: false },
      select: { organization: { select: { id: true, name: true } } },
    });
    const organizations = memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
    }));

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
      select: { id: true },
    });
    if (!member) {
      throw new ForbiddenException(
        'You are not a member of the selected organization.',
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

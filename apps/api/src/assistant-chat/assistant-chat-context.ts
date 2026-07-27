import {
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { db } from '@db';
import type { Request } from 'express';
import type { AuthContext as AuthContextType } from '../auth/types';
import type { RolesService } from '../roles/roles.service';

export interface AssistantChatContext {
  organizationId: string;
  userId: string;
  permissions: Record<string, string[]>;
}

function readRequestedOrgId(req: Request): string | undefined {
  const raw = req.headers['x-organization-id'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

/**
 * Resolve the organization the assistant chat is operating in.
 *
 * The chat scopes its (per-org, per-user) storage by the org the client is
 * actually viewing — sent via `X-Organization-Id` — NOT the session's ambient
 * `activeOrganizationId`. The active org can lag the URL for multi-org users,
 * which previously let one org's chat be read/written under another org's key.
 *
 * When the requested org is absent or matches the session's active org, the
 * guards (HybridAuthGuard + PermissionGuard) already verified membership and
 * app access. When it differs, re-verify active membership AND app access here
 * before scoping any chat data to it.
 */
export async function resolveAssistantChatContext({
  auth,
  req,
  rolesService,
  logger,
}: {
  auth: AuthContextType;
  req: Request;
  rolesService: Pick<RolesService, 'resolvePermissions'>;
  logger: Logger;
}): Promise<AssistantChatContext> {
  const userId = auth.userId;
  if (!userId) {
    throw new BadRequestException('User ID is required');
  }

  const requested = readRequestedOrgId(req);

  if (!requested || requested === auth.organizationId) {
    if (!auth.organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    const permissions = await rolesService.resolvePermissions(
      auth.organizationId,
      auth.userRoles ?? [],
    );
    return { organizationId: auth.organizationId, userId, permissions };
  }

  const member = await db.member.findFirst({
    where: { userId, organizationId: requested, deactivated: false },
    select: { role: true },
  });
  if (!member) {
    throw new ForbiddenException(
      'You are not a member of the requested organization.',
    );
  }

  const permissions = await rolesService.resolvePermissions(
    requested,
    member.role ? member.role.split(',') : [],
  );
  if (!permissions.app?.includes('read')) {
    throw new ForbiddenException(
      'Your role does not have app access in the requested organization.',
    );
  }

  logger.log(
    `Assistant chat scoped to requested org ${requested} ` +
      `(session active org: ${auth.organizationId}) for user ${userId}`,
  );
  return { organizationId: requested, userId, permissions };
}

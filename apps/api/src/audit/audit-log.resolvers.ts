import { db } from '@db';
import { RESOURCE_TO_PRISMA_MODEL } from './audit-log.constants';
import type { ChangesRecord, RelationMappingResult } from './audit-log.utils';

export async function resolveMemberNames(
  memberIds: string[],
): Promise<Record<string, string>> {
  if (memberIds.length === 0) return {};
  try {
    const members = await db.member.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, user: { select: { name: true } } },
    });
    const map: Record<string, string> = {};
    for (const m of members) {
      map[m.id] = m.user?.name || m.id;
    }
    return map;
  } catch {
    return {};
  }
}

async function resolveControlNames(
  controlIds: string[],
): Promise<Record<string, string>> {
  if (controlIds.length === 0) return {};
  try {
    const controls = await db.control.findMany({
      where: { id: { in: controlIds } },
      select: { id: true, name: true },
    });
    const map: Record<string, string> = {};
    for (const c of controls) {
      map[c.id] = c.name ? `${c.name} (${c.id})` : c.id;
    }
    return map;
  } catch {
    return {};
  }
}

async function fetchControlIds(parentId: string): Promise<string[]> {
  try {
    const policy = await db.policy.findUnique({
      where: { id: parentId },
      select: { controls: { select: { id: true } } },
    });
    return policy?.controls?.map((c: { id: string }) => c.id) ?? [];
  } catch {
    return [];
  }
}

export async function buildRelationMappingChanges(
  path: string,
  method: string,
  requestBody: Record<string, unknown> | undefined,
  entityId: string | undefined,
): Promise<RelationMappingResult | null> {
  // POST /v1/<resource>/:id/controls — mapping new controls
  const mappingMatch = path.match(/\/v1\/\w+\/[^/]+\/controls\/?$/);
  if (
    mappingMatch &&
    method === 'POST' &&
    requestBody?.controlIds &&
    entityId
  ) {
    const newIds = requestBody.controlIds as string[];
    const currentIds = await fetchControlIds(entityId);
    const allIds = [...new Set([...currentIds, ...newIds])];
    const nameMap = await resolveControlNames(allIds);

    const prevDisplay =
      currentIds.length > 0
        ? currentIds.map((id) => nameMap[id] || id).join(', ')
        : 'None';
    const afterIds = [...new Set([...currentIds, ...newIds])];
    const afterDisplay = afterIds.map((id) => nameMap[id] || id).join(', ');

    return {
      changes: { controls: { previous: prevDisplay, current: afterDisplay } },
      description: 'Mapped controls to policy',
    };
  }

  // DELETE /v1/<resource>/:id/controls/:controlId — unmapping
  const unmapMatch = path.match(
    /\/v1\/\w+\/([^/]+)\/controls\/([^/]+)\/?$/,
  );
  if (unmapMatch && method === 'DELETE') {
    const parentId = unmapMatch[1];
    const removedControlId = unmapMatch[2];
    const currentIds = await fetchControlIds(parentId);

    const allIds = [...new Set([...currentIds, removedControlId])];
    const nameMap = await resolveControlNames(allIds);

    const prevDisplay =
      currentIds.length > 0
        ? currentIds.map((id) => nameMap[id] || id).join(', ')
        : 'None';
    const afterIds = currentIds.filter((id) => id !== removedControlId);
    const afterDisplay =
      afterIds.length > 0
        ? afterIds.map((id) => nameMap[id] || id).join(', ')
        : 'None';

    return {
      changes: { controls: { previous: prevDisplay, current: afterDisplay } },
      description: 'Unmapped control from policy',
    };
  }

  return null;
}

export async function fetchCurrentValues(
  resource: string,
  entityId: string,
  fieldNames: string[],
): Promise<Record<string, unknown> | null> {
  const modelName = RESOURCE_TO_PRISMA_MODEL[resource];
  if (!modelName) return null;

  const model = (db as any)[modelName];
  if (!model?.findUnique) return null;

  const select: Record<string, boolean> = {};
  for (const field of fieldNames) {
    select[field] = true;
  }

  try {
    return await model.findUnique({ where: { id: entityId }, select });
  } catch {
    return null;
  }
}

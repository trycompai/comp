import { db } from '@db';
import type { IsmsDocumentType } from '@db';
import { ISMS_TYPE_DEFINITIONS, matchRequirementId } from './document-types';

export interface IsmsDocumentPlan {
  type: IsmsDocumentType;
  title: string;
  requirementId: string | null;
  templateId: string | null;
  controlTemplateIds: string[];
}

/**
 * Build one create-plan per ISMS document type. Template-driven when the
 * FrameworkEditorIsmsDocumentTemplate rows are seeded; the requirement comes
 * from the framework-scoped link if present, otherwise from clause matching.
 * Types with no template row fall back to ISMS_TYPE_DEFINITIONS — so unseeded
 * DBs still work, and a newly-shipped type (e.g. monitoring, CS-723) provisions
 * even before the template seed has been re-run. Fallback plans carry a null
 * templateId and no control links.
 */
export async function resolveDocumentPlans({
  frameworkId,
  requirements,
}: {
  frameworkId: string;
  requirements: Array<{ id: string; name: string; identifier: string }>;
}): Promise<IsmsDocumentPlan[]> {
  const templates = await db.frameworkEditorIsmsDocumentTemplate.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      // Order so requirementLinks[0] is a deterministic pick across runs.
      requirementLinks: {
        where: { frameworkId },
        orderBy: [{ requirementId: 'asc' }, { id: 'asc' }],
      },
      controlLinks: {
        where: { frameworkId },
        select: { controlTemplateId: true },
      },
    },
  });

  const templatePlans: IsmsDocumentPlan[] = templates.map((template) => ({
    type: template.documentType,
    title: template.name,
    templateId: template.id,
    controlTemplateIds: template.controlLinks.map(
      (link) => link.controlTemplateId,
    ),
    requirementId:
      template.requirementLinks[0]?.requirementId ??
      matchRequirementId({ clause: template.clause, requirements }),
  }));

  const templatedTypes = new Set(templatePlans.map((plan) => plan.type));
  const fallbackPlans: IsmsDocumentPlan[] = ISMS_TYPE_DEFINITIONS.filter(
    (def) => !templatedTypes.has(def.type),
  ).map((def) => ({
    type: def.type,
    title: def.title,
    templateId: null,
    controlTemplateIds: [],
    requirementId: matchRequirementId({ clause: def.clause, requirements }),
  }));

  return [...templatePlans, ...fallbackPlans];
}

/**
 * Best-effort: turn a template's framework-scoped control template links into
 * org-level IsmsDocumentControlLink rows by resolving the org's Controls that
 * were instantiated from those control templates. Idempotent (skipDuplicates)
 * and silent when nothing resolves, so re-runs preserve existing links.
 */
export async function deriveControlLinks({
  documentId,
  organizationId,
  controlTemplateIds,
}: {
  documentId: string;
  organizationId: string;
  controlTemplateIds: string[];
}): Promise<void> {
  if (controlTemplateIds.length === 0) return;

  const controls = await db.control.findMany({
    where: { organizationId, controlTemplateId: { in: controlTemplateIds } },
    select: { id: true },
  });
  if (controls.length === 0) return;

  await db.ismsDocumentControlLink.createMany({
    data: controls.map((control) => ({
      ismsDocumentId: documentId,
      controlId: control.id,
    })),
    skipDuplicates: true,
  });
}

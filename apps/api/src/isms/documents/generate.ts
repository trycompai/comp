import { BadRequestException } from '@nestjs/common';
import type { IsmsDocumentType, Prisma } from '@db';
import { deriveContextOfOrganization } from './context';
import { deriveInterestedParties } from './interested-parties';
import { deriveRequirements } from './requirements';
import { deriveObjectives } from './objectives';
import { seedRolesIfMissing } from './roles';
import { deriveNarrativeForType, isNarrativeType } from './registry';
import type { IsmsPlatformData } from './types';

type Tx = Prisma.TransactionClient;

/**
 * Replace the derived rows of a register, preserving manual rows and appending the
 * derived rows after them (same pattern as the 4.1 context register).
 */
async function replaceDerivedRows<T>({
  derived,
  deleteDerived,
  countManual,
  createMany,
}: {
  derived: T[];
  deleteDerived: () => Promise<unknown>;
  countManual: () => Promise<number>;
  createMany: (args: { rows: T[]; manualCount: number }) => Promise<unknown>;
}): Promise<void> {
  await deleteDerived();
  const manualCount = await countManual();
  if (derived.length > 0) {
    await createMany({ rows: derived, manualCount });
  }
}

async function generateInterestedParties({
  tx,
  documentId,
  data,
}: {
  tx: Tx;
  documentId: string;
  data: IsmsPlatformData;
}): Promise<void> {
  const derived = deriveInterestedParties(data);
  await replaceDerivedRows({
    derived,
    deleteDerived: () =>
      tx.ismsInterestedParty.deleteMany({
        where: { documentId, source: 'derived' },
      }),
    countManual: () =>
      tx.ismsInterestedParty.count({ where: { documentId, source: 'manual' } }),
    createMany: ({ rows, manualCount }) =>
      tx.ismsInterestedParty.createMany({
        data: rows.map((row, index) => ({
          documentId,
          name: row.name,
          category: row.category,
          needsExpectations: row.needsExpectations,
          source: row.source,
          derivedFrom: row.derivedFrom,
          position: manualCount + index,
        })),
      }),
  });
}

async function generateRequirements({
  tx,
  documentId,
  organizationId,
  frameworkId,
  data,
}: {
  tx: Tx;
  documentId: string;
  organizationId: string;
  frameworkId: string;
  data: IsmsPlatformData;
}): Promise<void> {
  const registerDoc = await tx.ismsDocument.findFirst({
    where: { organizationId, frameworkId, type: 'interested_parties_register' },
    select: { id: true },
  });
  const parties = registerDoc
    ? await tx.ismsInterestedParty.findMany({
        where: { documentId: registerDoc.id },
        orderBy: { position: 'asc' },
        select: { id: true, name: true, category: true },
      })
    : [];

  const derived = deriveRequirements({ parties, data });
  await replaceDerivedRows({
    derived,
    deleteDerived: () =>
      tx.ismsInterestedPartyRequirement.deleteMany({
        where: { documentId, source: 'derived' },
      }),
    countManual: () =>
      tx.ismsInterestedPartyRequirement.count({
        where: { documentId, source: 'manual' },
      }),
    createMany: ({ rows, manualCount }) =>
      tx.ismsInterestedPartyRequirement.createMany({
        data: rows.map((row, index) => ({
          documentId,
          interestedPartyId: row.interestedPartyId,
          partyName: row.partyName,
          requirement: row.requirement,
          treatment: row.treatment,
          source: row.source,
          derivedFrom: row.derivedFrom,
          position: manualCount + index,
        })),
      }),
  });
}

async function generateObjectives({
  tx,
  documentId,
  data,
}: {
  tx: Tx;
  documentId: string;
  data: IsmsPlatformData;
}): Promise<void> {
  const derived = deriveObjectives(data);
  await replaceDerivedRows({
    derived,
    deleteDerived: () =>
      tx.ismsObjective.deleteMany({ where: { documentId, source: 'derived' } }),
    countManual: () =>
      tx.ismsObjective.count({ where: { documentId, source: 'manual' } }),
    createMany: ({ rows, manualCount }) =>
      tx.ismsObjective.createMany({
        data: rows.map((row, index) => ({
          documentId,
          objective: row.objective,
          target: row.target,
          cadence: row.cadence,
          plan: row.plan,
          measurementMethod: row.measurementMethod,
          source: row.source,
          derivedFrom: row.derivedFrom,
          position: manualCount + index,
        })),
      }),
  });
}

/** True when a stored narrative actually holds content (not null/undefined or {}). */
function hasNarrativeContent(narrative: unknown): boolean {
  return (
    narrative != null &&
    typeof narrative === 'object' &&
    !Array.isArray(narrative) &&
    Object.keys(narrative).length > 0
  );
}

async function generateNarrative({
  tx,
  documentId,
  type,
  data,
}: {
  tx: Tx;
  documentId: string;
  type: IsmsDocumentType;
  data: IsmsPlatformData;
}): Promise<void> {
  const derived = deriveNarrativeForType({ type, data });
  if (!derived) return;
  const narrative: Prisma.InputJsonValue = JSON.parse(JSON.stringify(derived));

  // The draft narrative lives on IsmsDocument (CS-701). Preserve a non-empty
  // existing draft so a regenerate never clobbers the customer's manual edits
  // (CS-437 override); seed an absent/empty draft with the derived narrative.
  const document = await tx.ismsDocument.findUnique({
    where: { id: documentId },
    select: { draftNarrative: true },
  });
  if (document && hasNarrativeContent(document.draftNarrative)) return;
  await tx.ismsDocument.update({
    where: { id: documentId },
    data: { draftNarrative: narrative },
  });
}

/** Run the type-specific derivation inside an open transaction. */
export async function runDerivation({
  tx,
  type,
  documentId,
  organizationId,
  frameworkId,
  data,
}: {
  tx: Tx;
  type: IsmsDocumentType;
  documentId: string;
  organizationId: string;
  frameworkId: string;
  data: IsmsPlatformData;
}): Promise<void> {
  if (type === 'context_of_organization') {
    const derived = deriveContextOfOrganization(data);
    await replaceDerivedRows({
      derived,
      deleteDerived: () =>
        tx.ismsContextIssue.deleteMany({
          where: { documentId, source: 'derived' },
        }),
      countManual: () =>
        tx.ismsContextIssue.count({ where: { documentId, source: 'manual' } }),
      createMany: ({ rows, manualCount }) =>
        tx.ismsContextIssue.createMany({
          data: rows.map((row, index) => ({
            documentId,
            kind: row.kind,
            category: row.category,
            description: row.description,
            effect: row.effect,
            source: row.source,
            derivedFrom: row.derivedFrom,
            position: manualCount + index,
          })),
        }),
    });
    return;
  }
  if (type === 'interested_parties_register') {
    await generateInterestedParties({ tx, documentId, data });
    return;
  }
  if (type === 'interested_parties_requirements') {
    await generateRequirements({
      tx,
      documentId,
      organizationId,
      frameworkId,
      data,
    });
    return;
  }
  if (type === 'objectives_plan') {
    await generateObjectives({ tx, documentId, data });
    return;
  }
  if (type === 'roles_and_responsibilities') {
    // Idempotent seed only — never a destructive replace, so member assignments
    // (IsmsRoleAssignment) and customer edits survive every regenerate.
    await seedRolesIfMissing({ tx, documentId, memberCount: data.memberCount });
    return;
  }
  if (isNarrativeType(type)) {
    await generateNarrative({ tx, documentId, type, data });
    return;
  }
  throw new BadRequestException(`Generation not implemented for type ${type}`);
}

import type { Prisma } from '@db';
import type { IsmsExportSection } from '../utils/export-shared';
import type {
  DocumentExportInput,
  IsmsTeamSizeBand,
  OperationalOwnershipRow,
  RoleExportRow,
} from './types';
import {
  APPLICATION_ACCESS_LEVELS,
  APPLICATION_ACCESS_NOTE,
  AUTO_DOC_ROLE_ROWS,
  SEED_ROLE_DEFINITIONS,
  SEED_ROLE_KEYS,
} from './roles-defaults';

type Tx = Prisma.TransactionClient;

/** 1-3 people → 'small', 4+ → 'standard'. Drives the Roles document's copy/defaults. */
export function teamSizeBand(memberCount: number): IsmsTeamSizeBand {
  return memberCount <= 3 ? 'small' : 'standard';
}

/** Seeded roles that must be present + assigned before the 5.3 doc can be published. */
const REQUIRED_SEED_ROLE_KEYS = SEED_ROLE_DEFINITIONS.map((role) => role.roleKey);

/** The subset of role fields the completeness check needs (server + client share it). */
export interface RoleValidationRow {
  roleKey: string | null;
  name: string;
  auditRoute: string | null;
  auditRouteMemberId?: string | null;
  auditFirmName?: string | null;
  auditEvidenceRef?: string | null;
  auditCourse?: string | null;
  auditDueDate?: Date | string | null;
  assignments: unknown[];
}

/** Route-specific required fields for the Internal Auditor (CS-698). */
function auditRouteMessages(role: RoleValidationRow): string[] {
  const route = role.auditRoute;
  if (!route) return ['The Internal Auditor needs an audit route selected.'];
  if (route === 'in_house' && !role.auditRouteMemberId) {
    return ['The in-house Internal Auditor needs a member selected.'];
  }
  if (route === 'external' && (!role.auditFirmName || !role.auditEvidenceRef)) {
    return [
      'The external Internal Auditor needs a firm/person name and an evidence reference.',
    ];
  }
  if (
    route === 'training_planned' &&
    (!role.auditRouteMemberId || !role.auditCourse || !role.auditDueDate)
  ) {
    return [
      'The training-planned Internal Auditor needs a member, a course, and a due date.',
    ];
  }
  return [];
}

/**
 * Clause-5.3 completeness check, shared by the submit-for-approval server gate.
 * Every seeded role must exist and have at least one assigned member (except the
 * Deputy SPO in the 1-3 band); the Internal Auditor must have a route AND the
 * route-specific fields it requires. Missing rows are reported too, so validation
 * can't pass by a required role simply being absent. Callers pass assignments
 * pre-filtered to ACTIVE members. Returns the unmet requirements; empty = ready.
 */
export function roleValidationMessages({
  roles,
  memberCount,
}: {
  roles: RoleValidationRow[];
  memberCount: number;
}): string[] {
  const band = teamSizeBand(memberCount);
  const byKey = new Map(
    roles
      .filter((role) => role.roleKey)
      .map((role) => [role.roleKey as string, role]),
  );
  const messages: string[] = [];
  for (const key of REQUIRED_SEED_ROLE_KEYS) {
    const role = byKey.get(key);
    const name =
      role?.name ??
      SEED_ROLE_DEFINITIONS.find((seed) => seed.roleKey === key)?.name ??
      key;
    const optional = key === 'deputy_spo' && band === 'small';
    if (!role) {
      if (!optional) messages.push(`${name} is missing from the document.`);
      continue;
    }
    if (!optional && role.assignments.length === 0) {
      messages.push(`${name} needs at least one assigned member.`);
    }
    if (key === 'internal_auditor') {
      messages.push(...auditRouteMessages(role));
    }
  }
  return messages;
}

/**
 * Seed the four governance roles for a Roles document, idempotently by `roleKey`.
 * Only creates seed roles that are missing — it NEVER deletes or overwrites, so a
 * regenerate can never clobber the customer's edits or member assignments (unlike
 * the derived-row replace used by the other registers, which would cascade-delete
 * IsmsRoleAssignment rows). Safe to call at document creation and on every generate.
 *
 * The Internal Auditor route defaults to `external` for small teams (1-3), the
 * standard route at that size; larger teams choose their own route.
 */
export async function seedRolesIfMissing({
  tx,
  documentId,
  memberCount,
}: {
  tx: Tx;
  documentId: string;
  memberCount: number;
}): Promise<void> {
  const existing = await tx.ismsRole.findMany({
    where: { documentId },
    select: { roleKey: true, position: true },
  });
  const existingKeys = new Set(
    existing.map((role) => role.roleKey).filter((key): key is string => !!key),
  );
  const missing = SEED_ROLE_DEFINITIONS.filter(
    (role) => !existingKeys.has(role.roleKey),
  );
  if (missing.length === 0) return;

  const maxPosition = existing.reduce(
    (max, role) => Math.max(max, role.position),
    -1,
  );
  const band = teamSizeBand(memberCount);

  await tx.ismsRole.createMany({
    data: missing.map((role, index) => ({
      documentId,
      roleKey: role.roleKey,
      name: role.name,
      description: role.description,
      responsibilities: role.responsibilities,
      authorities: role.authorities,
      authorityGrantedBy: role.authorityGrantedBy,
      requiredCompetence: role.requiredCompetence,
      auditRoute:
        role.roleKey === 'internal_auditor' && band === 'small'
          ? 'external'
          : null,
      source: 'derived',
      derivedFrom: `seed:${role.roleKey}`,
      position: maxPosition + 1 + index,
    })),
    // Belt-and-braces with the @@unique([documentId, roleKey]) constraint: a
    // concurrent provision/generate that races this seed is absorbed silently
    // instead of throwing, so parallel first-loads can't double-seed.
    skipDuplicates: true,
  });
}

// ---- Export section builder -------------------------------------------------

function holderText(holders: string[]): string {
  return holders.length > 0 ? holders.join(', ') : '[To be named]';
}

/** Combine the authority text and its source into the reference doc's column. */
function authorityText(role: RoleExportRow): string {
  const granted = role.authorityGrantedBy.trim();
  if (!granted) return role.authorities;
  return `${role.authorities} Authority granted by ${granted}.`;
}

function internalAuditParagraph(role: RoleExportRow | undefined): string {
  if (!role || !role.auditRoute) {
    return 'The internal audit route has not yet been selected.';
  }
  if (role.auditRoute === 'in_house') {
    const who = role.auditRouteHolderName
      ? `, performed by ${role.auditRouteHolderName}`
      : '';
    return `The organisation conducts its internal ISMS audit in-house${who}. The internal auditor maintains independence and impartiality from the areas they audit.`;
  }
  if (role.auditRoute === 'external') {
    const firm = role.auditFirmName ? `: ${role.auditFirmName}` : '';
    const evidence = role.auditEvidenceRef
      ? ` Supporting evidence: ${role.auditEvidenceRef}.`
      : '';
    return `The organisation engages an external independent auditor to conduct its internal ISMS audit${firm}.${evidence}`;
  }
  // training_planned
  const who = role.auditRouteHolderName ? ` by ${role.auditRouteHolderName}` : '';
  const course = role.auditCourse ? ` through ${role.auditCourse}` : '';
  const due = role.auditDueDate ? `, due ${role.auditDueDate}` : '';
  return `Internal audit competence is being developed${who}${course}${due}. Until it is in place, an external independent auditor is the recommended interim route.`;
}

function buildRoleTable(roles: RoleExportRow[]): IsmsExportSection['table'] {
  // Per CS-698 the governance table is exactly the four seeded roles + the two
  // auto-generated rows. Custom roles are managed on the page but are not part of
  // this standardized Clause 5.3 table, so they're excluded here.
  const seededRoles = roles.filter(
    (role) => role.roleKey !== null && SEED_ROLE_KEYS.includes(role.roleKey),
  );
  return {
    headers: ['Role', 'Holder', 'Responsibility', 'Authority — and granted by'],
    rows: [
      ...seededRoles.map((role) => [
        role.name,
        holderText(role.holders),
        role.responsibilities,
        authorityText(role),
      ]),
      ...AUTO_DOC_ROLE_ROWS.map((row) => [
        row.name,
        row.holders,
        row.responsibilities,
        row.authority,
      ]),
    ],
  };
}

function buildOperationalSection(
  ownership: OperationalOwnershipRow[],
  band: IsmsTeamSizeBand,
): IsmsExportSection {
  const intro =
    'Operational responsibility for the ISMS is assigned at the level of individual artifacts. Comp AI records a named owner or assignee for every policy, control, risk, evidence task, and vendor; this constitutes the live, auditable responsibilities matrix.';

  if (band === 'small') {
    return {
      heading: 'Operational responsibilities',
      intro,
      bullets: ownership.map((row) => {
        const owners =
          row.owners.length > 0
            ? row.owners.join(', ')
            : 'assigned per item in Comp AI';
        return `${row.artifact}: ${owners}.`;
      }),
    };
  }

  return {
    heading: 'Operational responsibilities',
    intro,
    table: {
      headers: [
        'ISMS artifact',
        'Where responsibility is assigned',
        'Owner’s responsibility',
        'Current owner(s)',
      ],
      rows: ownership.map((row) => [
        row.artifact,
        row.assignedWhere,
        row.ownerResponsibility,
        row.owners.length > 0 ? row.owners.join(', ') : '—',
      ]),
    },
  };
}

/**
 * Build the ISMS Roles, Responsibilities & Authorities document (clause 5.3).
 * Structure follows the reference document merged with the ticket's ordered
 * contents. `roles`, `operationalOwnership` and `band` are populated by
 * loadRolesExtras at export-input assembly (see roles-export-data.ts).
 */
export function buildRolesSections(
  input: DocumentExportInput,
): IsmsExportSection[] {
  const roles = input.roles ?? [];
  const ownership = input.operationalOwnership ?? [];
  const band: IsmsTeamSizeBand = input.band ?? 'standard';
  const spo = roles.find((role) => role.roleKey === 'spo');
  const spoHolders = spo && spo.holders.length > 0 ? ` (${spo.holders.join(', ')})` : '';
  const auditor = roles.find((role) => role.roleKey === 'internal_auditor');

  const sections: IsmsExportSection[] = [
    {
      heading: 'Purpose',
      paragraphs: [
        {
          text: 'This document defines the responsibilities and authorities for the roles relevant to information security in the organisation, and the authority from which each is derived, in accordance with ISO/IEC 27001:2022, Clause 5.3. It also supports the authorities-and-responsibilities matrix referenced in Clause 5.2.',
        },
      ],
    },
    {
      heading: 'Relationship to Comp AI application-access roles',
      intro:
        'The Comp AI platform assigns application-access levels that determine access to the software only:',
      bullets: APPLICATION_ACCESS_LEVELS,
      paragraphs: [{ text: APPLICATION_ACCESS_NOTE }],
    },
    {
      heading: 'ISMS governance roles',
      intro:
        'The following named roles carry the accountability and decision authority for the ISMS.',
      table: buildRoleTable(roles),
    },
    {
      heading: 'Specific assignments required by Clause 5.3',
      intro: 'Top management has assigned the responsibility and authority for:',
      paragraphs: [
        {
          text: `(a) Ensuring that the ISMS conforms to the requirements of ISO/IEC 27001 — assigned to the Security & Privacy Owner${spoHolders}.`,
        },
        {
          text: `(b) Reporting on the performance of the ISMS to top management — assigned to the Security & Privacy Owner${spoHolders}, delivered at each management review and on material incidents or risk changes.`,
        },
        {
          text: 'The authority to assign tasks and make decisions within the ISMS rests with top management, who assign it to the Security & Privacy Owner; the SPO in turn assigns operational ownership of individual controls, policies, risks, and tasks through Comp AI.',
        },
      ],
    },
    {
      heading: 'Internal audit route',
      paragraphs: [{ text: internalAuditParagraph(auditor) }],
    },
  ];

  if (band === 'small') {
    sections.push({
      heading: 'Note on team size',
      paragraphs: [
        {
          text: 'The organisation currently operates with a small team (three or fewer people). Some ISMS roles are necessarily held by the same individuals, and the Deputy Security & Privacy Owner may be unfilled. This is a pragmatic and accepted arrangement at this size; the internal audit route selected for this ISMS is stated in the "Internal audit route" section above. Be prepared to explain this structure at audit.',
        },
      ],
    });
  }

  sections.push(buildOperationalSection(ownership, band));

  sections.push({
    heading: 'Communication of roles',
    paragraphs: [
      {
        text: 'Responsibilities and authorities are made known throughout the organisation through policy acknowledgement at onboarding and annually, the per-item owner assignments recorded in Comp AI, and the leadership communications captured in management reviews.',
      },
    ],
  });

  sections.push({
    heading: 'Review',
    paragraphs: [
      {
        text: 'This document is owned by the Security & Privacy Owner and is reviewed at least annually and on material change to governance, organisational structure, or key personnel. The approver and approval date are recorded in the document control table above.',
      },
    ],
  });

  return sections;
}

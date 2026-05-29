import type { IsmsExportSection } from '../utils/export-shared';
import { deriveInterestedParties } from './interested-parties';
import type {
  DerivedInterestedParty,
  DerivedRequirement,
  DocumentExportInput,
  IsmsPlatformData,
} from './types';

/** A party row read from the org's Interested Parties Register. */
export interface PartyInput {
  id: string;
  name: string;
  category: string;
}

/**
 * Map a party (by category / name) to one representative requirement and the
 * ISMS treatment that addresses it, referencing relevant policy/control areas
 * generically. Deterministic.
 */
function requirementForParty(party: { name: string; category: string }): {
  requirement: string;
  treatment: string;
} {
  const category = party.category.toLowerCase();
  if (category.includes('employee')) {
    return {
      requirement:
        'A secure workplace, clear acceptable-use rules and protection of their personal data.',
      treatment:
        'Addressed by the Access Control, Acceptable Use and HR Security policies, mandatory security-awareness training, and role-based access controls.',
    };
  }
  if (category.includes('customer')) {
    return {
      requirement:
        'Confidentiality, integrity and availability of their data and timely breach notification.',
      treatment:
        'Addressed by encryption, access control, logging/monitoring and the Incident Response policy with defined notification SLAs.',
    };
  }
  if (category.includes('regulator') || category.includes('certification')) {
    return {
      requirement:
        'Demonstrable conformance with the applicable standard or regulation.',
      treatment:
        'Addressed by the Statement of Applicability, internal audit programme, management review and the full ISMS control set evidenced in the platform.',
    };
  }
  if (category.includes('supplier')) {
    return {
      requirement:
        'Clear security requirements and protection of any data shared with them.',
      treatment:
        'Addressed by the Supplier/Vendor Management policy, vendor risk assessments, data-processing agreements and periodic vendor reviews.',
    };
  }
  return {
    requirement: `Relevant security and compliance expectations of ${party.name}.`,
    treatment:
      'Addressed by the relevant ISMS policies and controls, monitored through the risk register and management review.',
  };
}

/**
 * Derive one representative requirement + treatment per interested party. Uses the
 * org's existing parties register when supplied; otherwise falls back to the
 * platform-derived default party set. Manual rows are preserved by the caller.
 */
export function deriveRequirements({
  parties,
  data,
}: {
  parties: PartyInput[];
  data: IsmsPlatformData;
}): DerivedRequirement[] {
  const source: Array<{
    interestedPartyId: string | null;
    name: string;
    category: string;
  }> =
    parties.length > 0
      ? parties.map((party) => ({
          interestedPartyId: party.id,
          name: party.name,
          category: party.category,
        }))
      : deriveInterestedParties(data).map((party: DerivedInterestedParty) => ({
          interestedPartyId: null,
          name: party.name,
          category: party.category,
        }));

  return source.map((party, index) => {
    const mapped = requirementForParty(party);
    return {
      partyName: party.name,
      requirement: mapped.requirement,
      treatment: mapped.treatment,
      source: 'derived',
      derivedFrom: party.interestedPartyId
        ? `party:${party.interestedPartyId}`
        : `party:${party.name}`,
      position: index,
      interestedPartyId: party.interestedPartyId,
    };
  });
}

export function buildRequirementsSections(
  input: DocumentExportInput,
): IsmsExportSection[] {
  return [
    {
      heading: 'Requirements & ISMS Treatment',
      emptyText: 'No requirements recorded.',
      table: {
        headers: ['Interested party', 'Requirement', 'ISMS treatment'],
        rows: input.requirements.map((row) => [
          row.partyName,
          row.requirement,
          row.treatment,
        ]),
      },
    },
  ];
}

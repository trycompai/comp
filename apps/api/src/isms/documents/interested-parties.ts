import type { IsmsExportSection } from '../utils/export-shared';
import type {
  DerivedInterestedParty,
  DocumentExportInput,
  IsmsPlatformData,
} from './types';

/**
 * Map an active framework to the regulator / certification body that is an
 * interested party for that framework. Falls back to a generic cert body.
 */
function regulatorForFramework(name: string): {
  name: string;
  needs: string;
} {
  const lower = name.toLowerCase();
  if (lower.includes('iso 27001') || lower.includes('iso27001')) {
    return {
      name: `Certification body (${name})`,
      needs:
        'Evidence that the ISMS conforms to the standard and is operated effectively, sufficient to grant and maintain certification.',
    };
  }
  if (lower.includes('gdpr')) {
    return {
      name: 'Data protection authority (GDPR)',
      needs:
        'Lawful processing of personal data, timely breach notification and demonstrable data-protection accountability.',
    };
  }
  if (lower.includes('hipaa')) {
    return {
      name: 'Regulator (HIPAA)',
      needs:
        'Safeguards for protected health information and adherence to the Security and Privacy Rules.',
    };
  }
  if (lower.includes('soc 2') || lower.includes('soc2')) {
    return {
      name: `Independent auditor (${name})`,
      needs:
        'Evidence that the trust-services criteria are met across the audit period.',
    };
  }
  return {
    name: `Regulator / auditor (${name})`,
    needs: `Conformance with the obligations arising from ${name}.`,
  };
}

/**
 * Derive a lean set of interested parties (~5-8) from platform data. Deterministic
 * so drift is a pure snapshot comparison. Manual rows are preserved by the caller.
 */
export function deriveInterestedParties(
  data: IsmsPlatformData,
): DerivedInterestedParty[] {
  const rows: Array<Omit<DerivedInterestedParty, 'position'>> = [];

  if (data.memberCount > 0) {
    rows.push({
      name: 'Employees / workforce',
      category: 'Employee',
      needsExpectations:
        'A safe, well-governed working environment, clear security policies, training, and protection of their personal data.',
      source: 'derived',
      derivedFrom: 'members',
    });
  }

  rows.push({
    name: 'Customers',
    category: 'Customer',
    needsExpectations:
      'Confidentiality, integrity and availability of their data, contractual and regulatory compliance, and timely incident notification.',
    source: 'derived',
    derivedFrom: 'customers',
  });

  for (const framework of data.frameworkNames) {
    const regulator = regulatorForFramework(framework);
    rows.push({
      name: regulator.name,
      category: 'Regulator / Certification body',
      needsExpectations: regulator.needs,
      source: 'derived',
      derivedFrom: `framework:${framework}`,
    });
  }

  if (data.vendorCount > 0) {
    rows.push({
      name: 'Suppliers & service providers',
      category: 'Supplier',
      needsExpectations:
        'Clear security requirements, prompt cooperation on assessments, and adherence to contractual obligations.',
      source: 'derived',
      derivedFrom: 'vendors',
    });
  }

  if (data.subProcessorCount > 0) {
    rows.push({
      name: 'Sub-processors',
      category: 'Supplier',
      needsExpectations:
        'Defined data-processing instructions, breach-notification terms and protection of data handled on the organization’s behalf.',
      source: 'derived',
      derivedFrom: 'subprocessors',
    });
  }

  return rows.map((row, index) => ({ ...row, position: index }));
}

export function buildInterestedPartiesSections(
  input: DocumentExportInput,
): IsmsExportSection[] {
  return [
    {
      heading: 'Interested Parties',
      emptyText: 'No interested parties recorded.',
      table: {
        headers: ['Interested party', 'Category', 'Needs & expectations'],
        rows: input.interestedParties.map((party) => [
          party.name,
          party.category,
          party.needsExpectations,
        ]),
      },
    },
  ];
}

'use client';

import { toast } from 'sonner';
import type {
  IsmsDocument as IsmsDocumentData,
  IsmsRiskMethodologyNarrative,
} from '../isms-types';
import { IsmsDocumentShell } from './IsmsDocumentShell';
import type { ApproverOption } from './IsmsApprovalSection';
import { RiskMethodologyForm, type RiskMethodologyValues } from './RiskMethodologyForm';

interface RiskMethodologyClientProps {
  organizationId: string;
  documentId: string;
  fallbackData: IsmsDocumentData | null;
  currentMemberId: string | null;
  approverOptions: ApproverOption[];
}

const EMPTY_NARRATIVE: IsmsRiskMethodologyNarrative = {
  purpose: '',
  scope: '',
  approach: '',
  likelihoodDescriptions: [],
  impactDescriptions: [],
  acceptanceThresholds: [],
  treatmentOptions: [],
  responsibilities: '',
  frequency: '',
  documentation: '',
};

function toMethodologyNarrative(value: unknown): IsmsRiskMethodologyNarrative {
  if (!value || typeof value !== 'object') return EMPTY_NARRATIVE;
  const record = value as Record<string, unknown>;
  const toStr = (input: unknown): string => (typeof input === 'string' ? input : '');
  const toStringList = (input: unknown): string[] =>
    Array.isArray(input) ? input.filter((item): item is string => typeof item === 'string') : [];

  return {
    purpose: toStr(record.purpose),
    scope: toStr(record.scope),
    approach: toStr(record.approach),
    likelihoodDescriptions: toStringList(record.likelihoodDescriptions),
    impactDescriptions: toStringList(record.impactDescriptions),
    acceptanceThresholds: toStringList(record.acceptanceThresholds),
    treatmentOptions: toStringList(record.treatmentOptions),
    responsibilities: toStr(record.responsibilities),
    frequency: toStr(record.frequency),
    documentation: toStr(record.documentation),
  };
}

export function RiskMethodologyClient(props: RiskMethodologyClientProps) {
  return (
    <IsmsDocumentShell
      {...props}
      clause="6.1.2"
      title="Risk Assessment Methodology"
      description="How your organization identifies, analyses, and evaluates information-security risks (ISO 27001 clause 6.1.2). Every section ships with auditor-defensible default text — edit only where your approach differs. The scales and matrix mirror the Risks module."
      sectionTitle="Methodology"
      sectionDescription="Purpose, approach, scales, acceptance thresholds, treatment options, and responsibilities."
      generateSuccessMessage="Seeded the default methodology text"
    >
      {({ document, canManage, hook }) => {
        const handleSaveNarrative = async (values: RiskMethodologyValues) => {
          try {
            await hook.saveNarrative({ ...values });
            toast.success('Methodology saved');
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : 'Failed to save methodology');
            // Re-throw so the form keeps the user's input and stays open on failure.
            throw caught;
          }
        };

        const narrative = toMethodologyNarrative(document.draftNarrative);
        // Re-seed the form (via remount) whenever the persisted draft changes —
        // e.g. after "Generate from platform data" or a reload (ScopeClient pattern).
        const formKey = `${document.currentVersionId ?? 'draft'}:${JSON.stringify(
          document.draftNarrative ?? {},
        )}`;

        return (
          <RiskMethodologyForm
            key={formKey}
            narrative={narrative}
            canEdit={canManage}
            onSave={handleSaveNarrative}
          />
        );
      }}
    </IsmsDocumentShell>
  );
}

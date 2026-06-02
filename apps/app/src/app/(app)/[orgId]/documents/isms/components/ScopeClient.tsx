'use client';

import { toast } from 'sonner';
import type { IsmsDocument as IsmsDocumentData, IsmsScopeNarrative } from '../isms-types';
import { IsmsDocumentShell } from './IsmsDocumentShell';
import type { ApproverOption } from './IsmsApprovalSection';
import { ScopeForm, type ScopeNarrativeValues } from './ScopeForm';

interface ScopeClientProps {
  organizationId: string;
  documentId: string;
  fallbackData: IsmsDocumentData | null;
  currentMemberId: string | null;
  approverOptions: ApproverOption[];
}

const EMPTY_NARRATIVE: IsmsScopeNarrative = {
  certificateScopeSentence: '',
  inScope: '',
  interfaces: [],
  dependencies: [],
  exclusions: [],
  justification: '',
};

function toScopeNarrative(value: unknown): IsmsScopeNarrative {
  if (!value || typeof value !== 'object') return EMPTY_NARRATIVE;
  const record = value as Record<string, unknown>;
  const toStringList = (input: unknown): string[] =>
    Array.isArray(input) ? input.filter((item): item is string => typeof item === 'string') : [];

  return {
    certificateScopeSentence:
      typeof record.certificateScopeSentence === 'string' ? record.certificateScopeSentence : '',
    inScope: typeof record.inScope === 'string' ? record.inScope : '',
    interfaces: toStringList(record.interfaces),
    dependencies: toStringList(record.dependencies),
    exclusions: toStringList(record.exclusions),
    justification: typeof record.justification === 'string' ? record.justification : '',
  };
}

export function ScopeClient(props: ScopeClientProps) {
  return (
    <IsmsDocumentShell
      {...props}
      clause="4.3"
      title="ISMS Scope"
      description="Define the boundaries and applicability of the information security management system (ISO 27001 clause 4.3). Generate from your platform data, then refine the certificate scope, interfaces, dependencies, and exclusions."
      sectionTitle="Scope narrative"
      sectionDescription="The certificate scope statement, interfaces, dependencies, and exclusions."
      generateSuccessMessage="Generated scope from platform data"
    >
      {({ document, canManage, hook }) => {
        const handleSaveNarrative = async (values: ScopeNarrativeValues) => {
          try {
            await hook.saveNarrative({ ...values });
            toast.success('Scope saved');
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : 'Failed to save scope');
          }
        };

        const versions = Array.isArray(document.versions) ? document.versions : [];
        const narrative = toScopeNarrative(versions[0]?.narrative);

        return (
          <ScopeForm
            key={`${narrative.certificateScopeSentence}|${versions[0]?.id ?? 'none'}`}
            narrative={narrative}
            canEdit={canManage}
            onSave={handleSaveNarrative}
          />
        );
      }}
    </IsmsDocumentShell>
  );
}

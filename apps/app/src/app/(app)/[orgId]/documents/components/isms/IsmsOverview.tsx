'use client';

import { Button, Grid, Section, Stack } from '@trycompai/design-system';
import {
  CheckmarkFilled,
  DocumentMultiple_01,
  Incomplete,
  MagicWand,
  WarningAltFilled,
} from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useMemo } from 'react';
import useSWR from 'swr';
import { usePermissions } from '@/hooks/use-permissions';
import { api } from '@/lib/api-client';
import { useIso27001FrameworkId } from '../../isms/hooks/useIso27001FrameworkId';
import {
  ISMS_TYPE_META,
  ismsTypeToSlug,
  type IsmsDriftResult,
  type IsmsEnsureSetupResponse,
} from '../../isms/isms-types';
import {
  IsmsDocumentCard,
  IsmsEmptyState,
  IsmsSummaryRow,
  type IsmsSummaryStat,
} from '../../isms/components/shared';
import { SOAOverviewCard } from '../SOAOverviewCard';

export function IsmsOverview({ organizationId }: { organizationId: string }) {
  const iso27001FrameworkId = useIso27001FrameworkId(organizationId);
  const { hasPermission } = usePermissions();
  const canRunWizard = hasPermission('evidence', 'update');

  const { data: setupResponse } = useSWR<IsmsEnsureSetupResponse>(
    iso27001FrameworkId
      ? (['/v1/isms/ensure-setup', organizationId, iso27001FrameworkId] as const)
      : null,
    async ([endpoint, orgId, frameworkId]: readonly [string, string, string]) => {
      const response = await api.post<IsmsEnsureSetupResponse>(endpoint, {
        organizationId: orgId,
        frameworkId,
      });
      if (response.error || !response.data) {
        throw new Error(response.error ?? 'Failed to load ISMS documents');
      }
      return response.data;
    },
  );

  const documents = useMemo(() => {
    const list = setupResponse?.documents;
    return Array.isArray(list) ? list : [];
  }, [setupResponse]);

  const contextDoc = documents.find((doc) => doc.type === 'context_of_organization');

  const { data: contextDrift } = useSWR<IsmsDriftResult>(
    contextDoc ? (['/v1/isms/documents', contextDoc.id, 'drift'] as const) : null,
    async ([base, id]: readonly [string, string, string]) => {
      const response = await api.get<IsmsDriftResult>(`${base}/${id}/drift`);
      if (response.error || !response.data) {
        throw new Error(response.error ?? 'Failed to load drift status');
      }
      return response.data;
    },
  );

  const isContextStale = !!contextDrift?.isStale;

  const summary = useMemo<IsmsSummaryStat[]>(() => {
    const total = ISMS_TYPE_META.length;
    const approved = documents.filter((doc) => doc.status === 'approved').length;
    const outstanding = total - approved;
    const needsReview = isContextStale ? 1 : 0;
    return [
      { label: 'Documents', value: total, icon: DocumentMultiple_01 },
      { label: 'Approved', value: approved, icon: CheckmarkFilled, tone: 'success' },
      { label: 'Outstanding', value: outstanding, icon: Incomplete },
      {
        label: 'Needs review',
        value: needsReview,
        icon: WarningAltFilled,
        tone: needsReview > 0 ? 'warning' : 'default',
      },
    ];
  }, [documents, isContextStale]);

  if (!iso27001FrameworkId) {
    return (
      <IsmsEmptyState
        icon={DocumentMultiple_01}
        title="ISO 27001 isn't active yet"
        description="Add the ISO 27001 framework to your organization to manage your ISMS foundational documents and Statement of Applicability."
      />
    );
  }

  const wizardAction = canRunWizard ? (
    <Link href={`/${organizationId}/documents/isms/wizard`}>
      <Button type="button" iconLeft={<MagicWand size={16} />}>
        Run setup wizard
      </Button>
    </Link>
  ) : undefined;

  return (
    <Stack gap="8">
      <IsmsSummaryRow stats={summary} />

      <Section
        title="Foundational Documents"
        description="The ISO 27001 clause 4–6 documents that establish your information security management system."
        actions={wizardAction}
      >
        <Grid cols={{ base: '1', md: '2', xl: '3' }} gap="4">
          {ISMS_TYPE_META.map((meta) => {
            const setupDoc = documents.find((doc) => doc.type === meta.type);
            const isStale = meta.type === 'context_of_organization' ? isContextStale : false;
            return (
              <IsmsDocumentCard
                key={meta.type}
                href={`/${organizationId}/documents/isms/${ismsTypeToSlug(meta.type)}`}
                clauseLabel={`Clause ${meta.clause}`}
                title={meta.title}
                description={meta.description}
                status={setupDoc?.status ?? null}
                isStale={isStale}
              />
            );
          })}
        </Grid>
      </Section>

      <Section
        title="Statement of Applicability"
        description="The Annex A controls you apply, with justification for inclusions and exclusions."
      >
        <SOAOverviewCard organizationId={organizationId} iso27001FrameworkId={iso27001FrameworkId} />
      </Section>
    </Stack>
  );
}

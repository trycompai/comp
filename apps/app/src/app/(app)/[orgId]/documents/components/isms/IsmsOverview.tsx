'use client';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Grid,
  Section,
  Spinner,
  Stack,
} from '@trycompai/design-system';
import {
  CheckmarkFilled,
  DocumentMultiple_01,
  Incomplete,
  MagicWand,
  Renew,
  WarningAlt,
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

export function IsmsOverview({ organizationId }: { organizationId: string }) {
  const iso27001FrameworkId = useIso27001FrameworkId(organizationId);
  const { hasPermission } = usePermissions();
  const canRunWizard = hasPermission('evidence', 'update');

  const {
    data: setupResponse,
    error: setupError,
    isLoading: isSetupLoading,
    mutate: mutateSetup,
  } = useSWR<IsmsEnsureSetupResponse>(
    iso27001FrameworkId
      ? (['/v1/isms/ensure-setup', organizationId, iso27001FrameworkId] as const)
      : null,
    async ([endpoint, orgId, frameworkId]: readonly [string, string, string]) => {
      const response = await api.post<IsmsEnsureSetupResponse>(endpoint, {
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
        description="Add the ISO 27001 framework to your organization to manage your ISMS foundational documents."
      />
    );
  }

  // Surface a load failure with a retry instead of a silently zeroed summary.
  if (setupError && !setupResponse) {
    return (
      <Alert variant="destructive" icon={<WarningAlt />}>
        <AlertTitle>Couldn&apos;t load your ISMS documents</AlertTitle>
        <AlertDescription>
          <div className="flex flex-col gap-3">
            <div>
              {setupError instanceof Error
                ? setupError.message
                : 'Something went wrong loading your ISMS foundational documents.'}
            </div>
            <div className="flex">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void mutateSetup()}
                iconLeft={<Renew size={16} />}
              >
                Retry
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Loading the first response: show a spinner rather than an all-zero summary.
  if (!setupResponse && isSetupLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
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
    </Stack>
  );
}

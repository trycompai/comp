'use client';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Stack,
  Text,
} from '@trycompai/design-system';
import Link from 'next/link';
import { useMemo } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api-client';
import { useIso27001FrameworkId } from '../../isms/hooks/useIso27001FrameworkId';
import {
  ISMS_TYPE_META,
  ismsTypeToSlug,
  type IsmsDocumentStatus,
  type IsmsDocumentType,
  type IsmsDriftResult,
  type IsmsEnsureSetupResponse,
  type IsmsSetupDocument,
} from '../../isms/isms-types';
import { SOAOverviewCard } from '../SOAOverviewCard';
import { IsmsStatusBadge } from './IsmsStatusBadge';

function FoundationalDocumentCard({
  organizationId,
  type,
  setupDoc,
  isStale,
}: {
  organizationId: string;
  type: IsmsDocumentType;
  setupDoc: IsmsSetupDocument | undefined;
  isStale: boolean;
}) {
  const meta = ISMS_TYPE_META.find((entry) => entry.type === type);
  if (!meta) return null;

  const status: IsmsDocumentStatus | null = setupDoc?.status ?? null;
  const title = `${meta.clause} ${meta.title}`;

  const cardBody = (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="line-clamp-1">
          <CardDescription>{meta.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {meta.detailRouteEnabled ? (
          <IsmsStatusBadge status={status} isStale={isStale} />
        ) : (
          <Badge variant="outline">Coming soon</Badge>
        )}
      </CardContent>
    </Card>
  );

  if (!meta.detailRouteEnabled) {
    return <div className="opacity-60">{cardBody}</div>;
  }

  return (
    <Link href={`/${organizationId}/documents/isms/${ismsTypeToSlug(type)}`}>{cardBody}</Link>
  );
}

export function IsmsOverview({ organizationId }: { organizationId: string }) {
  const iso27001FrameworkId = useIso27001FrameworkId(organizationId);

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

  if (!iso27001FrameworkId) {
    return (
      <div className="flex items-center justify-center rounded-lg border py-12">
        <Text variant="muted">
          Add the ISO 27001 framework to your organization to manage ISMS foundational documents.
        </Text>
      </div>
    );
  }

  return (
    <Stack gap="6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Text size="lg" weight="semibold">
            Foundational Documents
          </Text>
          <Badge variant="secondary">{ISMS_TYPE_META.length}</Badge>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {ISMS_TYPE_META.map((meta) => {
            const setupDoc = documents.find((doc) => doc.type === meta.type);
            const isStale =
              meta.type === 'context_of_organization' ? !!contextDrift?.isStale : false;
            return (
              <FoundationalDocumentCard
                key={meta.type}
                organizationId={organizationId}
                type={meta.type}
                setupDoc={setupDoc}
                isStale={isStale}
              />
            );
          })}
        </div>
      </div>

      <SOAOverviewCard organizationId={organizationId} iso27001FrameworkId={iso27001FrameworkId} />
    </Stack>
  );
}

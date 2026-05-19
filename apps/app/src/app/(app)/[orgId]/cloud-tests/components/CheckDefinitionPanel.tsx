'use client';

import { useApi } from '@/hooks/use-api';
import { Loader2 } from 'lucide-react';

interface CheckDefinitionPanelProps {
  findingId: string;
}

interface CheckDefinition {
  title: string;
  description: string;
  passCriteria: string;
  failCriteria: string;
  whyItMatters: string;
  source: 'ai' | 'provider';
}

/**
 * Renders the "About this check" panel inside an expanded finding row.
 *
 * Fetches a Tier 3 description lazily from
 * /v1/cloud-security/findings/:id/check-definition. The first request
 * for an AWS check triggers a Haiku call server-side (~1-2s). Subsequent
 * requests for the same check in the same org hit the DB cache (~50ms).
 * GCP/Azure findings resolve synchronously from provider evidence.
 *
 * Renders null on error or empty response so the existing finding
 * description / remediation always remain visible — auditor trust takes
 * precedence over completeness.
 */
export function CheckDefinitionPanel({ findingId }: CheckDefinitionPanelProps) {
  const api = useApi();
  const { data, error, isLoading } = api.useSWR<{
    data: CheckDefinition | null;
  }>(`/v1/cloud-security/findings/${findingId}/check-definition`, {
    revalidateOnFocus: false,
    // Browser-side dedupe — same finding clicked twice in a session = one fetch.
    dedupingInterval: 5 * 60 * 1000,
  });

  if (isLoading) return <CheckDefinitionSkeleton />;
  const definition = data?.data?.data ?? null;
  if (error || !definition) return null;

  return (
    <div className="rounded-md border bg-background">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h4 className="text-xs font-medium">About this check</h4>
        {definition.source === 'provider' && (
          <span className="text-[10px] text-muted-foreground">
            From provider catalog
          </span>
        )}
      </div>
      <dl className="space-y-2.5 px-3 py-3 text-xs">
        <DefinitionField label="What it checks" value={definition.description} />
        <DefinitionField label="Pass criteria" value={definition.passCriteria} />
        <DefinitionField label="Fail criteria" value={definition.failCriteria} />
        <DefinitionField label="Why it matters" value={definition.whyItMatters} />
      </dl>
    </div>
  );
}

function CheckDefinitionSkeleton() {
  return (
    <div className="rounded-md border bg-background px-3 py-2.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Generating check description...
      </div>
    </div>
  );
}

function DefinitionField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-foreground font-medium">{label}</dt>
      <dd className="text-muted-foreground mt-0.5 leading-relaxed">{value}</dd>
    </div>
  );
}

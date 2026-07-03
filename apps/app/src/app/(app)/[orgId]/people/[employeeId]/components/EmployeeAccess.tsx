'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';

import { apiClient } from '@/lib/api-client';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Stack,
  Text,
} from '@trycompai/design-system';
import { ChevronDown, ChevronUp } from '@trycompai/design-system/icons';

interface MemberAccessEntry {
  summary: string;
  fields: Record<string, string>;
  /** Null for AI-extracted entries (no single source record to show). */
  raw: unknown;
  source: 'deterministic' | 'ai';
}

interface MemberAccessSource {
  slug: string;
  name: string;
  logoUrl: string | null;
  matchType: 'matched' | 'not-matched' | 'unparsed' | 'no-data';
  entries: MemberAccessEntry[];
  lastCheckedAt: string | null;
}

interface MemberAccessResponse {
  data: { memberId: string; sources: MemberAccessSource[] };
}

function useMemberAccess(memberId: string) {
  return useSWR(
    memberId ? ['member-access', memberId] : null,
    async () => {
      const response = await apiClient.get<MemberAccessResponse>(
        `/v1/people/${memberId}/access`,
      );
      if (response.error || !response.data?.data) {
        throw new Error(response.error || 'Failed to fetch access');
      }
      return response.data.data;
    },
    { revalidateOnFocus: false },
  );
}

const MATCH_BADGE: Record<
  MemberAccessSource['matchType'],
  { label: string; variant: 'accent' | 'secondary' | 'outline' }
> = {
  matched: { label: 'Access found', variant: 'accent' },
  'not-matched': { label: 'No match for this member', variant: 'secondary' },
  unparsed: { label: 'Needs manual review', variant: 'secondary' },
  'no-data': { label: 'Check not run yet', variant: 'outline' },
};

function SourceRow({ source }: { source: MemberAccessSource }) {
  const [expanded, setExpanded] = useState(false);
  const badge = MATCH_BADGE[source.matchType];
  const canExpand = source.entries.length > 0;

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => canExpand && setExpanded((v) => !v)}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left ${canExpand ? 'cursor-pointer hover:bg-muted/40' : 'cursor-default'}`}
        aria-expanded={expanded}
      >
        {source.logoUrl && (
          <Image
            src={source.logoUrl}
            alt=""
            width={24}
            height={24}
            className="shrink-0 rounded-sm"
            unoptimized
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{source.name}</div>
          {source.entries[0] && (
            <div className="truncate text-xs text-muted-foreground">
              {source.entries[0].summary}
            </div>
          )}
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
        {canExpand && (
          <span className="text-muted-foreground">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3">
          <Stack gap="3">
            {source.entries.map((entry, i) => (
              <div key={i}>
                {entry.source === 'ai' && (
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline">AI-extracted</Badge>
                    <Text size="xs" variant="muted">
                      Structured by AI from this check&apos;s evidence
                    </Text>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                  {Object.entries(entry.fields).map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-4">
                      <Text size="xs" variant="muted">
                        {label}
                      </Text>
                      <span className="truncate text-xs font-medium">{value}</span>
                    </div>
                  ))}
                </div>
                {/* Raw record for auditors; scrolls inside itself, never the page. */}
                {entry.raw != null && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                      Raw record
                    </summary>
                    <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-muted/40 p-2 text-xs">
                      {JSON.stringify(entry.raw, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
            {source.lastCheckedAt && (
              <Text size="xs" variant="muted">
                Last checked {new Date(source.lastCheckedAt).toLocaleString()}
              </Text>
            )}
          </Stack>
        </div>
      )}
    </div>
  );
}

/**
 * The member's access across every connected integration bound to the
 * Employee Access evidence task, matched by email. Read-only.
 */
export function EmployeeAccess({
  memberId,
  organizationId,
}: {
  memberId: string;
  organizationId: string;
}) {
  const { data, error, isLoading } = useMemberAccess(memberId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton style={{ height: 96, width: '100%' }} />
        ) : error ? (
          <Text size="sm" variant="muted">
            Couldn&apos;t load access information. Try refreshing the page.
          </Text>
        ) : !data || data.sources.length === 0 ? (
          <Stack gap="2">
            <Text size="sm" variant="muted">
              No connected integrations report employee access yet.
            </Text>
            <Link
              href={`/${organizationId}/integrations`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Browse integrations →
            </Link>
          </Stack>
        ) : (
          <Stack gap="3">
            <Text size="sm" variant="muted">
              What this person can access in your connected tools, from each
              integration&apos;s latest Employee Access check.
            </Text>
            {data.sources.map((source) => (
              <SourceRow key={source.slug} source={source} />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

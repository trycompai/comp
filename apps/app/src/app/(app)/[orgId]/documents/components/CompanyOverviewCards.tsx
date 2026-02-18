'use client';

import { conciseFormDescriptions } from '@/app/(app)/[orgId]/documents/form-descriptions';
import { useOrganizationFindings } from '@/hooks/use-findings-api';
import { api } from '@/lib/api-client';
import { FindingStatus } from '@db';
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
import { evidenceFormDefinitionList, meetingSubTypeValues } from '../forms';

type FormStatuses = Record<string, { lastSubmittedAt: string | null }>;

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

const MEETING_SUB_TYPES = meetingSubTypeValues;
const MEETING_ALL_TYPES = new Set<string>([...MEETING_SUB_TYPES, 'meeting']);

function isTodo(lastSubmittedAt: string | null): boolean {
  if (!lastSubmittedAt) return true;
  const elapsed = Date.now() - new Date(lastSubmittedAt).getTime();
  return elapsed > SIX_MONTHS_MS;
}

function isMeetingTodo(statuses: FormStatuses): boolean {
  return MEETING_SUB_TYPES.every((subType) => isTodo(statuses[subType]?.lastSubmittedAt ?? null));
}

function StatusBadge({
  statuses,
  form,
  activeIssues,
}: {
  statuses: FormStatuses | undefined;
  form: (typeof evidenceFormDefinitionList)[number];
  activeIssues: number;
}) {
  if (!statuses) {
    return (
      <div className="flex items-center gap-1.5">
        <Text size="xs" variant="muted">
          {form.fields.length} fields
        </Text>
        {activeIssues > 0 && (
          <span className="inline-flex items-center rounded-sm bg-red-100 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wider leading-none text-red-800 dark:bg-red-950/30 dark:text-red-400">
            {activeIssues === 1 ? '1 Issue' : `${activeIssues} Issues`}
          </span>
        )}
      </div>
    );
  }

  const showTodo =
    form.type === 'meeting'
      ? isMeetingTodo(statuses)
      : isTodo(statuses[form.type]?.lastSubmittedAt ?? null);

  const statusBadge = showTodo ? (
    form.optional ? (
      <Badge variant="outline">Optional</Badge>
    ) : (
      <span className="inline-flex items-center rounded-sm bg-amber-100 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wider leading-none text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
        Todo
      </span>
    )
  ) : (
    <span className="inline-flex items-center rounded-sm bg-green-100 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wider leading-none text-green-800 dark:bg-green-950/30 dark:text-green-400">
      Complete
    </span>
  );

  return (
    <div className="flex items-center gap-1.5">
      {statusBadge}
      {activeIssues > 0 && (
        <span className="inline-flex items-center rounded-sm bg-red-100 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wider leading-none text-red-800 dark:bg-red-950/30 dark:text-red-400">
          {activeIssues === 1 ? '1 Issue' : `${activeIssues} Issues`}
        </span>
      )}
    </div>
  );
}

export function CompanyOverviewCards({ organizationId }: { organizationId: string }) {
  const swrKey: readonly [string, string] = ['/v1/evidence-forms/statuses', organizationId];

  const { data: statuses } = useSWR<FormStatuses>(
    swrKey,
    async ([endpoint, orgId]: readonly [string, string]) => {
      const response = await api.get<FormStatuses>(endpoint, orgId);
      if (response.error || !response.data) {
        throw new Error(response.error ?? 'Failed to load form statuses');
      }
      return response.data;
    },
  );

  const { data: findingsResponse } = useOrganizationFindings();

  const activeIssueCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const findings = findingsResponse?.data;
    if (!findings) return counts;

    for (const finding of findings) {
      if (finding.status === FindingStatus.closed) continue;

      const formType = finding.evidenceFormType ?? finding.evidenceSubmission?.formType;
      if (!formType) continue;

      if (MEETING_ALL_TYPES.has(formType)) {
        counts['meeting'] = (counts['meeting'] ?? 0) + 1;
      } else {
        counts[formType] = (counts[formType] ?? 0) + 1;
      }
    }
    return counts;
  }, [findingsResponse]);

  const visibleForms = useMemo(() => evidenceFormDefinitionList.filter((form) => !form.hidden), []);

  const categories = useMemo(() => {
    const map = new Map<string, typeof evidenceFormDefinitionList>();
    for (const form of visibleForms) {
      const cat = form.category;
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(form);
    }
    return map;
  }, [visibleForms]);

  return (
    <Stack gap="6">
      {Array.from(categories.entries()).map(([category, forms]) => (
        <div key={category} className="space-y-3">
          <div className="flex items-center gap-2">
            <Text size="lg" weight="semibold">
              {category}
            </Text>
            <Badge variant="secondary">{forms.length}</Badge>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {forms.map((form) => (
              <Link key={form.type} href={`/${organizationId}/documents/${form.type}`}>
                <Card>
                  <CardHeader>
                    <CardTitle>{form.title}</CardTitle>
                    <div className="line-clamp-1">
                      <CardDescription>
                        {conciseFormDescriptions[form.type] ?? form.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <StatusBadge
                      statuses={statuses}
                      form={form}
                      activeIssues={activeIssueCounts[form.type] ?? 0}
                    />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </Stack>
  );
}

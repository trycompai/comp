'use client';

import { api } from '@/lib/api-client';
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
import useSWR from 'swr';
import { evidenceFormDefinitionList } from '../forms';

const conciseFormDescriptions: Record<string, string> = {
  'board-meeting': 'Hold a board meeting and capture minutes.',
  'it-leadership-meeting': 'Run an IT leadership meeting and document outcomes.',
  'risk-committee-meeting': 'Conduct a risk committee meeting and record decisions.',
  'access-request': 'Track and retain user access requests.',
  'whistleblower-report': 'Submit a confidential whistleblower report.',
  'penetration-test': 'Upload a third-party penetration test report.',
  'rbac-matrix': 'Document role-based access by system, role, and approval.',
  'infrastructure-inventory': 'Track infrastructure assets, ownership, and review dates.',
  'employee-performance-evaluation': 'Capture structured employee review outcomes and sign-off.',
};

type FormStatuses = Record<string, { lastSubmittedAt: string | null }>;

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

function isTodo(lastSubmittedAt: string | null): boolean {
  if (!lastSubmittedAt) return true;
  const elapsed = Date.now() - new Date(lastSubmittedAt).getTime();
  return elapsed > SIX_MONTHS_MS;
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

  // Group forms by category
  const categories = new Map<string, typeof evidenceFormDefinitionList>();
  for (const form of evidenceFormDefinitionList) {
    const cat = form.category;
    if (!categories.has(cat)) {
      categories.set(cat, []);
    }
    categories.get(cat)!.push(form);
  }

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
            {forms.map((form) => {
              const status = statuses?.[form.type];
              const showTodo = statuses ? isTodo(status?.lastSubmittedAt ?? null) : false;

              return (
                <Link key={form.type} href={`/${organizationId}/company/${form.type}`}>
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
                      {statuses ? (
                        showTodo ? (
                          <Badge variant="outline">TODO</Badge>
                        ) : (
                          <Badge variant="secondary">Complete</Badge>
                        )
                      ) : (
                        <Text size="xs" variant="muted">
                          {form.fields.length} fields
                        </Text>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </Stack>
  );
}

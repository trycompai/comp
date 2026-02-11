import { auth } from '@/utils/auth';
import { db } from '@db/server';
import { headers } from 'next/headers';
import { cache } from 'react';
import 'server-only';

const FRAMEWORK_ID_PATTERN = /\bfrk_[a-z0-9]+\b/g;

/**
 * Detects framework IDs (frk_xxx) in context entry answers and replaces them
 * with human-readable framework names. Handles legacy data from before the
 * write-time fix was applied.
 */
async function resolveFrameworkIdsInEntries<T extends { answer: string }>(
  entries: T[],
): Promise<T[]> {
  // Collect all unique framework IDs across all entries
  const allIds = new Set<string>();
  for (const entry of entries) {
    const matches = entry.answer.match(FRAMEWORK_ID_PATTERN);
    if (matches) {
      for (const id of matches) {
        allIds.add(id);
      }
    }
  }

  if (allIds.size === 0) return entries;

  // Batch-fetch framework names for all IDs
  const frameworks = await db.frameworkEditorFramework.findMany({
    where: { id: { in: Array.from(allIds) } },
    select: { id: true, name: true },
  });

  const idToName = new Map(frameworks.map((f) => [f.id, f.name]));

  // Replace IDs with names in each entry's answer
  return entries.map((entry) => {
    const resolvedAnswer = entry.answer.replace(
      FRAMEWORK_ID_PATTERN,
      (id) => idToName.get(id) ?? id,
    );
    if (resolvedAnswer === entry.answer) return entry;
    return { ...entry, answer: resolvedAnswer };
  });
}

export const getContextEntries = cache(
  async ({
    orgId,
    search,
    page,
    perPage,
  }: {
    orgId: string;
    search?: string;
    page: number;
    perPage: number;
  }): Promise<{
    data: any[];
    pageCount: number;
  }> => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.session.activeOrganizationId || session.session.activeOrganizationId !== orgId) {
      return { data: [], pageCount: 0 };
    }
    const where: any = {
      organizationId: orgId,
      ...(search && {
        question: {
          contains: search,
          mode: 'insensitive',
        },
      }),
    };
    const skip = (page - 1) * perPage;
    const take = perPage;
    const entries = await db.context.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
    const total = await db.context.count({ where });
    const pageCount = Math.ceil(total / perPage);

    // Resolve any legacy framework IDs to display names
    const resolvedEntries = await resolveFrameworkIdsInEntries(entries);

    return { data: resolvedEntries, pageCount };
  },
);

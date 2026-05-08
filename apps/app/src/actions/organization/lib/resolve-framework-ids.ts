import { db } from '@db/server';

/**
 * Resolves framework IDs for an organization by:
 * 1. Checking for a raw frameworkIds context entry (JSON array, saved by newer code)
 * 2. Falling back to reverse-looking framework names from the onboarding context
 */
export async function resolveFrameworkIds(organizationId: string): Promise<string[]> {
  // Try the raw IDs context entry first (saved by newer createOrganizationMinimal)
  const rawIdsContext = await db.context.findFirst({
    where: {
      organizationId,
      question: 'frameworkIds',
      tags: { has: 'onboarding' },
    },
  });

  if (rawIdsContext?.answer) {
    try {
      const ids = JSON.parse(rawIdsContext.answer);
      if (Array.isArray(ids) && ids.length > 0) {
        return ids;
      }
    } catch {
      // Fall through to name-based lookup
    }
  }

  // Fall back to reverse-looking from framework names
  const frameworkContext = await db.context.findFirst({
    where: {
      organizationId,
      question: 'Which compliance frameworks do you need?',
      tags: { has: 'onboarding' },
    },
  });

  if (!frameworkContext?.answer) {
    return [];
  }

  const frameworkNames = frameworkContext.answer.split(',').map((name) => name.trim());

  const frameworks = await db.frameworkEditorFramework.findMany({
    where: {
      name: { in: frameworkNames, mode: 'insensitive' },
    },
    select: { id: true },
  });

  return frameworks.map((f) => f.id);
}

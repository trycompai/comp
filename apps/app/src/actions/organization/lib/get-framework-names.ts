'use server';

import { db } from '@db';

/**
 * Fetch framework names by IDs and convert them to lowercase with no spaces
 * @param frameworkIds - Array of framework IDs
 * @returns Array of framework names in lowercase with no spaces
 */
export async function getFrameworkNames(frameworkIds: string[]): Promise<string[]> {
  if (!frameworkIds || frameworkIds.length === 0) {
    return [];
  }

  const frameworks = await db.frameworkEditorFramework.findMany({
    where: {
      id: { in: frameworkIds },
    },
    select: {
      name: true,
    },
  });

  return frameworks
    .map((framework) => {
      // Convert framework name to lowercase with no spaces
      // e.g., "SOC 2" -> "soc2", "ISO 27001" -> "iso27001", "GDPR" -> "gdpr"
      return framework.name
        .toLowerCase()
        .replace(/\s+/g, '') // Remove all spaces
        .replace(/[^a-z0-9]/g, ''); // Remove special characters
    })
    .filter(Boolean); // Remove any empty strings
}

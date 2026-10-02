'use server';

import { hasPermission } from '@/lib/permissions';
import { resolveUserPermissions } from '@/lib/permissions.server';
import { auth } from '@/utils/auth';
import { groq } from '@ai-sdk/groq';
import { db } from '@db/server';
import { generateObject, NoObjectGeneratedError } from 'ai';
import { headers } from 'next/headers';
import { z } from 'zod';
import {
  AUTOMATION_SUGGESTIONS_SYSTEM_PROMPT,
  getAutomationSuggestionsPrompt,
} from './prompts/automation-suggestions';

const SuggestionsSchema = z.object({
  suggestions: z.array(
    z.object({
      title: z.string(),
      prompt: z.string(),
      vendorName: z.string().nullable(),
      vendorWebsite: z.string().nullable(),
    }),
  ),
});

/**
 * Authorize the requested organization before reading vendor or context data.
 * Resolve permissions against this membership, rather than a second session
 * lookup whose active organization could change during the request.
 */
async function getAuthorizedOrganizationId({
  organizationId,
}: {
  organizationId: string;
}): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const activeOrganizationId = session?.session.activeOrganizationId;
  if (!session?.user.id || !activeOrganizationId || activeOrganizationId !== organizationId) {
    return null;
  }

  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId: activeOrganizationId,
      deactivated: false,
      isActive: true,
    },
    select: { role: true },
  });
  if (!member) return null;

  const permissions = await resolveUserPermissions(member.role, activeOrganizationId);
  const canReadData = ['task', 'vendor', 'evidence'].every((resource) =>
    hasPermission(permissions, resource, 'read'),
  );
  if (!canReadData) return null;

  return activeOrganizationId;
}

export async function generateAutomationSuggestions(
  taskDescription: string,
  organizationId: string,
): Promise<{ title: string; prompt: string; vendorName?: string; vendorWebsite?: string }[]> {
  try {
    const authorizedOrganizationId = await getAuthorizedOrganizationId({ organizationId });
    if (!authorizedOrganizationId) {
      return [];
    }

    // Get vendors from the Vendor table
    const vendors = await db.vendor.findMany({
      where: {
        organizationId: authorizedOrganizationId,
      },
      select: {
        name: true,
        website: true,
        description: true,
      },
    });
    // Get vendors from context table as well
    const contextEntries = await db.context.findMany({
      where: {
        organizationId: authorizedOrganizationId,
      },
      select: {
        question: true,
        answer: true,
      },
    });
    const vendorList =
      vendors.length > 0
        ? vendors.map((v) => `${v.name}${v.website ? ` (${v.website})` : ''}`).join(', ')
        : 'No vendors configured yet';

    const contextInfo =
      contextEntries.length > 0
        ? contextEntries.map((c) => `Q: ${c.question}\nA: ${c.answer}`).join('\n\n')
        : 'No additional context available';

    // Generate AI suggestions
    const { object } = await generateObject({
      model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
      schema: SuggestionsSchema,
      system: AUTOMATION_SUGGESTIONS_SYSTEM_PROMPT,
      prompt: getAutomationSuggestionsPrompt(taskDescription, vendorList, contextInfo),
    });
    // Handle case where model returns single object instead of array
    let suggestions = object.suggestions;
    if (!Array.isArray(suggestions)) {
      if (suggestions && typeof suggestions === 'object' && 'title' in suggestions) {
        suggestions = [suggestions];
      } else {
        suggestions = [];
      }
    }

    return suggestions.map((s) => ({
      title: s.title,
      prompt: s.prompt,
      vendorName: s.vendorName ?? undefined,
      vendorWebsite: s.vendorWebsite ?? undefined,
    }));
  } catch (error) {
    console.error('[generateAutomationSuggestions] Error generating suggestions:', error);
    // Try to extract suggestions from error if available
    if (NoObjectGeneratedError.isInstance(error)) {
      try {
        const errorText = error.text;
        if (errorText) {
          const parsed: unknown = JSON.parse(errorText);
          const result = SuggestionsSchema.safeParse(parsed);
          if (result.success) {
            return result.data.suggestions.map((suggestion) => ({
              title: suggestion.title,
              prompt: suggestion.prompt,
              vendorName: suggestion.vendorName ?? undefined,
              vendorWebsite: suggestion.vendorWebsite ?? undefined,
            }));
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
    return [];
  }
}

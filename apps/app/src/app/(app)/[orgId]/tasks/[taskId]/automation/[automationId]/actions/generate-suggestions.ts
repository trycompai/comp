'use server';

import { groq } from '@ai-sdk/groq';
import { db } from '@db/server';
import { generateObject, NoObjectGeneratedError } from 'ai';
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

export async function generateAutomationSuggestions(
  taskDescription: string,
  organizationId: string,
): Promise<{ title: string; prompt: string; vendorName?: string; vendorWebsite?: string }[]> {
  try {
    // Get vendors from the Vendor table
    const vendors = await db.vendor.findMany({
      where: {
        organizationId,
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
        organizationId,
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
          const parsed = JSON.parse(errorText);
          if (parsed.suggestions) {
            const suggestions = Array.isArray(parsed.suggestions)
              ? parsed.suggestions
              : [parsed.suggestions];
            if (suggestions.length > 0 && suggestions[0].title) {
              return suggestions.map((s: Record<string, unknown>) => ({
                title: String(s.title),
                prompt: String(s.prompt),
                vendorName: (s.vendorName as string) ?? undefined,
                vendorWebsite: (s.vendorWebsite as string) ?? undefined,
              }));
            }
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
    return [];
  }
}

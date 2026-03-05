'use server';

import { groq } from '@ai-sdk/groq';
import { db } from '@db';
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
      vendorName: z.string().optional(),
      vendorWebsite: z.string().optional(),
    }),
  ),
});

export async function generateAutomationSuggestions(
  taskDescription: string,
  organizationId: string,
): Promise<{ title: string; prompt: string; vendorName?: string; vendorWebsite?: string }[]> {
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
  try {
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

    return suggestions;
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
              return suggestions;
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

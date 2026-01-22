'use server';

import { groq } from '@ai-sdk/groq';
import { db } from '@db';
import { generateObject, NoObjectGeneratedError } from 'ai';
import { performance } from 'perf_hooks';
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
  const startTime = performance.now();
  console.log('[generateAutomationSuggestions] Starting suggestion generation...');

  // Get vendors from the Vendor table
  const vendorsStartTime = performance.now();
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
  const vendorsTime = performance.now() - vendorsStartTime;
  console.log(
    `[generateAutomationSuggestions] Fetched ${vendors.length} vendors in ${vendorsTime.toFixed(2)}ms`,
  );

  // Get vendors from context table as well
  const contextStartTime = performance.now();
  const contextEntries = await db.context.findMany({
    where: {
      organizationId,
    },
    select: {
      question: true,
      answer: true,
    },
  });
  const contextTime = performance.now() - contextStartTime;
  console.log(
    `[generateAutomationSuggestions] Fetched ${contextEntries.length} context entries in ${contextTime.toFixed(2)}ms`,
  );

  const vendorList =
    vendors.length > 0
      ? vendors.map((v) => `${v.name}${v.website ? ` (${v.website})` : ''}`).join(', ')
      : 'No vendors configured yet';

  const contextInfo =
    contextEntries.length > 0
      ? contextEntries.map((c) => `Q: ${c.question}\nA: ${c.answer}`).join('\n\n')
      : 'No additional context available';

  const promptLength = getAutomationSuggestionsPrompt(
    taskDescription,
    vendorList,
    contextInfo,
  ).length;
  console.log(`[generateAutomationSuggestions] Prompt length: ${promptLength} characters`);

  // Generate AI suggestions
  const aiStartTime = performance.now();
  try {
    const { object, usage } = await generateObject({
      model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
      schema: SuggestionsSchema,
      system: AUTOMATION_SUGGESTIONS_SYSTEM_PROMPT,
      prompt: getAutomationSuggestionsPrompt(taskDescription, vendorList, contextInfo),
    });
    const aiTime = performance.now() - aiStartTime;
    console.log(
      `[generateAutomationSuggestions] AI generation completed in ${aiTime.toFixed(2)}ms (total tokens: ${usage?.totalTokens || 'unknown'})`,
    );

    const totalTime = performance.now() - startTime;
    console.log(
      `[generateAutomationSuggestions] Total time: ${totalTime.toFixed(2)}ms (vendors: ${vendorsTime.toFixed(2)}ms, context: ${contextTime.toFixed(2)}ms, AI: ${aiTime.toFixed(2)}ms)`,
    );

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
    const aiTime = performance.now() - aiStartTime;
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
              console.log(
                `[generateAutomationSuggestions] Recovered ${suggestions.length} suggestions from error response`,
              );
              return suggestions;
            }
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
    const totalTime = performance.now() - startTime;
    console.log(
      `[generateAutomationSuggestions] Total time: ${totalTime.toFixed(2)}ms (vendors: ${vendorsTime.toFixed(2)}ms, context: ${contextTime.toFixed(2)}ms, AI: ${aiTime.toFixed(2)}ms) - FAILED`,
    );
    return [];
  }
}

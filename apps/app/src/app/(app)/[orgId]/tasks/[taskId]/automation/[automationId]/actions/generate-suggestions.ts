'use server';

import { openai } from '@ai-sdk/openai';
import { db } from '@db';
import { generateObject } from 'ai';
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
  const { object, usage } = await generateObject({
    model: openai('gpt-4.1-mini'), // Testing gpt-5-nano for suggestions
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

  return object.suggestions;
}

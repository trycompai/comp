'use server';

import { openai } from '@ai-sdk/openai';
import { db } from '@db';
import { generateObject } from 'ai';
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
  // Get vendors from the Vendor table (reduced limit for faster processing)
  const vendors = await db.vendor.findMany({
    where: {
      organizationId,
    },
    select: {
      name: true,
      website: true,
      description: true,
    },
    take: 10, // Reduced from 20 to speed up processing
  });

  // Get vendors from context table as well (reduced limit for faster processing)
  const contextEntries = await db.context.findMany({
    where: {
      organizationId,
    },
    select: {
      question: true,
      answer: true,
    },
    take: 20, // Reduced from 50 to speed up processing
  });

  const vendorList =
    vendors.length > 0
      ? vendors.map((v) => `${v.name}${v.website ? ` (${v.website})` : ''}`).join(', ')
      : 'No vendors configured yet';

  const contextInfo =
    contextEntries.length > 0
      ? contextEntries
          .map((c) => `Q: ${c.question}\nA: ${c.answer}`)
          .slice(0, 5) // Reduced from 10 to speed up processing
          .join('\n\n')
      : 'No additional context available';

  const { object } = await generateObject({
    model: openai('gpt-4o-mini'), // Using faster model for quicker response
    schema: SuggestionsSchema,
    system: AUTOMATION_SUGGESTIONS_SYSTEM_PROMPT,
    prompt: getAutomationSuggestionsPrompt(taskDescription, vendorList, contextInfo),
  });

  return object.suggestions;
}

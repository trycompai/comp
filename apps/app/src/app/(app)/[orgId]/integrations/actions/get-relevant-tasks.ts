'use server';

import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

const RelevantTasksSchema = z.object({
  relevantTasks: z.array(
    z.object({
      taskTemplateId: z.string(),
      taskName: z.string(),
      reason: z.string(),
      prompt: z.string(),
    }),
  ),
});

export async function getRelevantTasksForIntegration(
  integrationName: string,
  integrationDescription: string,
  taskTemplates: Array<{ id: string; name: string; description: string }>,
): Promise<{ taskTemplateId: string; taskName: string; reason: string; prompt: string }[]> {
  if (taskTemplates.length === 0) {
    return [];
  }

  // Format task templates for the prompt (truncate descriptions to reduce token usage)
  const tasksList = taskTemplates
    .map((task) => {
      // Truncate description to max 100 chars to reduce token usage
      const truncatedDesc =
        task.description.length > 100
          ? task.description.substring(0, 100) + '...'
          : task.description;
      return `${task.id}|${task.name}|${truncatedDesc}`;
    })
    .join('\n');

  const systemPrompt = `GRC expert. Find tasks relevant to integration. Return JSON with: taskTemplateId, taskName, reason (1 sentence), prompt (actionable, ready to use). Be selective.`;

  const userPrompt = `Integration: ${integrationName} - ${integrationDescription}

Tasks (format: ID|Name|Description):
${tasksList}

Return only clearly relevant tasks.`;

  const promptSize = (systemPrompt + userPrompt).length;
  console.log(`[getRelevantTasks] Prompt size: ${promptSize} chars, ${taskTemplates.length} tasks`);

  try {
    const startTime = Date.now();
    const { object, usage } = await generateObject({
      model: openai('gpt-4.1-mini'),
      schema: RelevantTasksSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });
    const duration = Date.now() - startTime;

    console.log(
      `[getRelevantTasks] Generated ${object.relevantTasks.length} tasks in ${duration}ms (tokens: ${usage?.totalTokens || 'unknown'})`,
    );

    return object.relevantTasks;
  } catch (error) {
    console.error('Error generating relevant tasks:', error);
    return [];
  }
}

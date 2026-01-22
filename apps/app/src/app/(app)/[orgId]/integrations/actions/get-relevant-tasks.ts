'use server';

import { groq } from '@ai-sdk/groq';
import { generateObject, NoObjectGeneratedError } from 'ai';
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

  const systemPrompt = `GRC expert. Find tasks relevant to integration. Return JSON with an array of tasks. Each task must have: taskTemplateId, taskName, reason (1 sentence), prompt (actionable, ready to use). Be selective. ALWAYS return an array, even if there's only one task.`;

  const userPrompt = `Integration: ${integrationName} - ${integrationDescription}

Tasks (format: ID|Name|Description):
${tasksList}

Return ONLY clearly relevant tasks as an ARRAY. Format: {"relevantTasks": [{"taskTemplateId": "...", "taskName": "...", "reason": "...", "prompt": "..."}, ...]}`;

  const promptSize = (systemPrompt + userPrompt).length;
  console.log(`[getRelevantTasks] Prompt size: ${promptSize} chars, ${taskTemplates.length} tasks`);

  try {
    const startTime = Date.now();
    const { object, usage } = await generateObject({
      model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
      schema: RelevantTasksSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });
    const duration = Date.now() - startTime;

    // Handle case where model returns single object instead of array
    let tasks = object.relevantTasks;
    if (!Array.isArray(tasks)) {
      // If it's a single object, wrap it in an array
      if (tasks && typeof tasks === 'object' && 'taskTemplateId' in tasks) {
        tasks = [tasks];
      } else {
        tasks = [];
      }
    }

    console.log(
      `[getRelevantTasks] Generated ${tasks.length} tasks in ${duration}ms (tokens: ${usage?.totalTokens || 'unknown'})`,
    );

    return tasks;
  } catch (error) {
    console.error('Error generating relevant tasks:', error);
    // Try to extract tasks from error if available
    if (NoObjectGeneratedError.isInstance(error)) {
      try {
        const errorText = error.text;
        if (errorText) {
          const parsed = JSON.parse(errorText);
          if (parsed.relevantTasks) {
            const tasks = Array.isArray(parsed.relevantTasks)
              ? parsed.relevantTasks
              : [parsed.relevantTasks];
            if (tasks.length > 0 && tasks[0].taskTemplateId) {
              console.log(`[getRelevantTasks] Recovered ${tasks.length} tasks from error response`);
              return tasks;
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

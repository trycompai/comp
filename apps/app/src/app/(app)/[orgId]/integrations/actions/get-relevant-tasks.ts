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

export async function getRelevantTasksForIntegration({
  integrationName,
  integrationDescription,
  taskTemplates,
  examplePrompts,
}: {
  integrationName: string;
  integrationDescription: string;
  taskTemplates: Array<{ id: string; name: string; description: string }>;
  examplePrompts?: string[];
}): Promise<{ taskTemplateId: string; taskName: string; reason: string; prompt: string }[]> {
  // Defensive check for undefined or empty taskTemplates
  if (!taskTemplates || taskTemplates.length === 0) {
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

  // Create a set of valid task IDs for validation
  const validTaskIds = new Set(taskTemplates.map((t) => t.id));

  const systemPrompt = `You are a GRC expert matching compliance tasks to integrations.

CRITICAL RULES:
1. Every prompt you generate MUST be specific to "${integrationName}" - use the exact integration name
2. NEVER mention other vendors (e.g., don't say "Google Workspace" for Okta, don't say "Azure" for AWS)
3. Prompts should be actionable and ready to execute against ${integrationName}
4. Be selective - only return tasks that are clearly relevant to this specific integration
5. ONLY use taskTemplateId values from the provided list - do not invent new IDs

Return JSON with an array of tasks. Each task must have: taskTemplateId (from the list), taskName, reason (1 sentence), prompt (specific to ${integrationName}).`;

  const examplePromptsSection =
    examplePrompts && examplePrompts.length > 0
      ? `\n\nExample prompts showing the style for ${integrationName}:\n${examplePrompts
          .map((prompt, index) => `- ${prompt}`)
          .join('\n')}\n\nUse these as inspiration - generate similar prompts that mention ${integrationName} specifically.`
      : '';

  const userPrompt = `Integration: ${integrationName}
Description: ${integrationDescription}${examplePromptsSection}

Available Tasks (format: ID|Name|Description):
${tasksList}

Return ONLY tasks relevant to ${integrationName}. Each prompt MUST mention "${integrationName}" or be clearly specific to it.
Format: {"relevantTasks": [{"taskTemplateId": "...", "taskName": "...", "reason": "...", "prompt": "..."}, ...]}`;

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

    // Filter out any tasks with invalid taskTemplateIds (AI hallucination protection)
    const validTasks = tasks.filter((task) => {
      if (!validTaskIds.has(task.taskTemplateId)) {
        console.warn(
          `[getRelevantTasks] Filtered out invalid taskTemplateId: ${task.taskTemplateId}`,
        );
        return false;
      }
      return true;
    });

    console.log(
      `[getRelevantTasks] Generated ${validTasks.length} valid tasks (${tasks.length - validTasks.length} filtered) in ${duration}ms (tokens: ${usage?.totalTokens || 'unknown'})`,
    );

    return validTasks;
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
            // Filter to only valid task IDs
            const validTasks = tasks.filter(
              (t: { taskTemplateId?: string }) => t.taskTemplateId && validTaskIds.has(t.taskTemplateId),
            );
            if (validTasks.length > 0) {
              console.log(`[getRelevantTasks] Recovered ${validTasks.length} valid tasks from error response`);
              return validTasks;
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

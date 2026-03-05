import { auth } from '@/utils/auth';
import { groq } from '@ai-sdk/groq';
import { generateObject, NoObjectGeneratedError } from 'ai';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
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

const RequestSchema = z.object({
  integrationName: z.string(),
  integrationDescription: z.string(),
  taskTemplates: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
    }),
  ),
  examplePrompts: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = RequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const {
    integrationName,
    integrationDescription,
    taskTemplates,
    examplePrompts,
  } = parsed.data;

  if (!taskTemplates || taskTemplates.length === 0) {
    return NextResponse.json({ tasks: [] });
  }

  const validTaskIds = new Set(taskTemplates.map((t) => t.id));

  const tasksList = taskTemplates
    .map((task) => {
      const truncatedDesc =
        task.description.length > 100
          ? task.description.substring(0, 100) + '...'
          : task.description;
      return `${task.id}|${task.name}|${truncatedDesc}`;
    })
    .join('\n');

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
          .map((prompt) => `- ${prompt}`)
          .join('\n')}\n\nUse these as inspiration - generate similar prompts that mention ${integrationName} specifically.`
      : '';

  const userPrompt = `Integration: ${integrationName}
Description: ${integrationDescription}${examplePromptsSection}

Available Tasks (format: ID|Name|Description):
${tasksList}

Return ONLY tasks relevant to ${integrationName}. Each prompt MUST mention "${integrationName}" or be clearly specific to it.
Format: {"relevantTasks": [{"taskTemplateId": "...", "taskName": "...", "reason": "...", "prompt": "..."}, ...]}`;

  try {
    const { object } = await generateObject({
      model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
      schema: RelevantTasksSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    let tasks = object.relevantTasks;
    if (!Array.isArray(tasks)) {
      if (tasks && typeof tasks === 'object' && 'taskTemplateId' in tasks) {
        tasks = [tasks];
      } else {
        tasks = [];
      }
    }

    const validTasks = tasks.filter((task) =>
      validTaskIds.has(task.taskTemplateId),
    );

    return NextResponse.json({ tasks: validTasks });
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      try {
        const errorText = error.text;
        if (errorText) {
          const parsed = JSON.parse(errorText);
          if (parsed.relevantTasks) {
            const tasks = Array.isArray(parsed.relevantTasks)
              ? parsed.relevantTasks
              : [parsed.relevantTasks];
            const validTasks = tasks.filter(
              (t: { taskTemplateId?: string }) =>
                t.taskTemplateId && validTaskIds.has(t.taskTemplateId),
            );
            if (validTasks.length > 0) {
              return NextResponse.json({ tasks: validTasks });
            }
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
    console.error('Error generating relevant tasks:', error);
    return NextResponse.json({ tasks: [] });
  }
}

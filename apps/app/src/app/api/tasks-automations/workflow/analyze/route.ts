import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const WorkflowStepSchema = z.object({
  title: z.string().max(50).describe('A short, user-friendly title for this step (3-5 words max)'),
  description: z
    .string()
    .max(200)
    .describe('A clear explanation of what this step does in plain English'),
  type: z
    .enum(['trigger', 'action', 'condition', 'output'])
    .describe(
      'The category of step: use "trigger" for start, "action" for operations like login/fetch/process, "condition" for if/else logic, "output" for final results',
    ),
  iconType: z
    .enum(['start', 'fetch', 'login', 'check', 'process', 'filter', 'notify', 'complete', 'error'])
    .describe('The icon type that best represents this step'),
});

const WorkflowAnalysisSchema = z.object({
  steps: z
    .array(WorkflowStepSchema)
    .max(5)
    .describe('The workflow steps in order of execution (maximum 5 steps)'),
});

export async function POST(request: Request) {
  try {
    const { scriptContent } = await request.json();

    if (!scriptContent) {
      return NextResponse.json({ error: 'No script content provided' }, { status: 400 });
    }

    try {
      const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: WorkflowAnalysisSchema,
        prompt: `Analyze this Lambda function and break it down into simple, user-friendly workflow steps that a non-technical person can understand.

Here's the script:
${scriptContent}

CRITICAL: For the 'type' field, you MUST use one of these exact values:
- "trigger" - for the starting step
- "action" - for ANY operation (login, fetch data, process, compile, etc.)
- "condition" - for if/else or decision points
- "output" - for the final result/return step

DO NOT use "process" as a type - use "action" instead.

Guidelines:
1. Use simple, everyday language - avoid technical jargon
2. Focus on WHAT the automation does, not HOW it does it
3. Start with a trigger step (type: "trigger")
4. Include main actions like fetching data, logging in (type: "action")
5. Mark any if/else logic as (type: "condition")
6. End with what results are returned (type: "output")
7. Keep titles short (3-5 words)
8. Make descriptions clear and friendly
9. MAXIMUM 5 STEPS TOTAL - you MUST summarize and combine related actions
10. Group multiple similar operations into one step (e.g., "Process multiple items" instead of listing each)
11. Focus on the high-level flow, not implementation details

Example steps with correct types:
{
  "title": "Start Automation",
  "description": "Your automation begins running",
  "type": "trigger",
  "iconType": "start"
}
{
  "title": "Process Data",
  "description": "Working with the information provided",
  "type": "action",
  "iconType": "process"
}
{
  "title": "Check Results",
  "description": "Verifying if conditions are met",
  "type": "condition",
  "iconType": "check"
}
{
  "title": "Send Results",
  "description": "Delivering the final information",
  "type": "output",
  "iconType": "complete"
}`,
      });

      return NextResponse.json({ steps: object.steps });
    } catch (aiError: any) {
      console.error('AI generation error:', aiError);

      // Check if it's a validation error and try to extract what was generated
      if (aiError.cause?.value?.steps) {
        const rawSteps = aiError.cause.value.steps;

        // Fix invalid types
        const fixedSteps = rawSteps.map((step: any, index: number) => {
          let type = step.type;

          // Map invalid types to valid ones
          if (!['trigger', 'action', 'condition', 'output'].includes(type)) {
            if (type === 'process' || type === 'processing' || type === 'compile') {
              type = 'action';
            } else if (type === 'check' || type === 'validation' || type === 'verify') {
              type = 'condition';
            } else if (type === 'return' || type === 'result') {
              type = 'output';
            } else if (index === 0) {
              type = 'trigger';
            } else if (index === rawSteps.length - 1) {
              type = 'output';
            } else {
              type = 'action';
            }
          }

          return {
            title: (step.title || 'Step ' + (index + 1)).substring(0, 50),
            description: (step.description || 'Processing...').substring(0, 200),
            type,
            iconType: step.iconType || 'process',
          };
        });

        return NextResponse.json({ steps: fixedSteps.slice(0, 5) });
      }

      // If we can't recover, return a generic workflow
      return NextResponse.json({
        steps: [
          {
            title: 'Start Automation',
            description: 'The automation begins processing',
            type: 'trigger',
            iconType: 'start',
          },
          {
            title: 'Execute Logic',
            description: 'Running the automation steps',
            type: 'action',
            iconType: 'process',
          },
          {
            title: 'Return Results',
            description: 'Providing the final output',
            type: 'output',
            iconType: 'complete',
          },
        ],
      });
    }
  } catch (error) {
    console.error('Error analyzing workflow:', error);
    return NextResponse.json({ error: 'Failed to analyze workflow' }, { status: 500 });
  }
}

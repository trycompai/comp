import { MAP_POLICY_CONTROLS_PROMPT } from './prompts/map-policy-controls';
import { getPolicyText } from '@/jobs/lib/policy-text';
import { openai } from '@ai-sdk/openai';
import { db } from '@db';
import { logger, queue, schemaTask } from '@trigger.dev/sdk';
import { generateObject } from 'ai';
import { z } from 'zod';

const MAX_POLICY_CHARS = 8000;
const MAX_CONTROL_CHARS = 800;
const MIN_CONFIDENCE = 0.5;

const mapPolicyControlsQueue = queue({
  name: 'map-policy-controls',
  concurrencyLimit: 50,
});

const mapPolicyControlsSchema = z.object({
  organizationId: z.string(),
  policyId: z.string(),
});

type ControlContext = {
  id: string;
  name: string;
  description: string | null;
  requirements: Array<{
    identifier: string;
    name: string;
    description: string;
  }>;
};

type MatchResult = {
  controlId: string;
  confidence: number;
  rationale: string;
};

const responseSchema = z.object({
  matches: z
    .array(
      z.object({
        controlId: z.string(),
        confidence: z.number().min(0).max(1),
        rationale: z.string().min(1),
      }),
    )
    .default([]),
});

export const mapPolicyControlsTask = schemaTask({
  id: 'map-policy-controls',
  maxDuration: 600,
  queue: mapPolicyControlsQueue,
  retry: {
    maxAttempts: 3,
  },
  schema: mapPolicyControlsSchema,
  run: async ({ organizationId, policyId }) => {
    const policy = await db.policy.findUnique({
      where: { id: policyId, organizationId },
      include: {
        controls: { select: { id: true } },
        policyTemplate: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!policy) {
      throw new Error(`Policy ${policyId} not found for organization ${organizationId}`);
    }

    const [policyTextResult, controls] = await Promise.all([
      getPolicyText(policy),
      fetchControlContext(organizationId),
    ]);

    if (controls.length === 0) {
      logger.warn('No controls found for organization; skipping mapping', {
        organizationId,
        policyId,
      });
      return {
        policyId,
        organizationId,
        previousControlIds: policy.controls.map((c) => c.id),
        matchedControlIds: [],
        matches: [],
      };
    }

    if (!policyTextResult.text) {
      logger.warn('Policy text empty; clearing existing mappings', {
        organizationId,
        policyId,
      });
      await updatePolicyControls(policyId, organizationId, []);
      return {
        policyId,
        organizationId,
        previousControlIds: policy.controls.map((c) => c.id),
        matchedControlIds: [],
        matches: [],
      };
    }

    const policyText = truncate(policyTextResult.text, MAX_POLICY_CHARS);
    const controlsContext = controls.map((control) => formatControl(control)).join('\n---\n');

    const { object } = await generateObject({
      model: openai('gpt-5-mini'),
      mode: 'json',
      system: MAP_POLICY_CONTROLS_PROMPT,
      prompt: buildPrompt({
        policyName: policy.name,
        policyTemplateName: policy.policyTemplate?.name ?? null,
        policySource: policyTextResult.source,
        policyText,
        controlsContext,
      }),
      schema: responseSchema,
    });

    const allowedControlIds = new Set(controls.map((control) => control.id));
    const filteredMatches = (object.matches ?? [])
      .filter((match) => allowedControlIds.has(match.controlId))
      .filter((match) => match.confidence >= MIN_CONFIDENCE)
      .map((match) => ({
        controlId: match.controlId,
        confidence: roundTo(match.confidence, 2),
        rationale: truncate(match.rationale, 600),
      } as MatchResult));

    const uniqueControlIds = Array.from(new Set(filteredMatches.map((match) => match.controlId)));

    await updatePolicyControls(policyId, organizationId, uniqueControlIds);

    logger.info('Policy control mapping completed', {
      policyId,
      organizationId,
      matches: filteredMatches,
      previousControlIds: policy.controls.map((c) => c.id),
    });

    return {
      policyId,
      organizationId,
      previousControlIds: policy.controls.map((c) => c.id),
      matchedControlIds: uniqueControlIds,
      matches: filteredMatches,
    };
  },
});

async function fetchControlContext(organizationId: string): Promise<ControlContext[]> {
  const controls = await db.control.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      description: true,
      requirementsMapped: {
        select: {
          requirement: {
            select: {
              identifier: true,
              name: true,
              description: true,
            },
          },
        },
      },
    },
  });

  return controls.map((control) => ({
    id: control.id,
    name: control.name,
    description: control.description,
    requirements:
      control.requirementsMapped
        ?.map((map) => map.requirement)
        .filter((req): req is NonNullable<typeof req> => Boolean(req)) ?? [],
  }));
}

function formatControl(control: ControlContext): string {
  const requirementSummary = control.requirements
    .map((req) => {
      const parts = [req.identifier || req.name, req.description].filter(Boolean);
      return parts.join(' — ');
    })
    .filter(Boolean)
    .join('\n');

  const description = control.description ? truncate(control.description, MAX_CONTROL_CHARS) : 'No description provided.';

  const lines = [
    `Control ID: ${control.id}`,
    `Name: ${control.name}`,
    `Description: ${description}`,
  ];

  if (requirementSummary) {
    lines.push('Requirements:', requirementSummary);
  }

  return lines.join('\n');
}

async function updatePolicyControls(policyId: string, organizationId: string, controlIds: string[]) {
  await db.policy.update({
    where: { id: policyId, organizationId },
    data: {
      controls: {
        set: controlIds.map((id) => ({ id })),
      },
    },
  });
}

function buildPrompt({
  policyName,
  policyTemplateName,
  policySource,
  policyText,
  controlsContext,
}: {
  policyName: string;
  policyTemplateName: string | null;
  policySource: string;
  policyText: string;
  controlsContext: string;
}): string {
  return `Policy:
Name: ${policyName}
Template: ${policyTemplateName ?? 'N/A'}
Source: ${policySource}

Policy text:
${policyText}

Available controls:
${controlsContext}`;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

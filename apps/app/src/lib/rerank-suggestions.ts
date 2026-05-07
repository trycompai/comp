import { createGatewayProvider } from '@ai-sdk/gateway';
import { generateObject, jsonSchema } from 'ai';

/**
 * LLM reranker for the on-demand auto-link suggestion flow.
 *
 * Cosine similarity on `text-embedding-3-small` does a good job at recall (it
 * pulls the right ballpark of candidates) but is noisy on precision: the
 * scores collapse into a tight band for short compliance prose, so genuinely
 * on-target tasks ("Secure Devices: BitLocker / FileVault / MDM") and
 * surface-keyword matches ("Office Access & Door Monitoring") end up at the
 * same 0.61–0.64 cosine score.
 *
 * The reranker bridges that gap: a cheap GPT call reads each candidate's
 * title + description and scores 0–10 by actual mitigation effectiveness for
 * the given risk/vendor. The caller sorts by `rerankScore` and slices to the
 * final user-facing topK.
 */

export interface RerankSource {
  kind: 'risk' | 'vendor';
  title: string;
  description: string;
  category?: string;
  department?: string;
}

export interface RerankCandidate {
  id: string;
  title: string;
  description: string;
  cosineScore: number;
}

export interface RerankedCandidate {
  id: string;
  cosineScore: number;
  /** 0-10, returned by the LLM. Higher is more relevant. */
  rerankScore: number;
}

const gateway = createGatewayProvider({
  baseURL: process.env.AI_GATEWAY_BASE_URL,
});

const RERANK_MODEL = 'google/gemini-3.1-flash-lite-preview' as const;

const SYSTEM_PROMPT = `You are a GRC analyst evaluating which compliance tasks would meaningfully reduce a specific risk or vendor exposure.

Score each candidate 0-10 by its actual mitigation effectiveness:
- 10: directly addresses the root cause (primary control)
- 7-9: strongly contributes (supporting control)
- 4-6: weakly related but plausibly relevant
- 1-3: tangentially related at best
- 0: not relevant

Be strict. Surface keyword overlap is NOT relevance:
- A task about office physical security is not relevant to a risk about laptop data leakage just because both mention "employee"
- A task about employee performance reviews is not relevant to data security risks
- A task about contact information / public policies is not relevant to security risks

Return a score for every candidate, using the exact id provided.`;

const rerankSchema = jsonSchema<{
  scores: Array<{ id: string; score: number }>;
}>({
  type: 'object',
  properties: {
    scores: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          score: { type: 'number', minimum: 0, maximum: 10 },
        },
        required: ['id', 'score'],
        additionalProperties: false,
      },
    },
  },
  required: ['scores'],
  additionalProperties: false,
});

export async function rerankSuggestions({
  source,
  candidates,
}: {
  source: RerankSource;
  candidates: RerankCandidate[];
}): Promise<RerankedCandidate[]> {
  if (candidates.length === 0) return [];

  const userPrompt = [
    `Subject type: ${source.kind === 'risk' ? 'Risk' : 'Vendor'}`,
    `Title: ${source.title}`,
    `Description: ${source.description}`,
    source.category ? `Category: ${source.category}` : null,
    source.department ? `Department: ${source.department}` : null,
    '',
    `Candidate tasks (${candidates.length}):`,
    ...candidates.map(
      (c) =>
        `id=${c.id}\n  title: ${c.title}\n  description: ${(c.description ?? '').slice(0, 400)}`,
    ),
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const result = await generateObject({
    model: gateway(RERANK_MODEL),
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    schema: rerankSchema,
  });

  const scoreMap = new Map(
    result.object.scores.map((s) => [s.id, clamp(s.score, 0, 10)]),
  );

  return candidates
    .map((c) => ({
      id: c.id,
      cosineScore: c.cosineScore,
      rerankScore: scoreMap.get(c.id) ?? 0,
    }))
    .sort((a, b) => b.rerankScore - a.rerankScore);
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

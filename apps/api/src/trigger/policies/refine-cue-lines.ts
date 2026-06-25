import { anthropic } from '@ai-sdk/anthropic';
import { logger } from '@trigger.dev/sdk';
import { generateObject } from 'ai';
import { z } from 'zod';

const CUE_LINE_PATTERN =
  /^(State that|Clarify that|Add a |Include a |Specify |List |Note that|Require that|Describe |Define )/;

type JsonNode = Record<string, unknown>;

/**
 * Finds text nodes containing instruction cue lines (e.g. "State that...",
 * "Define..."). Returns an array of { path, text } entries where path is
 * the index chain to reach the text node in the content tree.
 */
function findCueLines(
  nodes: JsonNode[],
  path: number[] = [],
): Array<{ path: number[]; text: string }> {
  const results: Array<{ path: number[]; text: string }> = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (
      node.type === 'text' &&
      typeof node.text === 'string' &&
      CUE_LINE_PATTERN.test(node.text)
    ) {
      results.push({ path: [...path, i], text: node.text });
    }
    if (Array.isArray(node.content)) {
      results.push(...findCueLines(node.content as JsonNode[], [...path, i]));
    }
  }
  return results;
}

function setTextAtPath(
  nodes: JsonNode[],
  path: number[],
  newText: string,
): void {
  let current: JsonNode[] = nodes;
  for (let i = 0; i < path.length - 1; i++) {
    const node = current[path[i]];
    current = node.content as JsonNode[];
  }
  const target = current[path[path.length - 1]];
  target.text = newText;
}

/**
 * Rewrites instruction cue lines into direct policy language using a
 * targeted LLM call. Only fires when cue lines are detected — most
 * policies skip this entirely.
 */
export async function refineCueLines(
  content: JsonNode[],
  policyName: string,
): Promise<JsonNode[]> {
  const cueLines = findCueLines(content);
  if (cueLines.length === 0) return content;

  try {
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      system: `You rewrite policy template instructions into direct, professional policy language. Each input is an instruction (e.g. "State that...", "Define..."). Return the equivalent text as it should appear in a published security policy — authoritative, concise, no instructional phrasing.`,
      prompt: `Policy: "${policyName}"\n\nRewrite each instruction:\n${cueLines.map((c, i) => `${i + 1}. ${c.text}`).join('\n')}`,
      schema: z.object({
        rewrites: z.array(z.string()).length(cueLines.length),
      }),
    });

    for (let i = 0; i < cueLines.length; i++) {
      setTextAtPath(content, cueLines[i].path, object.rewrites[i]);
    }
  } catch (err) {
    logger.warn('Cue line refinement failed; keeping original text', {
      policyName,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return content;
}

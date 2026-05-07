type JsonNode = Record<string, unknown>;

const PLACEHOLDER_QUESTIONS: Array<[string, RegExp]> = [
  ['COMPANYINFO', /describe your company/i],
  ['INDUSTRY', /what industry/i],
  ['EMPLOYEES', /how many employees/i],
  ['DEVICES', /what devices/i],
  ['SOFTWARE', /what software/i],
  ['LOCATION', /how does your team work/i],
  ['CRITICAL', /where do you host/i],
  ['DATA', /what type(s)? of data/i],
  ['GEO', /where is your data/i],
];

const FRAMEWORK_MATCHERS: Array<[string, (n: string) => boolean]> = [
  ['soc2', (n) => /soc\s*2/i.test(n) || n.includes('soc')],
  ['hipaa', (n) => n.includes('hipaa')],
  ['pipeda', (n) => n.includes('pipeda')],
  ['gdpr', (n) => n.includes('gdpr')],
  ['iso27001', (n) => /iso\s*27001/i.test(n)],
  ['pci', (n) => /pci/i.test(n)],
  ['nist', (n) => /nist/i.test(n)],
  ['ccpa', (n) => n.includes('ccpa')],
];

export function buildVariables({
  companyName,
  contextHub,
}: {
  companyName: string;
  contextHub: string;
}): Record<string, string> {
  const vars: Record<string, string> = { COMPANY: companyName };
  const lines = contextHub.split('\n');

  for (let i = 0; i < lines.length - 1; i++) {
    for (const [key, pattern] of PLACEHOLDER_QUESTIONS) {
      if (!vars[key] && pattern.test(lines[i])) {
        vars[key] = lines[i + 1]?.trim() || 'N/A';
      }
    }
  }

  return vars;
}

export function buildFlags(
  frameworks: Array<{ name: string }>,
): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  for (const [flag, test] of FRAMEWORK_MATCHERS) {
    flags[flag] = frameworks.some((f) => test(f.name.toLowerCase()));
  }
  return flags;
}

function extractText(node: JsonNode): string {
  if (typeof node.text === 'string') return node.text;
  if (Array.isArray(node.content)) {
    return (node.content as JsonNode[]).map(extractText).join('');
  }
  return '';
}

function replacePlaceholdersInText(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => vars[key] ?? 'N/A');
}

function processInlineConditionals(text: string, flags: Record<string, boolean>): string {
  return text.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, flag: string, inner: string) => (flags[flag] ? inner : ''),
  );
}

function processTextNode(node: JsonNode, vars: Record<string, string>, flags: Record<string, boolean>): JsonNode | null {
  if (typeof node.text !== 'string') return node;

  let text = node.text;
  text = processInlineConditionals(text, flags);
  text = replacePlaceholdersInText(text, vars);

  if (!text) return null;
  return { ...node, text };
}

function processNode(node: JsonNode, vars: Record<string, string>, flags: Record<string, boolean>): JsonNode | null {
  if (node.type === 'text') {
    return processTextNode(node, vars, flags);
  }

  if (!Array.isArray(node.content)) return node;

  const processed = processContentArray(node.content as JsonNode[], vars, flags);
  if (processed.length === 0 && node.type !== 'document') return null;

  return { ...node, content: processed };
}

/**
 * Walks a TipTap content array, evaluates {{#if}}…{{/if}} blocks that
 * span multiple sibling nodes, replaces {{PLACEHOLDER}} values, and
 * returns the cleaned array. Fully deterministic — no LLM calls.
 */
export function processContentArray(
  nodes: JsonNode[],
  vars: Record<string, string>,
  flags: Record<string, boolean>,
): JsonNode[] {
  const result: JsonNode[] = [];
  let skipDepth = 0;

  for (const node of nodes) {
    const text = extractText(node);

    const openMatch = text.match(/\{\{#if\s+(\w+)\}\}/);
    const closeMatch = text.includes('{{/if}}');
    const hasOnlyMarker = /^\s*\{\{#if\s+\w+\}\}\s*$/.test(text) ||
                          /^\s*\{\{\/if\}\}\s*$/.test(text);

    if (openMatch && closeMatch) {
      if (skipDepth === 0) {
        const processed = processNode(node, vars, flags);
        if (processed) result.push(processed);
      }
      continue;
    }

    if (openMatch) {
      if (skipDepth > 0) {
        skipDepth++;
        continue;
      }
      const flag = openMatch[1];
      const isTrue = flags[flag] ?? false;
      if (!isTrue) {
        skipDepth++;
      } else if (!hasOnlyMarker) {
        const processed = processNode(node, vars, flags);
        if (processed) result.push(processed);
      }
      continue;
    }

    if (closeMatch) {
      if (skipDepth > 0) {
        skipDepth--;
      } else if (!hasOnlyMarker) {
        const processed = processNode(node, vars, flags);
        if (processed) result.push(processed);
      }
      continue;
    }

    if (skipDepth > 0) continue;

    const processed = processNode(node, vars, flags);
    if (processed) result.push(processed);
  }

  return result;
}

/**
 * Processes a full TipTap document: replaces handlebars placeholders with
 * real values and evaluates conditional blocks based on framework flags.
 * Returns the processed content array (inner nodes of the document).
 */
export function processTemplate({
  content,
  companyName,
  contextHub,
  frameworks,
}: {
  content: unknown;
  companyName: string;
  contextHub: string;
  frameworks: Array<{ name: string }>;
}): JsonNode[] {
  const vars = buildVariables({ companyName, contextHub });
  const flags = buildFlags(frameworks);

  let nodes: JsonNode[];
  if (
    content &&
    typeof content === 'object' &&
    'type' in (content as JsonNode) &&
    (content as JsonNode).type === 'doc' &&
    Array.isArray((content as JsonNode).content)
  ) {
    nodes = (content as JsonNode).content as JsonNode[];
  } else if (Array.isArray(content)) {
    nodes = content as JsonNode[];
  } else {
    return [];
  }

  return processContentArray(nodes, vars, flags);
}

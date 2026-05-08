import { readFileSync } from 'node:fs';
import path from 'node:path';

interface Operation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
}

const openapiPath = path.join(__dirname, '../../../packages/docs/openapi.json');
const doc = JSON.parse(readFileSync(openapiPath, 'utf8')) as {
  paths: Record<string, Record<string, Operation>>;
};

type Row = {
  method: string;
  path: string;
  summary: string;
  operationId: string;
  tag: string;
  flag: string;
};

const rows: Row[] = [];

for (const [routePath, methods] of Object.entries(doc.paths)) {
  for (const [method, op] of Object.entries(methods)) {
    if (typeof op !== 'object' || !op) continue;
    const summary = op.summary ?? '';
    const operationId = op.operationId ?? '';
    const tag = op.tags?.[0] ?? '(no tag)';

    let flag = '';
    if (!summary) flag = 'MISSING';
    else if (
      /^(Get|Post|Put|Patch|Delete)\b.*v1/i.test(summary) ||
      summary === operationId ||
      /Controller_/.test(summary)
    ) {
      flag = 'AUTO_GEN';
    }

    rows.push({ method: method.toUpperCase(), path: routePath, summary, operationId, tag, flag });
  }
}

rows.sort((a, b) => (a.tag + a.path).localeCompare(b.tag + b.path));

const flagged = rows.filter((r) => r.flag);
console.log(`Total operations: ${rows.length}`);
console.log(`Flagged: ${flagged.length}`);
console.log();

let currentTag = '';
for (const r of flagged) {
  if (r.tag !== currentTag) {
    currentTag = r.tag;
    console.log(`\n## ${currentTag}`);
  }
  console.log(`  [${r.flag.padEnd(9)}] ${r.method.padEnd(6)} ${r.path}  —  "${r.summary}"`);
}

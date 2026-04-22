#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const CATALOG_ROOT = join(REPO_ROOT, "integrations-catalog");
const INDEX_FILE = join(CATALOG_ROOT, "index.json");
const README_FILE = join(CATALOG_ROOT, "README.md");

const index = JSON.parse(readFileSync(INDEX_FILE, "utf8"));
const { total, byCategory, integrations, generatedAt } = index;

const categoriesSorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

const byCat = {};
for (const i of integrations) {
  const c = i.category || "Uncategorized";
  (byCat[c] ||= []).push(i);
}

const catSections = Object.keys(byCat)
  .sort()
  .map((cat) => {
    const rows = byCat[cat]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((i) => `| [${i.name}](${i.file}) | \`${i.slug}\` | ${i.authType} | ${i.checkCount} | ${i.syncSupported ? "✓" : ""} |`)
      .join("\n");
    return `### ${cat} (${byCat[cat].length})\n\n| Integration | Slug | Auth | Checks | Sync |\n|-------------|------|------|--------|------|\n${rows}\n`;
  })
  .join("\n");

const readme = `# CompAI Integrations Catalog

Public catalog of all compliance integrations available in the [CompAI](https://trycomp.ai) platform.

**${total} integrations** across ${Object.keys(byCategory).length} categories.

> Last updated: ${generatedAt.slice(0, 10)}

## What's in this catalog

Each \`integrations/<slug>.json\` file contains the public-facing metadata for one integration:

- **Vendor info:** name, slug, category, description, docs URL, base URL
- **Authentication:** auth type + customer-facing setup instructions + credential field labels
- **Checks:** names + descriptions + default severity of every compliance check we run
- **Capabilities:** employee sync support, multi-connection support

## What's NOT in this catalog

Implementation details are intentionally excluded:

- Check DSL (endpoint paths, request bodies, response parsing, aggregation logic)
- Sync definition (how we extract employees)
- Internal database IDs
- Credential field format hints or placeholders
- Vendor logos

## How to read a definition

\`\`\`bash
curl https://raw.githubusercontent.com/trycompai/comp/main/integrations-catalog/integrations/axonius.json | jq
\`\`\`

## Summary by category

${categoriesSorted.map(([cat, n]) => `- **${cat}** — ${n} integrations`).join("\n")}

## Full catalog

${catSections}

## How this is maintained

This catalog is synced manually on demand from the CompAI production API using the tooling in [\`tools/integrations-catalog-sync/\`](../tools/integrations-catalog-sync). To request a refreshed snapshot or a new integration, open an issue.

## License

MIT — see repo root LICENSE file.
`;

writeFileSync(README_FILE, readme);
console.log(`README.md written with ${total} integrations in ${Object.keys(byCategory).length} categories.`);

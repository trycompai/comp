import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { apiRequest } from "../src/lib/api-client.js";
import type { Framework, Requirement, ControlTemplate } from "../src/types.js";

const ROOT = resolve(import.meta.dir, "..");
const CSV_PATH = resolve(ROOT, "prescient.csv");
const DELAY_MS = 600;

// ── CSV Parser (RFC 4180) ──────────────────────────────────────────

function parseCSV(raw: string): string[][] {
  const content = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]!;

    if (inQuotes) {
      if (ch === '"' && content[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

// ── Trust ID parsing ───────────────────────────────────────────────

function parseTrustIds(trustIdField: string): string[] {
  return trustIdField
    .split(",")
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter((s) => /^(CC|A|C)\s*\d+\.\d+$/.test(s))
    .map((s) => s.replace(/^(CC|A|C)(\d)/, "$1 $2"));
}

// ── Requirement description extraction ─────────────────────────────

function parseCriteriaField(criteriaField: string): Map<string, string> {
  const result = new Map<string, string>();

  for (const line of criteriaField.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^((?:CC|A|C)\s*\d+\.\d+)\s*:\s*(.*)/s);
    if (match) {
      const id = match[1]!
        .replace(/^(CC|A|C)(\d)/, "$1 $2")
        .replace(/\s+/g, " ");
      result.set(id, match[2]!.trim());
    }
  }

  return result;
}

// ── API helpers ────────────────────────────────────────────────────

const delay = (ms: number) => Bun.sleep(ms);

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  attempts = 5,
): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await fn();
      await delay(DELAY_MS);
      return result;
    } catch (err) {
      const msg = (err as Error).message;
      const is429 = msg.includes("429") || msg.includes("Too Many Requests");
      if (i === attempts - 1) throw err;
      const backoff = is429 ? 10000 * 2 ** i : 1000 * (i + 1);
      console.error(`  Retry ${i + 1}/${attempts} for ${label} (wait ${backoff}ms)`);
      await delay(backoff);
    }
  }
  throw new Error("Unreachable");
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("Reading CSV...");
  const csvContent = readFileSync(CSV_PATH, "utf-8");
  const allRows = parseCSV(csvContent);

  const headerIdx = allRows.findIndex(
    (row) => row[0]?.trim() === "Control ID",
  );
  if (headerIdx === -1) throw new Error("Could not find header row");

  const dataRows = allRows
    .slice(headerIdx + 1)
    .filter((row) => row[0]?.trim().startsWith("PA-"));

  console.log(`Found ${dataRows.length} controls`);

  // ── Extract unique requirements from CSV ──
  const requirements = new Map<string, string>();

  for (const row of dataRows) {
    const trustIds = parseTrustIds(row[1] ?? "");
    const criteriaMap = parseCriteriaField(row[2] ?? "");

    for (const id of trustIds) {
      if (!requirements.has(id)) {
        const desc = criteriaMap.get(id);
        if (desc) {
          requirements.set(id, desc);
        } else {
          console.warn(`  Warning: no description found for ${id}`);
          requirements.set(id, id);
        }
      }
    }
  }

  console.log(`Found ${requirements.size} unique requirements`);

  // ── Check for existing framework (resume support) ──
  let frameworkId: string;
  const reqIds = new Map<string, string>();
  const existingControlNames = new Set<string>();

  const existingFrameworks = await apiRequest<Framework[]>("/framework", {
    query: { take: 200 },
  });
  const existing = existingFrameworks.find(
    (f) => f.name === "SOC 2 - Prescient",
  );

  if (existing) {
    frameworkId = existing.id;
    console.log(`\nResuming with existing framework: ${frameworkId}`);

    // Load existing requirements
    const existingReqs = await apiRequest<Requirement[]>("/requirement", {
      query: { take: 200 },
    });
    for (const req of existingReqs) {
      if (req.frameworkId === frameworkId && req.identifier) {
        reqIds.set(req.identifier, req.id);
      }
    }
    console.log(`  Found ${reqIds.size} existing requirements`);

    // Load existing controls linked to this framework
    const existingCtls = await apiRequest<ControlTemplate[]>(
      "/control-template",
      { query: { frameworkId, take: 200 } },
    );
    for (const ctl of existingCtls) {
      existingControlNames.add(ctl.name);
    }
    console.log(`  Found ${existingControlNames.size} existing controls`);
  } else {
    // ── Create framework ──
    console.log("\n--- Creating framework ---");
    const framework = await withRetry(
      () =>
        apiRequest<Framework>("/framework", {
          method: "POST",
          body: {
            name: "SOC 2 - Prescient",
            version: "2025",
            description:
              "SOC 2 Type II compliance framework with Prescient Assurance controls and Trust Services Criteria requirements.",
          },
        }),
      "create framework",
    );
    frameworkId = framework.id;
    console.log(`Framework created: ${frameworkId}`);
  }

  // ── Create missing requirements ──
  const missingReqs = [...requirements.entries()].filter(
    ([id]) => !reqIds.has(id),
  );
  if (missingReqs.length > 0) {
    console.log(`\n--- Creating ${missingReqs.length} requirements ---`);
    let reqIdx = 0;
    for (const [identifier, description] of missingReqs) {
      reqIdx++;
      const name =
        description.length > 255
          ? description.substring(0, 252) + "..."
          : description;

      const req = await withRetry(
        () =>
          apiRequest<Requirement>("/requirement", {
            method: "POST",
            body: { frameworkId, name, identifier, description },
          }),
        `create requirement ${identifier}`,
      );
      reqIds.set(identifier, req.id);
      console.log(
        `  [${reqIdx}/${missingReqs.length}] ${identifier} -> ${req.id}`,
      );
    }
  } else {
    console.log("\nAll requirements already exist, skipping.");
  }

  // ── Create controls, link to framework and requirements ──
  const missingControls = dataRows.filter(
    (row) => !existingControlNames.has(row[0]!.trim()),
  );
  console.log(
    `\n--- Creating ${missingControls.length} controls (${existingControlNames.size} already exist) ---`,
  );

  for (let i = 0; i < missingControls.length; i++) {
    const row = missingControls[i]!;
    const controlName = row[0]!.trim();
    const trustIds = parseTrustIds(row[1] ?? "");
    const controlActivity = (row[3] ?? "").trim();

    // Create control
    const ctl = await withRetry(
      () =>
        apiRequest<ControlTemplate>("/control-template", {
          method: "POST",
          body: { name: controlName, description: controlActivity },
        }),
      `create control ${controlName}`,
    );
    console.log(
      `  [${i + 1}/${missingControls.length}] ${controlName} -> ${ctl.id}`,
    );

    // Link to each specific requirement (NOT framework link-control which auto-links ALL requirements)
    for (const trustId of trustIds) {
      const reqId = reqIds.get(trustId);
      if (reqId) {
        await withRetry(
          () =>
            apiRequest(
              `/control-template/${ctl.id}/requirements/${reqId}`,
              { method: "POST" },
            ),
          `link ${controlName} to ${trustId}`,
        );
      } else {
        console.warn(`  Warning: no requirement ID for ${trustId}`);
      }
    }
  }

  console.log("\nDone!");
  console.log(`  Framework: ${frameworkId}`);
  console.log(`  Requirements: ${reqIds.size}`);
  console.log(`  Controls: ${dataRows.length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

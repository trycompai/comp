import { Injectable, Logger } from '@nestjs/common';
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { CheckResultRow } from './check-results.service';

/** One normalized evidence entry about a specific person. */
export interface PersonEvidenceEntry {
  /** Best-effort one-line summary (role, status, …). */
  summary: string;
  /** Curated field/value pairs, ready to render. */
  fields: Record<string, string>;
  /** The untouched source record. Null for AI-extracted entries. */
  raw: unknown;
  /** How this entry was obtained — AI entries must be labeled in any UI. */
  source: 'deterministic' | 'ai';
}

export interface PersonEvidenceExtraction {
  /**
   * found      — entries for this person were extracted
   * not-found  — the person provably isn't in this data (email absent, or
   *              verified absent) — a legitimate compliance answer
   * unparsed   — the person's email appears in the data but neither the
   *              deterministic shapes nor the AI fallback could extract it
   */
  status: 'found' | 'not-found' | 'unparsed';
  entries: PersonEvidenceEntry[];
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const asString = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v : undefined;

/** Field names checks commonly use for a person's email. */
const EMAIL_KEYS = ['email', 'primaryEmail', 'userEmail', 'mail', 'emailAddress'];
/** Evidence keys that commonly hold per-person rosters. */
const ROSTER_KEYS = ['employees', 'users', 'members', 'accounts', 'people'];
/** Well-known fields worth promoting into the curated view. */
const PROMOTED_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'role', label: 'Role' },
  { key: 'roles', label: 'Roles' },
  { key: 'isAdmin', label: 'Admin' },
  { key: 'isDelegatedAdmin', label: 'Delegated admin' },
  { key: 'status', label: 'Status' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'orgUnit', label: 'Org unit' },
  { key: 'lastLoginTime', label: 'Last login' },
  { key: 'lastLogin', label: 'Last login' },
  { key: 'permissions', label: 'Permissions' },
];

/** Bounds for what we're willing to send to the AI fallback. */
const MAX_AI_INPUT_CHARS = 60_000;
const EMAIL_WINDOW_CHARS = 1_500;
const MAX_EMAIL_WINDOWS = 10;

function recordEmail(record: Record<string, unknown>): string | undefined {
  for (const key of EMAIL_KEYS) {
    const value = asString(record[key]);
    if (value) return value.toLowerCase().trim();
  }
  return undefined;
}

function toEntry(
  record: Record<string, unknown>,
  fallbackSummary: string,
): PersonEvidenceEntry {
  const fields: Record<string, string> = {};
  for (const { key, label } of PROMOTED_FIELDS) {
    const value = record[key];
    if (value === undefined || value === null || fields[label]) continue;
    fields[label] = Array.isArray(value) ? value.map(String).join(', ') : String(value);
  }
  const summary =
    asString(record['role']) ??
    (Array.isArray(record['roles']) ? record['roles'].map(String).join(', ') : undefined) ??
    fallbackSummary;
  return { summary, fields, raw: record, source: 'deterministic' };
}

/**
 * Deterministic pass. Tolerates the two shapes checks use in the wild:
 *  A) one result row per user (resourceId = email)
 *  B) one org-level row whose evidence embeds a roster array
 * Exported for direct unit testing.
 */
export function extractDeterministic(
  results: CheckResultRow[],
  email: string,
): PersonEvidenceEntry[] {
  const entries: PersonEvidenceEntry[] = [];

  for (const row of results) {
    if (row.resourceId.toLowerCase().trim() === email) {
      const evidence = isRecord(row.evidence) ? row.evidence : {};
      entries.push(toEntry({ ...evidence }, row.title || row.description || 'Access record'));
      continue;
    }

    if (!isRecord(row.evidence)) continue;
    for (const rosterKey of ROSTER_KEYS) {
      const roster = row.evidence[rosterKey];
      if (!Array.isArray(roster)) continue;
      for (const item of roster) {
        if (isRecord(item) && recordEmail(item) === email) {
          entries.push(toEntry(item, row.title || 'Access record'));
        }
      }
    }
  }

  return entries;
}

/**
 * Pre-gate: if the email appears NOWHERE in the serialized evidence, the
 * person provably isn't in this data — no AI call can change that, so we
 * never make one. This is both the cost bound and the hallucination guard.
 * Exported for direct unit testing.
 */
export function evidenceMentionsEmail(results: CheckResultRow[], email: string): boolean {
  return results.some((row) => serializeRow(row).toLowerCase().includes(email));
}

function serializeRow(row: CheckResultRow): string {
  try {
    return `${row.resourceId} ${JSON.stringify(row.evidence) ?? ''}`;
  } catch {
    return row.resourceId;
  }
}

/**
 * Bounded excerpt for the AI fallback: only rows that mention the email, and
 * for oversized rows only windows of text around each mention — never the
 * whole payload.
 */
function buildAiExcerpt(results: CheckResultRow[], email: string): string {
  const parts: string[] = [];
  for (const row of results) {
    const serialized = serializeRow(row);
    const lower = serialized.toLowerCase();
    if (!lower.includes(email)) continue;

    if (serialized.length <= MAX_AI_INPUT_CHARS / 2) {
      parts.push(serialized);
    } else {
      let from = 0;
      for (let i = 0; i < MAX_EMAIL_WINDOWS; i++) {
        const at = lower.indexOf(email, from);
        if (at === -1) break;
        parts.push(
          serialized.slice(Math.max(0, at - EMAIL_WINDOW_CHARS), at + EMAIL_WINDOW_CHARS),
        );
        from = at + email.length;
      }
    }
    if (parts.join('\n').length > MAX_AI_INPUT_CHARS) break;
  }
  return parts.join('\n---\n').slice(0, MAX_AI_INPUT_CHARS);
}

const aiExtractionSchema = z.object({
  found: z.boolean(),
  entries: z
    .array(
      z.object({
        summary: z.string(),
        fields: z.record(z.string(), z.string()),
      }),
    )
    .default([]),
});

/**
 * Universal "find this person in this check's evidence" extraction, shared by
 * every feature that consumes check results (Access tab today; any future
 * consumer for free). Ladder:
 *   1. deterministic shape matching (free, instant, always preferred)
 *   2. email pre-gate (absent email -> confident not-found, no AI ever)
 *   3. Haiku fallback with a strict schema, only for unknown shapes
 * AI never invents: it only runs when the email verifiably appears in the
 * evidence, and its entries are labeled source:'ai' for the UI.
 */
@Injectable()
export class EvidenceExtractionService {
  private readonly logger = new Logger(EvidenceExtractionService.name);

  async extractPersonEntries({
    results,
    email,
    purpose,
  }: {
    results: CheckResultRow[];
    email: string;
    /** One line telling the model what kind of facts matter, e.g. "employee access: roles, permissions, admin status". */
    purpose: string;
  }): Promise<PersonEvidenceExtraction> {
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail || results.length === 0) {
      return { status: 'not-found', entries: [] };
    }

    const deterministic = extractDeterministic(results, normalizedEmail);
    if (deterministic.length > 0) {
      return { status: 'found', entries: deterministic };
    }

    if (!evidenceMentionsEmail(results, normalizedEmail)) {
      return { status: 'not-found', entries: [] };
    }

    // Email is present but in a shape we don't parse — the narrow AI case.
    if (!process.env.ANTHROPIC_API_KEY) {
      return { status: 'unparsed', entries: [] };
    }

    try {
      const excerpt = buildAiExcerpt(results, normalizedEmail);
      const { object } = await generateObject({
        model: anthropic('claude-haiku-4-5'),
        schema: aiExtractionSchema,
        prompt: [
          `You extract facts about one specific person from integration check evidence (JSON).`,
          `Topic: ${purpose}.`,
          `Person's email: ${normalizedEmail}`,
          ``,
          `Rules:`,
          `- Use ONLY the evidence below. Never infer or invent values.`,
          `- If the evidence contains no facts about this person, return found=false.`,
          `- fields must be short label/value pairs copied from the evidence.`,
          ``,
          `Evidence:`,
          excerpt,
        ].join('\n'),
      });

      if (!object.found || object.entries.length === 0) {
        return { status: 'not-found', entries: [] };
      }
      return {
        status: 'found',
        entries: object.entries.map((e) => ({
          summary: e.summary,
          fields: e.fields,
          raw: null,
          source: 'ai' as const,
        })),
      };
    } catch (err) {
      // AI unavailability must never break the read path — degrade honestly.
      this.logger.warn(
        `AI evidence extraction failed for ${normalizedEmail}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { status: 'unparsed', entries: [] };
    }
  }
}

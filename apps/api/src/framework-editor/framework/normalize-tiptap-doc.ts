// Type-only import: keeps this helper (and its unit test) from instantiating
// the Prisma client at module load.
import type { Prisma } from '@db';

/**
 * Normalize arbitrary stored/imported policy content into a `{ type: 'doc', … }`
 * document node.
 *
 * Policy content lives in an untyped `Json` column and legitimately appears in
 * several shapes: a proper doc object, a bare array of nodes (legacy/seeded
 * data), a single node, or nothing. Export passes whatever is stored through
 * verbatim, and the import DTO used to require an object — so array-shaped
 * content was rejected ("content must be an object").
 *
 * This mirrors the top-level branches of the editor's
 * `validateAndFixTipTapContent` (packages/ui) without the deep node repair —
 * onboarding/render consumers run their own sanitization. We only need a valid
 * top-level doc shape. Returning `{ type: 'doc', content: [] }` for empty input
 * (instead of a bare `{}`) also avoids the footgun where onboarding silently
 * turns `{}` into an empty policy.
 */
export function normalizeTipTapDoc(content: unknown): Prisma.InputJsonObject {
  // Bare array of nodes → wrap as a doc.
  if (Array.isArray(content)) {
    return { type: 'doc', content: content as Prisma.InputJsonValue[] };
  }

  if (content !== null && typeof content === 'object') {
    const node = content as { type?: unknown; content?: unknown };

    // Already a doc → keep its content array (or empty it if malformed).
    if (node.type === 'doc') {
      return {
        type: 'doc',
        content: Array.isArray(node.content) ? (node.content as Prisma.InputJsonValue[]) : [],
      };
    }

    // A single non-doc node (has a string type) → wrap it.
    if (typeof node.type === 'string') {
      return { type: 'doc', content: [content as Prisma.InputJsonValue] };
    }
  }

  // Missing / empty / non-node value → empty doc.
  return { type: 'doc', content: [] };
}

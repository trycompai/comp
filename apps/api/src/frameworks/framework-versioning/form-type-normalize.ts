/**
 * EvidenceFormType has `@map` directives that expose hyphenated labels at the
 * DB level (e.g. `"infrastructure-inventory"`) while the Prisma client uses
 * underscored names (e.g. `"infrastructure_inventory"`).
 *
 * The one-shot backfill data migration
 * (20260423121434_backfill_framework_versions) serialized doc types via
 * `to_jsonb(ct."documentTypes"::text[])`, which renders the DB @map'd form.
 * So every backfilled v1.0.0 manifest stored hyphens. Newer manifests built
 * through the TS manifest builder store underscores (what Prisma client
 * returns).
 *
 * Any code that passes `formType` from a manifest into the Prisma client
 * must normalize first, otherwise Prisma throws
 * `PrismaClientValidationError: Invalid value for argument `formType`` on
 * the hyphen form.
 *
 * Every `@map` in the schema just swaps `_` → `-`, so hyphens-to-underscores
 * covers all existing values and any future ones CX adds — no hardcoded list
 * to keep in sync.
 */
export function normalizeFormType(value: string): string {
  return value.replace(/-/g, '_');
}

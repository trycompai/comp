/**
 * Upper bound for `skip` on audit-log queries. Offset pagination scans and
 * discards every preceding row, so an unbounded `?offset=` could be used to
 * force arbitrarily large table scans. 100k is far beyond any realistic UI
 * paging depth (the pager fetches 100 rows/batch) while capping that abuse.
 *
 * Kept dependency-free (no `@db` import) so controllers/services can pull it in
 * without dragging Prisma enums into their unit-test module graph.
 */
export const MAX_AUDIT_LOG_OFFSET = 100_000;

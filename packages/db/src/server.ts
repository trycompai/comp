// Server-only entry point -- superset of index.ts
// Re-export all browser-safe types and enums
export * from './generated/prisma/browser';

// Server-only: full Prisma namespace (overrides browser Prisma namespace)
export { PrismaClient, Prisma } from './generated/prisma/client';

// Server-only: database instance
export { db } from './client';

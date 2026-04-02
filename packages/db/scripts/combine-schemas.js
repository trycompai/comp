#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, '../prisma');
const SCHEMA_DIR = path.join(__dirname, '../prisma/schema');
const BASE_SCHEMA = path.join(__dirname, '../prisma/schema.prisma');
const OUTPUT_DIR = path.join(__dirname, '../dist');
const OUTPUT_SCHEMA = path.join(OUTPUT_DIR, 'schema.prisma');

console.log('🔨 Combining Prisma schema files...');

// Read the base schema file
let combinedSchema = fs.readFileSync(BASE_SCHEMA, 'utf8');

// Read all .prisma files from the schema directory
const schemaFiles = fs
  .readdirSync(SCHEMA_DIR)
  .filter((file) => file.endsWith('.prisma'))
  .sort(); // Sort for consistent output

console.log(`📁 Found ${schemaFiles.length} schema files to combine`);

// Append each schema file
schemaFiles.forEach((file) => {
  console.log(`  - Adding ${file}`);
  const content = fs.readFileSync(path.join(SCHEMA_DIR, file), 'utf8');

  // Ensure we have proper line breaks
  combinedSchema += '\n\n';

  // Add a comment separator for clarity
  combinedSchema += `// ===== ${file} =====\n`;
  combinedSchema += content;

  // Ensure content ends with a newline
  if (!content.endsWith('\n')) {
    combinedSchema += '\n';
  }
});

// Ensure the output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Write the combined schema
fs.writeFileSync(OUTPUT_SCHEMA, combinedSchema);

// Copy the client, index, and types files
const clientFileContent = `import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getSslConfig(url: string) {
  const match = url.match(/sslmode=(\\w[\\w-]*)/);
  if (!match) return undefined;
  const mode = match[1];
  switch (mode) {
    case 'disable': return undefined;
    case 'require': case 'no-verify': return { rejectUnauthorized: false };
    case 'verify-ca': case 'verify-full': return { rejectUnauthorized: true };
    default: return undefined;
  }
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString: url, ssl: getSslConfig(url) });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma || createPrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
`;
fs.writeFileSync(path.join(OUTPUT_DIR, 'client.ts'), clientFileContent);

// Create an index file — browser-safe types only for monorepo consumption.
// The db instance is server-only and must be imported from './client' directly.
const indexFileContent = `export * from '../src/generated/prisma/browser';
`;
fs.writeFileSync(path.join(OUTPUT_DIR, 'index.ts'), indexFileContent);

console.log(`✅ Combined schema written to: ${OUTPUT_SCHEMA}`);
console.log(`📏 Total size: ${Math.round(combinedSchema.length / 1024)}KB`);
console.log(`🎯 Schema ready for distribution - users will generate their own Prisma client`);

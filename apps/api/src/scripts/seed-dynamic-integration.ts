#!/usr/bin/env bun
/**
 * Seed a dynamic integration from a JSON file.
 *
 * Usage:
 *   bun run apps/api/src/scripts/seed-dynamic-integration.ts ./path/to/integration.json
 *
 * The JSON file should match the DynamicIntegrationDefinition schema.
 * This script will:
 *   1. Validate the definition with Zod
 *   2. Upsert the integration and all checks into the DB
 *   3. Upsert the IntegrationProvider row
 *   4. Print success/failure
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { db } from '@db';
import { validateIntegrationDefinition } from '@trycompai/integration-platform';

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Usage: bun run seed-dynamic-integration.ts <path-to-json>');
    process.exit(1);
  }

  const absolutePath = resolve(filePath);
  console.log(`Reading integration definition from: ${absolutePath}`);

  let rawJson: unknown;
  try {
    const content = readFileSync(absolutePath, 'utf-8');
    rawJson = JSON.parse(content);
  } catch (error) {
    console.error(`Failed to read/parse JSON file: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  // Validate
  const validation = validateIntegrationDefinition(rawJson);
  if (!validation.success) {
    console.error('Validation failed:');
    for (const err of validation.errors!) {
      console.error(`  - ${err.path}: ${err.message}`);
    }
    process.exit(1);
  }

  const def = validation.data!;
  console.log(`Validated: ${def.name} (${def.slug}) with ${def.checks.length} checks`);

  // Helper to convert to Prisma-compatible JSON
  const toJson = (val: unknown) => JSON.parse(JSON.stringify(val));

  // Upsert integration
  const integration = await db.dynamicIntegration.upsert({
    where: { slug: def.slug },
    create: {
      slug: def.slug,
      name: def.name,
      description: def.description,
      category: def.category,
      logoUrl: def.logoUrl,
      docsUrl: def.docsUrl,
      baseUrl: def.baseUrl,
      defaultHeaders: def.defaultHeaders ? toJson(def.defaultHeaders) : undefined,
      authConfig: toJson(def.authConfig),
      capabilities: toJson(def.capabilities),
      supportsMultipleConnections: def.supportsMultipleConnections ?? false,
      syncDefinition: (rawJson as Record<string, unknown>).syncDefinition
        ? toJson((rawJson as Record<string, unknown>).syncDefinition)
        : undefined,
      isActive: true,
    },
    update: {
      name: def.name,
      description: def.description,
      category: def.category,
      logoUrl: def.logoUrl,
      docsUrl: def.docsUrl,
      baseUrl: def.baseUrl,
      defaultHeaders: def.defaultHeaders ? toJson(def.defaultHeaders) : undefined,
      authConfig: toJson(def.authConfig),
      capabilities: toJson(def.capabilities),
      supportsMultipleConnections: def.supportsMultipleConnections ?? false,
      syncDefinition: (rawJson as Record<string, unknown>).syncDefinition
        ? toJson((rawJson as Record<string, unknown>).syncDefinition)
        : undefined,
    },
  });

  console.log(`Upserted integration: ${integration.id}`);

  // Upsert checks
  for (const [index, check] of def.checks.entries()) {
    const dbCheck = await db.dynamicCheck.upsert({
      where: {
        integrationId_checkSlug: {
          integrationId: integration.id,
          checkSlug: check.checkSlug,
        },
      },
      create: {
        integrationId: integration.id,
        checkSlug: check.checkSlug,
        name: check.name,
        description: check.description,
        taskMapping: check.taskMapping,
        defaultSeverity: check.defaultSeverity ?? 'medium',
        definition: toJson(check.definition),
        variables: toJson(check.variables ?? []),
        isEnabled: check.isEnabled ?? true,
        sortOrder: check.sortOrder ?? index,
      },
      update: {
        name: check.name,
        description: check.description,
        taskMapping: check.taskMapping,
        defaultSeverity: check.defaultSeverity ?? 'medium',
        definition: toJson(check.definition),
        variables: toJson(check.variables ?? []),
        isEnabled: check.isEnabled ?? true,
        sortOrder: check.sortOrder ?? index,
      },
    });

    console.log(`  Upserted check: ${dbCheck.checkSlug} (${dbCheck.id})`);
  }

  // Upsert IntegrationProvider row
  await db.integrationProvider.upsert({
    where: { slug: def.slug },
    create: {
      slug: def.slug,
      name: def.name,
      category: def.category,
      capabilities: toJson(def.capabilities),
      isActive: true,
    },
    update: {
      name: def.name,
      category: def.category,
      capabilities: toJson(def.capabilities),
      isActive: true,
    },
  });

  console.log(`Upserted IntegrationProvider for ${def.slug}`);
  console.log(`\nDone! Integration "${def.name}" is now live.`);
  console.log('The registry will pick it up on the next refresh (within 60 seconds) or on API restart.');

  process.exit(0);
}

main().catch((error) => {
  console.error('Seed script failed:', error);
  process.exit(1);
});

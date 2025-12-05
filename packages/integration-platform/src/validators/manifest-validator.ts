#!/usr/bin/env bun
/**
 * Manifest Validator CLI
 *
 * Validates all integration manifests in the registry.
 * Run with: bun run src/validators/manifest-validator.ts
 */

import { registry } from '../registry';
import type { IntegrationManifest } from '../types';

interface ValidationResult {
  id: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateManifest(manifest: IntegrationManifest): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!manifest.id) errors.push('Missing required field: id');
  if (!manifest.name) errors.push('Missing required field: name');
  if (!manifest.description) errors.push('Missing required field: description');
  if (!manifest.category) errors.push('Missing required field: category');
  if (!manifest.logoUrl) errors.push('Missing required field: logoUrl');
  if (!manifest.auth) errors.push('Missing required field: auth');

  // ID format
  if (manifest.id && !/^[a-z][a-z0-9-]*$/.test(manifest.id)) {
    errors.push('ID must be lowercase alphanumeric with hyphens, starting with a letter');
  }

  // Auth validation
  if (manifest.auth) {
    switch (manifest.auth.type) {
      case 'oauth2': {
        const config = manifest.auth.config;
        if (!config.authorizeUrl) errors.push('OAuth2: Missing authorizeUrl');
        if (!config.tokenUrl) errors.push('OAuth2: Missing tokenUrl');
        if (!config.scopes || config.scopes.length === 0) {
          warnings.push('OAuth2: No scopes defined');
        }
        if (!config.setupInstructions) {
          warnings.push('OAuth2: Consider adding setupInstructions for admins');
        }
        break;
      }
      case 'api_key': {
        const config = manifest.auth.config;
        if (!config.in) errors.push('API Key: Missing "in" field (header or query)');
        if (!config.name) errors.push('API Key: Missing "name" field');
        break;
      }
      case 'basic': {
        // Basic auth has sensible defaults
        break;
      }
      case 'jwt': {
        const config = manifest.auth.config;
        if (!config.issuer) errors.push('JWT: Missing issuer');
        if (!config.audience) errors.push('JWT: Missing audience');
        if (!config.algorithm) errors.push('JWT: Missing algorithm');
        break;
      }
    }
  }

  // Capabilities validation
  if (!manifest.capabilities || manifest.capabilities.length === 0) {
    errors.push('Must have at least one capability');
  }

  // Checks validation
  if (manifest.capabilities?.includes('checks')) {
    if (!manifest.checks || manifest.checks.length === 0) {
      warnings.push('Has checks capability but no checks defined');
    } else {
      // Validate each check
      for (const check of manifest.checks) {
        if (!check.id) errors.push(`Check missing id`);
        if (!check.name) errors.push(`Check ${check.id}: missing name`);
        if (!check.description) warnings.push(`Check ${check.id}: missing description`);
        if (!check.run) errors.push(`Check ${check.id}: missing run function`);
        if (!check.taskMapping) {
          warnings.push(`Check ${check.id}: no taskMapping - won't auto-complete tasks`);
        }
      }
    }
  }

  // Webhook config validation
  if (manifest.capabilities?.includes('webhook') && !manifest.webhook) {
    warnings.push('Has webhook capability but no webhook config defined');
  }

  // Inactive warning
  if (!manifest.isActive) {
    warnings.push('Integration is marked as inactive');
  }

  return {
    id: manifest.id || 'unknown',
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function main() {
  console.log('🔍 Validating integration manifests...\n');

  const manifests = registry.getAllManifests();
  const results: ValidationResult[] = [];

  for (const manifest of manifests) {
    results.push(validateManifest(manifest));
  }

  let hasErrors = false;

  for (const result of results) {
    const status = result.valid ? '✅' : '❌';
    console.log(`${status} ${result.id}`);

    if (result.errors.length > 0) {
      hasErrors = true;
      for (const error of result.errors) {
        console.log(`   ❌ ERROR: ${error}`);
      }
    }

    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        console.log(`   ⚠️  WARNING: ${warning}`);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Total: ${manifests.length} manifests`);
  console.log(`Valid: ${results.filter((r) => r.valid).length}`);
  console.log(`Invalid: ${results.filter((r) => !r.valid).length}`);

  if (hasErrors) {
    console.log('\n❌ Validation failed');
    process.exit(1);
  } else {
    console.log('\n✅ All manifests valid');
    process.exit(0);
  }
}

main();

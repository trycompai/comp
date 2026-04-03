import type {
  AuthStrategy,
  IntegrationCategory,
  IntegrationHandler,
  IntegrationManifest,
  IntegrationRegistry,
} from '../types';

// Import all manifests (each in its own folder)
import { manifest as aikidoManifest } from '../manifests/aikido';
import { awsManifest } from '../manifests/aws';
import { azureManifest } from '../manifests/azure';
import { gcpManifest } from '../manifests/gcp';
import { manifest as githubManifest } from '../manifests/github';
import { googleWorkspaceManifest } from '../manifests/google-workspace';
import { manifest as jumpcloudManifest } from '../manifests/jumpcloud';
import { ripplingManifest } from '../manifests/rippling';
import { vercelManifest } from '../manifests/vercel';

// ============================================================================
// Registry Implementation
// ============================================================================

class IntegrationRegistryImpl implements IntegrationRegistry {
  private manifests: Map<string, IntegrationManifest> = new Map();
  /** IDs of code-based manifests — these can never be overridden by dynamic ones */
  private codeManifestIds: Set<string> = new Set();

  constructor(manifests: IntegrationManifest[]) {
    // Validate and register manifests
    for (const manifest of manifests) {
      this.validateManifest(manifest);

      if (this.manifests.has(manifest.id)) {
        throw new Error(`Duplicate integration ID: ${manifest.id}`);
      }

      this.manifests.set(manifest.id, manifest);
      this.codeManifestIds.add(manifest.id);
    }
  }

  private validateManifest(manifest: IntegrationManifest): void {
    if (!manifest.id || typeof manifest.id !== 'string') {
      throw new Error('Integration manifest must have a valid id');
    }

    if (!manifest.name || typeof manifest.name !== 'string') {
      throw new Error(`Integration ${manifest.id}: must have a valid name`);
    }

    if (!manifest.auth) {
      throw new Error(`Integration ${manifest.id}: must have an auth strategy`);
    }

    if (manifest.auth.type === 'oauth2') {
      const config = manifest.auth.config;
      if (!config.authorizeUrl || !config.tokenUrl) {
        throw new Error(`Integration ${manifest.id}: OAuth2 requires authorizeUrl and tokenUrl`);
      }
    }

    if (!manifest.capabilities || manifest.capabilities.length === 0) {
      throw new Error(`Integration ${manifest.id}: must have at least one capability`);
    }
  }

  // ==================== Dynamic Manifest Management ====================

  registerDynamic(manifest: IntegrationManifest): void {
    if (this.codeManifestIds.has(manifest.id)) return;
    this.validateManifest(manifest);
    this.manifests.set(manifest.id, manifest);
  }

  unregisterDynamic(id: string): void {
    if (this.codeManifestIds.has(id)) return;
    this.manifests.delete(id);
  }

  refreshDynamic(manifests: IntegrationManifest[]): void {
    const valid: IntegrationManifest[] = [];
    for (const manifest of manifests) {
      if (this.codeManifestIds.has(manifest.id)) continue;
      try {
        this.validateManifest(manifest);
        valid.push(manifest);
      } catch {
        // Skip invalid manifests — one bad row should not wipe others
      }
    }

    for (const id of this.manifests.keys()) {
      if (!this.codeManifestIds.has(id)) {
        this.manifests.delete(id);
      }
    }
    for (const manifest of valid) {
      this.manifests.set(manifest.id, manifest);
    }
  }

  // ==================== Standard Registry Methods ====================

  getManifest(id: string): IntegrationManifest | undefined {
    return this.manifests.get(id);
  }

  getAllManifests(): IntegrationManifest[] {
    return Array.from(this.manifests.values());
  }

  getByCategory(category: IntegrationCategory): IntegrationManifest[] {
    return this.getAllManifests().filter((m) => m.category === category);
  }

  getActiveManifests(): IntegrationManifest[] {
    return this.getAllManifests().filter((m) => m.isActive);
  }

  requiresOAuth(id: string): boolean {
    const manifest = this.manifests.get(id);
    return manifest?.auth.type === 'oauth2';
  }

  getAuthStrategy(id: string): AuthStrategy | undefined {
    return this.manifests.get(id)?.auth;
  }

  getHandler(id: string): IntegrationHandler | undefined {
    return this.manifests.get(id)?.handler;
  }
}

// ============================================================================
// Registry Singleton
// ============================================================================

// All registered manifests
const allManifests: IntegrationManifest[] = [
  awsManifest,
  azureManifest,
  gcpManifest,
  githubManifest,
  googleWorkspaceManifest,
  jumpcloudManifest,
  ripplingManifest,
  vercelManifest,
  aikidoManifest,
];

// Create and export the registry singleton
export const registry: IntegrationRegistry = new IntegrationRegistryImpl(allManifests);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a manifest by ID
 */
export function getManifest(id: string): IntegrationManifest | undefined {
  return registry.getManifest(id);
}

/**
 * Get all available manifests
 */
export function getAllManifests(): IntegrationManifest[] {
  return registry.getAllManifests();
}

/**
 * Get active manifests only
 */
export function getActiveManifests(): IntegrationManifest[] {
  return registry.getActiveManifests();
}

/**
 * Get manifests by category
 */
export function getByCategory(category: IntegrationCategory): IntegrationManifest[] {
  return registry.getByCategory(category);
}

/**
 * Check if an integration requires OAuth
 */
export function requiresOAuth(id: string): boolean {
  return registry.requiresOAuth(id);
}

/**
 * Get OAuth config for an integration
 */
export function getOAuthConfig(id: string) {
  const auth = registry.getAuthStrategy(id);
  if (auth?.type === 'oauth2') {
    return auth.config;
  }
  return undefined;
}

/**
 * Get handler for an integration
 */
export function getHandler(id: string): IntegrationHandler | undefined {
  return registry.getHandler(id);
}

/**
 * Get all integration IDs
 */
export function getIntegrationIds(): string[] {
  return registry.getAllManifests().map((m) => m.id);
}

/**
 * Get all categories with their integration counts
 */
export function getCategoriesWithCounts(): { category: IntegrationCategory; count: number }[] {
  const categories = new Map<IntegrationCategory, number>();

  for (const manifest of registry.getAllManifests()) {
    const current = categories.get(manifest.category) || 0;
    categories.set(manifest.category, current + 1);
  }

  return Array.from(categories.entries()).map(([category, count]) => ({
    category,
    count,
  }));
}

/**
 * Cloud Tests shared constants
 */

/**
 * Category used to filter cloud provider integrations from manifests
 */
export const CLOUD_PROVIDER_CATEGORY = 'Cloud';

/**
 * Supported cloud provider slugs
 */
export const CLOUD_PROVIDER_SLUGS = ['aws', 'gcp', 'azure'] as const;

/**
 * Type for supported cloud provider slugs
 */
export type CloudProviderSlug = (typeof CLOUD_PROVIDER_SLUGS)[number];

/**
 * Type guard to check if a string is a supported cloud provider slug
 */
export const isCloudProviderSlug = (value: string): value is CloudProviderSlug =>
  CLOUD_PROVIDER_SLUGS.includes(value as CloudProviderSlug);

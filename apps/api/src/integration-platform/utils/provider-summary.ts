export interface ProviderSummary {
  slug?: string;
  name?: string;
}

export function getProviderSummary(
  value: unknown,
): ProviderSummary | undefined {
  if (!value || typeof value !== 'object' || !('provider' in value)) {
    return undefined;
  }

  const provider = (value as { provider?: unknown }).provider;
  if (!provider || typeof provider !== 'object') {
    return undefined;
  }

  const slug =
    'slug' in provider && typeof provider.slug === 'string'
      ? provider.slug
      : undefined;
  const name =
    'name' in provider && typeof provider.name === 'string'
      ? provider.name
      : undefined;

  return { slug, name };
}

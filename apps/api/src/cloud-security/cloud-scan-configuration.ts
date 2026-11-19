const BASELINES: Record<string, string[]> = {
  aws: [
    'cloudtrail',
    'config',
    'guardduty',
    'iam-analyzer',
    'cloudwatch',
    'kms',
  ],
  gcp: ['security-command-center'],
  azure: [],
};

/** The same effective service selection is used by the producer and its verifier. */
export function cloudScanServices({
  provider,
  variables,
}: {
  provider: string;
  variables: Record<string, unknown>;
}) {
  const baselineServices = BASELINES[provider] ?? [];
  const disabledServices = new Set<string>(
    Array.isArray(variables.disabledServices)
      ? (variables.disabledServices as string[])
      : [],
  );
  const selected =
    Array.isArray(variables.enabledServices) &&
    variables.enabledServices.length > 0
      ? (variables.enabledServices as string[])
      : Array.isArray(variables.detectedServices) &&
          variables.detectedServices.length > 0
        ? (variables.detectedServices as string[])
        : undefined;
  const enabledServices = selected
    ? [
        ...new Set([
          ...selected.filter((service) => !disabledServices.has(service)),
          ...baselineServices,
        ]),
      ]
    : undefined;
  return { baselineServices, disabledServices, enabledServices };
}

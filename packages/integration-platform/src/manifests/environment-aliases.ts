import type { CheckVariable, CheckVariableValues } from '../types';
import { normalizeEnvironmentName, tokenizeEnvironmentValue } from './environment-classification';

export interface EnvironmentAlias {
  alias: string;
  environment: string;
  tokens: readonly string[];
}

export interface EnvironmentAliasesConfig {
  aliases: readonly EnvironmentAlias[];
  invalidEntries: readonly string[];
}

export const environmentAliasesVariable: CheckVariable = {
  id: 'environment_aliases',
  label: 'Environment aliases',
  type: 'text',
  required: false,
  placeholder: 'release=production, preview=staging',
  helpText:
    'Optional custom environment names. Use alias=environment pairs, separated by commas. Supported environments: production, staging, development, test, sandbox, non-production.',
};

function normalizeConfiguredValue(raw: CheckVariableValues[string]): string {
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw.join(',');
  return '';
}

export function parseEnvironmentAliases(variables: CheckVariableValues): EnvironmentAliasesConfig {
  const raw = normalizeConfiguredValue(variables.environment_aliases);
  if (!raw.trim()) return { aliases: [], invalidEntries: [] };

  const aliasesByTokenKey = new Map<string, EnvironmentAlias>();
  const invalidEntries: string[] = [];
  for (const entry of raw.split(/[,;\n]+/)) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    const separatorIndex = trimmed.search(/[=:]/);
    if (separatorIndex <= 0 || separatorIndex === trimmed.length - 1) {
      invalidEntries.push(trimmed);
      continue;
    }

    const alias = trimmed.slice(0, separatorIndex).trim();
    const target = trimmed.slice(separatorIndex + 1).trim();
    const tokens = tokenizeEnvironmentValue(alias);
    const environment = normalizeEnvironmentName(target);
    if (tokens.length === 0 || !environment) {
      invalidEntries.push(trimmed);
      continue;
    }

    aliasesByTokenKey.set(tokens.join('\u0000'), {
      alias,
      environment,
      tokens,
    });
  }

  return { aliases: [...aliasesByTokenKey.values()], invalidEntries };
}

export function environmentAliasEvidence(
  config: EnvironmentAliasesConfig,
): Record<string, unknown> {
  return {
    ...(config.aliases.length > 0
      ? {
          environmentAliases: config.aliases.map(({ alias, environment }) => ({
            alias,
            environment,
          })),
        }
      : {}),
    ...(config.invalidEntries.length > 0
      ? { invalidEnvironmentAliases: config.invalidEntries }
      : {}),
  };
}

export function applyEnvironmentAliasEvidence<T extends { evidence?: Record<string, unknown> }>({
  items,
  aliasesConfig,
}: {
  items: readonly T[];
  aliasesConfig: EnvironmentAliasesConfig;
}): T[] {
  const aliasEvidence = environmentAliasEvidence(aliasesConfig);
  if (Object.keys(aliasEvidence).length === 0) return [...items];

  return items.map((item) => ({
    ...item,
    evidence: {
      ...(item.evidence ?? {}),
      ...aliasEvidence,
    },
  }));
}

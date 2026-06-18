import { describe, expect, it } from 'bun:test';
import { parseEnvironmentAliases } from '../environment-aliases';
import {
  classifyEnvironment,
  classifyEnvironmentWithAliases,
  confirmsEnvironmentSeparation,
  envTagValues,
} from '../environment-classification';

describe('confirmsEnvironmentSeparation — requires prod + non-prod', () => {
  it('passes only with production AND a non-production environment', () => {
    expect(confirmsEnvironmentSeparation(['production', 'development'])).toBe(true);
    expect(confirmsEnvironmentSeparation(['production', 'staging', 'test'])).toBe(true);
  });

  it('fails on two non-production environments (no production)', () => {
    expect(confirmsEnvironmentSeparation(['development', 'staging'])).toBe(false);
  });

  it('fails on production alone, or a single environment, or none', () => {
    expect(confirmsEnvironmentSeparation(['production'])).toBe(false);
    expect(confirmsEnvironmentSeparation(['development'])).toBe(false);
    expect(confirmsEnvironmentSeparation([])).toBe(false);
  });
});

describe('classifyEnvironment — token-exact matching', () => {
  it('classifies common environment tokens', () => {
    expect(classifyEnvironment(['myapp-prod'])).toBe('production');
    expect(classifyEnvironment(['web-staging'])).toBe('staging');
    expect(classifyEnvironment(['svc-dev'])).toBe('development');
    expect(classifyEnvironment(['api-qa'])).toBe('test');
    expect(classifyEnvironment(['demo'])).toBe('sandbox');
  });

  it('handles ANY separator including underscore (the bug the reviewer caught)', () => {
    expect(classifyEnvironment(['myapp_prod'])).toBe('production');
    expect(classifyEnvironment(['prod_network'])).toBe('production');
    expect(classifyEnvironment(['dev_network'])).toBe('development');
    expect(classifyEnvironment(['myapp.prod'])).toBe('production');
    expect(classifyEnvironment(['rg/staging'])).toBe('staging');
  });

  it('does NOT false-match substrings (product/developer/etc.)', () => {
    expect(classifyEnvironment(['product-catalog'])).toBeNull();
    expect(classifyEnvironment(['developer-portal'])).toBeNull();
    expect(classifyEnvironment(['data-warehouse'])).toBeNull();
    expect(classifyEnvironment(['prod123'])).toBeNull(); // not a clean token
  });

  it('treats preprod as staging, not production', () => {
    expect(classifyEnvironment(['app-preprod'])).toBe('staging');
    expect(classifyEnvironment(['preprod'])).toBe('staging');
  });

  it('is case-insensitive and skips empty/undefined candidates', () => {
    expect(classifyEnvironment(['PROD'])).toBe('production');
    expect(classifyEnvironment([undefined, '', 'svc-dev'])).toBe('development');
  });

  it('returns the first matching candidate (authoritative source first)', () => {
    // an explicit env value passed first wins over a later name
    expect(classifyEnvironment(['production', 'thing-dev'])).toBe('production');
  });

  it('returns null when nothing matches', () => {
    expect(classifyEnvironment(['backend', 'frontend', 'vpc-0abc'])).toBeNull();
  });
});

describe('classifyEnvironment — negated/qualified production (cubic finding)', () => {
  it('classifies separated negated production as NON-production, not production', () => {
    expect(classifyEnvironment(['non-prod'])).toBe('non-production');
    expect(classifyEnvironment(['non_prod'])).toBe('non-production');
    expect(classifyEnvironment(['non.prod'])).toBe('non-production');
    expect(classifyEnvironment(['not-prod'])).toBe('non-production');
    expect(classifyEnvironment(['myapp-non-prod'])).toBe('non-production');
    expect(classifyEnvironment(['non-production'])).toBe('non-production');
    expect(classifyEnvironment(['NON-PROD'])).toBe('non-production'); // case-insensitive
  });

  it('classifies joined non-production spellings as NON-production', () => {
    expect(classifyEnvironment(['nonprod'])).toBe('non-production');
    expect(classifyEnvironment(['notprod'])).toBe('non-production');
    expect(classifyEnvironment(['nonprd'])).toBe('non-production');
    expect(classifyEnvironment(['notprd'])).toBe('non-production');
    expect(classifyEnvironment(['nonproduction'])).toBe('non-production');
    expect(classifyEnvironment(['notproduction'])).toBe('non-production');
    expect(classifyEnvironment(['app-nonprod'])).toBe('non-production');
  });

  it('classifies pre-prod as staging (consistent with joined "preprod")', () => {
    expect(classifyEnvironment(['pre-prod'])).toBe('staging');
    expect(classifyEnvironment(['pre_prod'])).toBe('staging');
    expect(classifyEnvironment(['app-pre-prod'])).toBe('staging');
    expect(classifyEnvironment(['preprod'])).toBe('staging');
  });

  it('still classifies plain production (negation needs an ADJACENT qualifier)', () => {
    expect(classifyEnvironment(['prod'])).toBe('production');
    expect(classifyEnvironment(['myapp-prod'])).toBe('production');
    // a "non" that does not immediately precede a prod token must NOT negate
    expect(classifyEnvironment(['prod-non-critical'])).toBe('production');
  });

  it('end-to-end: prod + non-prod now CONFIRMS separation (was a false fail)', () => {
    // Pre-fix, "non-prod" classified as production, so detected={production}
    // and separation failed despite a real prod/non-prod split.
    const detected = [
      ...new Set(['prod-vpc', 'non-prod-vpc'].map((n) => classifyEnvironment([n]))),
    ].filter((e): e is string => e !== null);
    expect(detected).toContain('production');
    expect(detected).toContain('non-production');
    expect(confirmsEnvironmentSeparation(detected)).toBe(true);
  });

  it('end-to-end: a non-prod-only footprint does NOT fabricate production (was a false pass)', () => {
    // Pre-fix, "non-prod-staging" classified as production, so dev + that string
    // passed as if production existed.
    const detected = [
      ...new Set(['dev', 'non-prod-staging'].map((n) => classifyEnvironment([n]))),
    ].filter((e): e is string => e !== null);
    expect(detected).not.toContain('production');
    expect(confirmsEnvironmentSeparation(detected)).toBe(false);
  });
});

describe('envTagValues — only env-key tags, case-insensitive', () => {
  it('reads environment-indicating keys regardless of case', () => {
    expect(envTagValues({ Environment: 'production' })).toEqual(['production']);
  });

  it('returns values in env-key PRIORITY order, not tag insertion order', () => {
    // `environment` outranks `stage` even though `stage` is inserted first.
    expect(envTagValues({ stage: 'dev', environment: 'prod' })).toEqual(['prod', 'dev']);
    // so the authoritative key wins classification
    expect(classifyEnvironment(envTagValues({ stage: 'dev', environment: 'prod' }))).toBe(
      'production',
    );
  });

  it('ignores non-environment tags (false-positive guard)', () => {
    expect(envTagValues({ team: 'dev-team', costCenter: 'prod-123' })).toEqual([]);
  });

  it('returns [] for undefined tags', () => {
    expect(envTagValues(undefined)).toEqual([]);
  });
});

describe('environment aliases — customer naming conventions', () => {
  it('keeps ambiguous names unclassified unless the customer maps them', () => {
    expect(classifyEnvironment(['app-release'])).toBeNull();

    const config = parseEnvironmentAliases({
      environment_aliases: 'release=production, preview=staging',
    });

    expect(
      classifyEnvironmentWithAliases({
        candidates: ['app-release'],
        aliases: config.aliases,
      }),
    ).toBe('production');
    expect(
      classifyEnvironmentWithAliases({
        candidates: ['app-preview'],
        aliases: config.aliases,
      }),
    ).toBe('staging');
  });

  it('honors production qualifiers for mapped production aliases', () => {
    const config = parseEnvironmentAliases({
      environment_aliases: 'release=production',
    });

    expect(
      classifyEnvironmentWithAliases({
        candidates: ['app-pre-release'],
        aliases: config.aliases,
      }),
    ).toBe('staging');
    expect(
      classifyEnvironmentWithAliases({
        candidates: ['app-non-release'],
        aliases: config.aliases,
      }),
    ).toBe('non-production');
  });

  it('reports invalid alias entries instead of guessing', () => {
    const config = parseEnvironmentAliases({
      environment_aliases: 'release=production, weird=customer, no-delimiter',
    });

    expect(config.aliases).toHaveLength(1);
    expect(config.invalidEntries).toEqual(['weird=customer', 'no-delimiter']);
  });
});

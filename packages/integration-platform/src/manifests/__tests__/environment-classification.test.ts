import { describe, expect, it } from 'bun:test';
import {
  classifyEnvironment,
  envTagValues,
} from '../environment-classification';

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

describe('envTagValues — only env-key tags, case-insensitive', () => {
  it('reads environment-indicating keys regardless of case', () => {
    expect(envTagValues({ Environment: 'production' })).toEqual(['production']);
    expect(envTagValues({ env: 'prod', stage: 'dev' }).sort()).toEqual(['dev', 'prod']);
  });

  it('ignores non-environment tags (false-positive guard)', () => {
    expect(envTagValues({ team: 'dev-team', costCenter: 'prod-123' })).toEqual([]);
  });

  it('returns [] for undefined tags', () => {
    expect(envTagValues(undefined)).toEqual([]);
  });
});

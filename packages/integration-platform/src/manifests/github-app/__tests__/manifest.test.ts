import { describe, expect, it } from 'bun:test';
import { getAllManifests, getManifest } from '../../../registry';
import { manifest as githubManifest } from '../../github';
import { githubAppManifest } from '../index';

/**
 * CS-710: the new `github-app` integration must request read-only, fine-grained
 * access (a GitHub App via the standard OAuth authorize flow) while leaving the
 * legacy `github` OAuth integration completely untouched so existing connections
 * keep working.
 */
describe('github-app manifest (CS-710)', () => {
  it('is registered in the registry', () => {
    expect(getManifest('github-app')).toBeDefined();
    expect(getAllManifests().some((m) => m.id === 'github-app')).toBe(true);
  });

  it('uses the standard OAuth authorize flow with no `repo` scope (read-only via the App)', () => {
    const { auth } = githubAppManifest;
    expect(auth.type).toBe('oauth2');
    if (auth.type !== 'oauth2') return;
    // GitHub Apps ignore scopes — permissions come from the App config.
    expect(auth.config.scopes).toEqual([]);
    expect(auth.config.authorizeUrl).toBe('https://github.com/login/oauth/authorize');
    expect(auth.config.tokenUrl).toBe('https://github.com/login/oauth/access_token');
  });

  it('reuses the exact same checks as the legacy github manifest', () => {
    const appCheckIds = githubAppManifest.checks?.map((c) => c.id).sort();
    const legacyCheckIds = githubManifest.checks?.map((c) => c.id).sort();
    expect(appCheckIds).toEqual(legacyCheckIds);
    expect(appCheckIds?.length).toBe(5);
  });

  it('leaves the legacy github manifest untouched (still OAuth `repo` scope)', () => {
    expect(githubManifest.id).toBe('github');
    expect(githubManifest.name).toBe('GitHub');
    if (githubManifest.auth.type !== 'oauth2') {
      throw new Error('expected oauth2 auth');
    }
    expect(githubManifest.auth.config.scopes).toContain('repo');
  });
});

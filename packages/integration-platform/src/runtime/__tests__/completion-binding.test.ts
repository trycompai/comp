import { describe, expect, test } from 'bun:test';
import {
  createNativeCompletionBinding,
  declarativeDefinitionIdentity,
  dynamicManifestIdentity,
} from '../completion-binding';

const binding = () => ({
  sourceIdentity: 'a'.repeat(64),
  definitionIdentity: null,
  manifestIdentity: null,
  organizationId: 'synthetic-org',
  connectionId: 'synthetic-connection',
  checkId: 'synthetic-check',
  context: {
    taskId: 'synthetic-task',
    credentialRevision: 'synthetic-revision-1',
    configurationMetadata: { account: 'synthetic-account' },
  },
  variables: { repositories: ['synthetic-repository'], strict: true },
});

describe('native completion configuration/source binding', () => {
  test('binds known source and exact safe configuration without retaining plaintext', () => {
    const result = createNativeCompletionBinding(binding());
    expect(result).toMatch(/^[a-f0-9]{64}$/);
    expect(result).not.toContain('synthetic-repository');
    expect(result).not.toContain('synthetic-revision');
  });

  test('canonical key order is equivalent', () => {
    const before = binding();
    const after = {
      ...before,
      variables: { strict: true, repositories: ['synthetic-repository'] },
    };
    expect(createNativeCompletionBinding(before)).toBe(createNativeCompletionBinding(after));
  });

  test('repository scope 35 to 36 invalidates the old binding', () => {
    const before = {
      ...binding(),
      variables: { repositories: Array.from({ length: 35 }, (_, i) => `repo-${i}`) },
    };
    const after = {
      ...before,
      variables: { repositories: [...before.variables.repositories, 'repo-35'] },
    };
    expect(createNativeCompletionBinding(before)).not.toBe(createNativeCompletionBinding(after));
  });

  test.each(['organizationId', 'connectionId', 'checkId'] as const)(
    '%s changes invalidate evidence',
    (key) => {
      const before = binding();
      expect(createNativeCompletionBinding(before)).not.toBe(
        createNativeCompletionBinding({ ...before, [key]: `${before[key]}-changed` }),
      );
    },
  );

  test.each(['taskId', 'credentialRevision'] as const)('%s changes invalidate evidence', (key) => {
    const before = binding();
    expect(createNativeCompletionBinding(before)).not.toBe(
      createNativeCompletionBinding({
        ...before,
        context: { ...before.context, [key]: `${before.context[key]}-changed` },
      }),
    );
  });

  test.each(['sourceIdentity', 'definitionIdentity', 'manifestIdentity'] as const)(
    '%s changes invalidate evidence',
    (key) => {
      const before = binding();
      expect(createNativeCompletionBinding(before)).not.toBe(
        createNativeCompletionBinding({ ...before, [key]: 'b'.repeat(64) }),
      );
    },
  );

  test.each([null, '', 'not-a-source-hash'])(
    'unbound source %s remains unknown',
    (sourceIdentity) => {
      expect(createNativeCompletionBinding({ ...binding(), sourceIdentity })).toBeNull();
    },
  );

  test('missing selected credential revision remains unknown', () => {
    const before = binding();
    expect(
      createNativeCompletionBinding({
        ...before,
        context: { ...before.context, credentialRevision: null },
      }),
    ).toBeNull();
  });

  test('missing task context remains unknown', () => {
    expect(createNativeCompletionBinding({ ...binding(), context: undefined })).toBeNull();
  });

  test.each([null, [], 'scope', 35, false, new Date()].map((value) => ({ value })))(
    'invalid variable container remains unknown: %p',
    ({ value }) => {
      expect(createNativeCompletionBinding({ ...binding(), variables: value })).toBeNull();
    },
  );

  test('non-JSON values and sparse arrays remain unknown', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    for (const variables of [
      { undefined },
      { bad: NaN },
      { bad: () => true },
      cyclic,
      { sparse: new Array(2) },
    ]) {
      expect(createNativeCompletionBinding({ ...binding(), variables })).toBeNull();
    }
  });

  test('hashing never invokes a getter', () => {
    let reads = 0;
    const variables = Object.defineProperty({}, 'scope', {
      enumerable: true,
      get: () => {
        reads += 1;
        return 'secret';
      },
    });
    expect(createNativeCompletionBinding({ ...binding(), variables })).toBeNull();
    expect(reads).toBe(0);
  });
});

describe('exact executed dynamic definitions', () => {
  const definition = () => ({
    id: 'synthetic-check',
    name: 'Synthetic check',
    description: 'Synthetic metadata',
    definition: { steps: [] },
    taskMapping: 'synthetic-template',
  });
  const manifest = () => ({
    slug: 'synthetic-provider',
    authConfig: { type: 'api_key', config: { name: 'api_key' } },
    baseUrl: 'https://synthetic.invalid',
    defaultHeaders: null,
    syncDefinition: null,
    services: null,
  });

  test('interpreter default severity and empty variables normalize exactly', () => {
    expect(declarativeDefinitionIdentity(definition())).toBe(
      declarativeDefinitionIdentity({
        ...definition(),
        defaultSeverity: 'medium',
        variables: [],
      }),
    );
  });

  test('a changed DSL body invalidates the old identity without executing it', () => {
    expect(declarativeDefinitionIdentity(definition())).not.toBe(
      declarativeDefinitionIdentity({
        ...definition(),
        definition: { steps: [{ type: 'code', code: 'void 0' }] },
      }),
    );
  });

  test.each(['baseUrl', 'authConfig', 'defaultHeaders', 'syncDefinition', 'services'] as const)(
    '%s changes invalidate the parent manifest',
    (key) => {
      const before = manifest();
      const after = {
        ...before,
        [key]: key === 'baseUrl' ? 'https://changed.invalid' : { changed: true },
      };
      expect(dynamicManifestIdentity(before)).not.toBe(dynamicManifestIdentity(after));
    },
  );

  test('unrequested extra fields are never reflected into the parent digest', () => {
    const before = manifest();
    const after = Object.defineProperty({ ...before }, 'unexpectedSecret', {
      get: () => {
        throw new Error('Unrequested field must never be read');
      },
    });
    expect(dynamicManifestIdentity(before)).toBe(dynamicManifestIdentity(after));
  });
});

import { describe, it, expect, beforeEach } from 'bun:test';
import { interpretDeclarativeCheck } from '../interpreter';
import type { CheckContext } from '../../types';
import type { CheckDefinition } from '../types';

/**
 * Creates a mock CheckContext for testing.
 */
function createMockContext(overrides: Partial<CheckContext> = {}): CheckContext & {
  _passes: Array<Record<string, unknown>>;
  _fails: Array<Record<string, unknown>>;
  _logs: string[];
  _fetchResponses: Map<string, unknown>;
} {
  const passes: Array<Record<string, unknown>> = [];
  const fails: Array<Record<string, unknown>> = [];
  const logs: string[] = [];
  const fetchResponses = new Map<string, unknown>();

  const ctx = {
    accessToken: 'test-token',
    credentials: {},
    variables: {},
    connectionId: 'conn-1',
    organizationId: 'org-1',
    metadata: {},

    log: (msg: string) => logs.push(msg),
    warn: (msg: string) => logs.push(`WARN: ${msg}`),
    error: (msg: string) => logs.push(`ERROR: ${msg}`),

    pass: (result: Record<string, unknown>) => passes.push(result),
    fail: (finding: Record<string, unknown>) => fails.push(finding),

    addPassingResult: (result: Record<string, unknown>) => passes.push(result),
    addFinding: (finding: Record<string, unknown>) => fails.push(finding),

    fetch: async <T>(path: string): Promise<T> => {
      const resp = fetchResponses.get(path);
      if (resp === undefined) {
        throw new Error(`No mock response for ${path}`);
      }
      return resp as T;
    },
    post: async <T>(path: string, body?: unknown): Promise<T> => {
      const resp = fetchResponses.get(path);
      if (resp === undefined) throw new Error(`No mock response for POST ${path}`);
      return resp as T;
    },
    put: async <T>(path: string, body?: unknown): Promise<T> => {
      const resp = fetchResponses.get(path);
      if (resp === undefined) throw new Error(`No mock response for PUT ${path}`);
      return resp as T;
    },
    patch: async <T>(path: string, body?: unknown): Promise<T> => {
      const resp = fetchResponses.get(path);
      if (resp === undefined) throw new Error(`No mock response for PATCH ${path}`);
      return resp as T;
    },
    delete: async <T>(path: string): Promise<T> => {
      const resp = fetchResponses.get(path);
      if (resp === undefined) throw new Error(`No mock response for DELETE ${path}`);
      return resp as T;
    },
    graphql: async <T>(): Promise<T> => ({}) as T,

    fetchAllPages: async <T>(path: string): Promise<T[]> => {
      const resp = fetchResponses.get(path);
      return (resp as T[]) || [];
    },
    fetchWithCursor: async <T>(path: string): Promise<T[]> => {
      const resp = fetchResponses.get(path);
      return (resp as T[]) || [];
    },
    fetchWithLinkHeader: async <T>(path: string): Promise<T[]> => {
      const resp = fetchResponses.get(path);
      return (resp as T[]) || [];
    },

    getState: async () => null,
    setState: async () => {},

    _passes: passes,
    _fails: fails,
    _logs: logs,
    _fetchResponses: fetchResponses,

    ...overrides,
  };

  return ctx as CheckContext & typeof ctx;
}

describe('interpretDeclarativeCheck', () => {
  describe('fetch + forEach', () => {
    it('fetches users and evaluates MFA conditions', async () => {
      const definition: CheckDefinition = {
        steps: [
          {
            type: 'fetch',
            path: '/api/users',
            as: 'users',
            dataPath: 'value',
          },
          {
            type: 'forEach',
            collection: 'users',
            itemAs: 'user',
            resourceType: 'user',
            resourceIdPath: 'user.email',
            conditions: [
              { field: 'user.mfa_enabled', operator: 'eq', value: true },
            ],
            onPass: {
              title: 'MFA enabled for {{user.email}}',
              description: 'User has MFA configured',
              resourceType: 'user',
              resourceId: '{{user.email}}',
            },
            onFail: {
              title: 'MFA not enabled for {{user.email}}',
              description: 'User does not have MFA configured',
              resourceType: 'user',
              resourceId: '{{user.email}}',
              severity: 'high',
              remediation: 'Enable MFA in security settings',
            },
          },
        ],
      };

      const check = interpretDeclarativeCheck({
        id: 'mfa_check',
        name: 'MFA Check',
        description: 'Check MFA status',
        definition,
      });

      const ctx = createMockContext();
      ctx._fetchResponses.set('/api/users', {
        value: [
          { email: 'alice@example.com', mfa_enabled: true },
          { email: 'bob@example.com', mfa_enabled: false },
        ],
      });

      await check.run(ctx);

      expect(ctx._passes).toHaveLength(1);
      expect(ctx._passes[0]!.title).toBe('MFA enabled for alice@example.com');

      expect(ctx._fails).toHaveLength(1);
      expect(ctx._fails[0]!.title).toBe('MFA not enabled for bob@example.com');
      expect(ctx._fails[0]!.severity).toBe('high');
      expect(ctx._fails[0]!.remediation).toBe('Enable MFA in security settings');
    });
  });

  describe('fetchPages', () => {
    it('fetches paginated data with cursor strategy', async () => {
      const definition: CheckDefinition = {
        steps: [
          {
            type: 'fetchPages',
            path: '/api/users',
            as: 'users',
            pagination: {
              strategy: 'cursor',
              cursorParam: 'pageToken',
              cursorPath: 'nextPageToken',
              dataPath: 'users',
            },
          },
          {
            type: 'forEach',
            collection: 'users',
            itemAs: 'user',
            resourceType: 'user',
            resourceIdPath: 'user.id',
            conditions: [{ field: 'user.active', operator: 'eq', value: true }],
            onPass: {
              title: 'User {{user.id}} is active',
              resourceType: 'user',
              resourceId: '{{user.id}}',
            },
            onFail: {
              title: 'User {{user.id}} is inactive',
              resourceType: 'user',
              resourceId: '{{user.id}}',
              severity: 'low',
              remediation: 'Review inactive user accounts',
            },
          },
        ],
      };

      const check = interpretDeclarativeCheck({
        id: 'active_users',
        name: 'Active Users',
        description: 'Check user activity',
        definition,
      });

      const ctx = createMockContext();
      ctx._fetchResponses.set('/api/users', [
        { id: 'user-1', active: true },
        { id: 'user-2', active: false },
        { id: 'user-3', active: true },
      ]);

      await check.run(ctx);

      expect(ctx._passes).toHaveLength(2);
      expect(ctx._fails).toHaveLength(1);
    });
  });

  describe('aggregate', () => {
    it('counts items and evaluates threshold', async () => {
      const definition: CheckDefinition = {
        steps: [
          {
            type: 'fetch',
            path: '/api/issues',
            as: 'issues',
            dataPath: 'items',
          },
          {
            type: 'aggregate',
            collection: 'issues',
            operation: 'countWhere',
            filter: { field: 'severity', operator: 'in', value: ['critical', 'high'] },
            condition: { operator: 'lte', value: 5 },
            onPass: {
              title: 'Critical/high issues within threshold',
              description: 'Found acceptable number of critical/high issues',
              resourceType: 'issues',
              resourceId: 'all',
            },
            onFail: {
              title: 'Too many critical/high issues',
              description: 'Found too many critical/high issues',
              resourceType: 'issues',
              resourceId: 'all',
              severity: 'high',
              remediation: 'Address critical and high severity issues',
            },
          },
        ],
      };

      const check = interpretDeclarativeCheck({
        id: 'issue_threshold',
        name: 'Issue Threshold',
        description: 'Check issue severity counts',
        definition,
        defaultSeverity: 'high',
      });

      // Test passing case (3 critical/high ≤ 5)
      const ctx1 = createMockContext();
      ctx1._fetchResponses.set('/api/issues', {
        items: [
          { id: 1, severity: 'critical' },
          { id: 2, severity: 'high' },
          { id: 3, severity: 'high' },
          { id: 4, severity: 'low' },
          { id: 5, severity: 'info' },
        ],
      });

      await check.run(ctx1);
      expect(ctx1._passes).toHaveLength(1);
      expect(ctx1._fails).toHaveLength(0);

      // Test failing case (6 critical/high > 5)
      const ctx2 = createMockContext();
      ctx2._fetchResponses.set('/api/issues', {
        items: [
          { id: 1, severity: 'critical' },
          { id: 2, severity: 'critical' },
          { id: 3, severity: 'high' },
          { id: 4, severity: 'high' },
          { id: 5, severity: 'high' },
          { id: 6, severity: 'high' },
          { id: 7, severity: 'low' },
        ],
      });

      await check.run(ctx2);
      expect(ctx2._passes).toHaveLength(0);
      expect(ctx2._fails).toHaveLength(1);
    });
  });

  describe('branch', () => {
    it('executes then/else based on condition', async () => {
      const definition: CheckDefinition = {
        steps: [
          {
            type: 'fetch',
            path: '/api/settings',
            as: 'settings',
          },
          {
            type: 'branch',
            condition: { field: 'settings.sso_enabled', operator: 'eq', value: true },
            then: [
              {
                type: 'emit',
                result: 'pass',
                template: {
                  title: 'SSO is enabled',
                  resourceType: 'settings',
                  resourceId: 'sso',
                },
              },
            ],
            else: [
              {
                type: 'emit',
                result: 'fail',
                template: {
                  title: 'SSO is not enabled',
                  resourceType: 'settings',
                  resourceId: 'sso',
                  severity: 'high',
                  remediation: 'Enable SSO in security settings',
                },
              },
            ],
          },
        ],
      };

      const check = interpretDeclarativeCheck({
        id: 'sso_check',
        name: 'SSO Check',
        description: 'Check SSO status',
        definition,
      });

      // SSO enabled
      const ctx1 = createMockContext();
      ctx1._fetchResponses.set('/api/settings', { sso_enabled: true });
      await check.run(ctx1);
      expect(ctx1._passes).toHaveLength(1);
      expect(ctx1._fails).toHaveLength(0);

      // SSO disabled
      const ctx2 = createMockContext();
      ctx2._fetchResponses.set('/api/settings', { sso_enabled: false });
      await check.run(ctx2);
      expect(ctx2._passes).toHaveLength(0);
      expect(ctx2._fails).toHaveLength(1);
    });
  });

  describe('emit', () => {
    it('directly emits pass/fail results', async () => {
      const definition: CheckDefinition = {
        steps: [
          {
            type: 'emit',
            result: 'pass',
            template: {
              title: 'Manual check passed',
              description: 'Compliance verified',
              resourceType: 'policy',
              resourceId: 'pol-1',
            },
          },
        ],
      };

      const check = interpretDeclarativeCheck({
        id: 'manual_check',
        name: 'Manual Check',
        description: 'Manual compliance check',
        definition,
      });

      const ctx = createMockContext();
      await check.run(ctx);

      expect(ctx._passes).toHaveLength(1);
      expect(ctx._passes[0]!.title).toBe('Manual check passed');
    });
  });

  describe('fetch error handling', () => {
    it('onError: skip — sets null on failure', async () => {
      const definition: CheckDefinition = {
        steps: [
          {
            type: 'fetch',
            path: '/api/nonexistent',
            as: 'data',
            onError: 'skip',
          },
          {
            type: 'emit',
            result: 'pass',
            template: {
              title: 'Continued after skip',
              resourceType: 'check',
              resourceId: 'skip-test',
            },
          },
        ],
      };

      const check = interpretDeclarativeCheck({
        id: 'skip_check',
        name: 'Skip Check',
        description: 'Test skip error handling',
        definition,
      });

      const ctx = createMockContext();
      // No response registered → will throw
      await check.run(ctx);

      expect(ctx._passes).toHaveLength(1);
      expect(ctx._passes[0]!.title).toBe('Continued after skip');
    });

    it('onError: empty — sets empty array on failure', async () => {
      const definition: CheckDefinition = {
        steps: [
          {
            type: 'fetch',
            path: '/api/nonexistent',
            as: 'data',
            onError: 'empty',
          },
        ],
      };

      const check = interpretDeclarativeCheck({
        id: 'empty_check',
        name: 'Empty Check',
        description: 'Test empty error handling',
        definition,
      });

      const ctx = createMockContext();
      await check.run(ctx);
      // Should not throw
    });

    it('onError: fail — throws on failure (default)', async () => {
      const definition: CheckDefinition = {
        steps: [
          {
            type: 'fetch',
            path: '/api/nonexistent',
            as: 'data',
          },
        ],
      };

      const check = interpretDeclarativeCheck({
        id: 'fail_check',
        name: 'Fail Check',
        description: 'Test fail error handling',
        definition,
      });

      const ctx = createMockContext();
      await expect(check.run(ctx)).rejects.toThrow('No mock response for /api/nonexistent');
    });
  });

  describe('forEach with filter', () => {
    it('filters items before evaluation', async () => {
      const definition: CheckDefinition = {
        steps: [
          {
            type: 'fetch',
            path: '/api/users',
            as: 'users',
          },
          {
            type: 'forEach',
            collection: 'users',
            itemAs: 'user',
            resourceType: 'user',
            resourceIdPath: 'user.email',
            filter: { field: 'user.active', operator: 'eq', value: true },
            conditions: [
              { field: 'user.mfa_enabled', operator: 'eq', value: true },
            ],
            onPass: {
              title: 'MFA enabled for {{user.email}}',
              resourceType: 'user',
              resourceId: '{{user.email}}',
            },
            onFail: {
              title: 'MFA not enabled for {{user.email}}',
              resourceType: 'user',
              resourceId: '{{user.email}}',
              severity: 'high',
              remediation: 'Enable MFA',
            },
          },
        ],
      };

      const check = interpretDeclarativeCheck({
        id: 'filter_test',
        name: 'Filter Test',
        description: 'Test forEach filter',
        definition,
      });

      const ctx = createMockContext();
      ctx._fetchResponses.set('/api/users', [
        { email: 'alice@test.com', active: true, mfa_enabled: true },
        { email: 'bob@test.com', active: false, mfa_enabled: false }, // filtered out
        { email: 'carol@test.com', active: true, mfa_enabled: false },
      ]);

      await check.run(ctx);

      // Bob should be filtered out — only Alice and Carol evaluated
      expect(ctx._passes).toHaveLength(1); // Alice
      expect(ctx._fails).toHaveLength(1); // Carol
    });
  });

  describe('realistic Microsoft Graph scenario', () => {
    it('checks MFA status via Microsoft Graph API response shape', async () => {
      const definition: CheckDefinition = {
        steps: [
          {
            type: 'fetch',
            path: '/v1.0/users',
            as: 'users',
            dataPath: 'value',
            params: { '$select': 'id,displayName,userPrincipalName' },
          },
          {
            type: 'forEach',
            collection: 'users',
            itemAs: 'user',
            resourceType: 'user',
            resourceIdPath: 'user.userPrincipalName',
            conditions: [
              { field: 'user.strongAuthenticationMethods.length', operator: 'gt', value: 0 },
            ],
            onPass: {
              title: 'MFA configured for {{user.displayName}}',
              description: '{{user.userPrincipalName}} has MFA methods registered',
              resourceType: 'user',
              resourceId: '{{user.userPrincipalName}}',
            },
            onFail: {
              title: 'MFA not configured for {{user.displayName}}',
              description: '{{user.userPrincipalName}} has no MFA methods',
              resourceType: 'user',
              resourceId: '{{user.userPrincipalName}}',
              severity: 'high',
              remediation: 'Go to Microsoft 365 admin center > Users > Active users > select user > Manage multifactor authentication',
            },
          },
        ],
      };

      const check = interpretDeclarativeCheck({
        id: 'mfa_status',
        name: 'MFA Status',
        description: 'Check MFA enrollment via Microsoft Graph',
        definition,
        defaultSeverity: 'high',
      });

      const ctx = createMockContext();
      ctx._fetchResponses.set('/v1.0/users', {
        value: [
          {
            id: '1',
            displayName: 'Alice Johnson',
            userPrincipalName: 'alice@contoso.com',
            strongAuthenticationMethods: [{ methodType: 'OneWaySMS' }],
          },
          {
            id: '2',
            displayName: 'Bob Smith',
            userPrincipalName: 'bob@contoso.com',
            strongAuthenticationMethods: [],
          },
        ],
      });

      await check.run(ctx);

      expect(ctx._passes).toHaveLength(1);
      expect(ctx._passes[0]!.title).toBe('MFA configured for Alice Johnson');

      expect(ctx._fails).toHaveLength(1);
      expect(ctx._fails[0]!.title).toBe('MFA not configured for Bob Smith');
      expect(ctx._fails[0]!.remediation).toContain('Microsoft 365 admin center');
    });
  });
});

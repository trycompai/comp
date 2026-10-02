import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import type { ExecutionContext } from '@nestjs/common';
import { AuthContext } from './auth-context.decorator';
import type { AuthContext as AuthContextType } from './types';

class TestController {
  read(@AuthContext() context: AuthContextType) {
    return context;
  }
}

function isDecoratorMetadata(value: unknown): value is {
  factory: (data: unknown, context: ExecutionContext) => AuthContextType;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'factory' in value &&
    typeof value.factory === 'function'
  );
}

describe('AuthContext API-key scopes', () => {
  const metadata: unknown = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestController,
    'read',
  );
  if (typeof metadata !== 'object' || metadata === null) {
    throw new Error('Missing authentication decorator metadata');
  }
  const parameter = Object.values(metadata).find(isDecoratorMetadata);
  if (!parameter) throw new Error('Missing authentication decorator factory');

  it.each([{ scopes: ['member:create'] }, { scopes: [] }])(
    'preserves trusted guard scopes $scopes',
    ({ scopes }) => {
      const request = {
        organizationId: 'org_test',
        authType: 'api-key',
        isApiKey: true,
        apiKeyScopes: scopes,
      };
      const result = parameter.factory(
        undefined,
        new ExecutionContextHost([request]),
      );
      expect(result.apiKeyScopes).toEqual(scopes);
    },
  );

  it('does not invent full-access scopes when guard metadata is absent', () => {
    const request = {
      organizationId: 'org_test',
      authType: 'api-key',
      isApiKey: true,
    };
    const result = parameter.factory(
      undefined,
      new ExecutionContextHost([request]),
    );
    expect(result.apiKeyScopes).toBeUndefined();
  });
});

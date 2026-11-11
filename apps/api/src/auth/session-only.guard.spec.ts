import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SessionOnlyGuard } from './session-only.guard';
import type { AuthenticatedRequest } from './types';

function contextFor(request: Partial<AuthenticatedRequest>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('SessionOnlyGuard', () => {
  const guard = new SessionOnlyGuard();

  it('allows a browser session', () => {
    expect(guard.canActivate(contextFor({ authType: 'session' }))).toBe(true);
  });

  it.each([
    ['an API key', { authType: 'api-key' as const, isApiKey: true }],
    ['a service token', { authType: 'service' as const, isServiceToken: true }],
    ['an MCP OAuth token', { authType: 'session' as const, isMcpOAuth: true }],
  ])('rejects %s with the same generic error', (_label, request) => {
    expect(() => guard.canActivate(contextFor(request))).toThrow(
      new ForbiddenException(
        'This endpoint is only available for user-authenticated requests.',
      ),
    );
  });
});

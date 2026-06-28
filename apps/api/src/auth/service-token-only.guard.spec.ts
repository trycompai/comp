import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ServiceTokenOnlyGuard } from './service-token-only.guard';
import type { AuthenticatedRequest } from './types';

function contextFor(
  request: Partial<AuthenticatedRequest>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request as AuthenticatedRequest,
    }),
  } as unknown as ExecutionContext;
}

describe('ServiceTokenOnlyGuard', () => {
  const guard = new ServiceTokenOnlyGuard();

  it('allows internal service-token requests', () => {
    expect(
      guard.canActivate(contextFor({ isServiceToken: true })),
    ).toBe(true);
  });

  it('rejects session requests', () => {
    expect(() =>
      guard.canActivate(
        contextFor({ authType: 'session', isApiKey: false, isServiceToken: false }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects API-key requests', () => {
    expect(() =>
      guard.canActivate(
        contextFor({ authType: 'api-key', isApiKey: true, isServiceToken: false }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects requests with no service-token flag set', () => {
    expect(() => guard.canActivate(contextFor({}))).toThrow(
      ForbiddenException,
    );
  });
});

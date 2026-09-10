import { StreamableFile } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Readable } from 'node:stream';
import { firstValueFrom, of } from 'rxjs';
import { AuthContextResponseInterceptor } from './auth-context-response.interceptor';
import { IS_PUBLIC_KEY } from './public.decorator';
import { SKIP_AUTH_CONTEXT_RESPONSE_KEY } from './skip-auth-context-response.decorator';

type RequestOverrides = {
  authType?: 'api-key' | 'session' | 'service';
  userId?: string;
  userEmail?: string;
};

function run(
  body: unknown,
  {
    request = { authType: 'api-key' as const },
    metadata = {},
    type = 'http',
  }: {
    request?: RequestOverrides;
    metadata?: Record<string, boolean>;
    type?: string;
  } = {},
): Promise<unknown> {
  const reflector = {
    getAllAndOverride: (key: string) => metadata[key],
  } as unknown as Reflector;

  const context = {
    getType: () => type,
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;

  const interceptor = new AuthContextResponseInterceptor(reflector);
  return firstValueFrom(
    interceptor.intercept(context, { handle: () => of(body) }) as never,
  );
}

describe('AuthContextResponseInterceptor', () => {
  describe('appends the context', () => {
    it('adds authType for api-key auth', async () => {
      await expect(run({ data: [] })).resolves.toEqual({
        data: [],
        authType: 'api-key',
      });
    });

    it('adds authenticatedUser for session auth', async () => {
      const result = await run(
        { id: 'x' },
        {
          request: {
            authType: 'session',
            userId: 'usr_1',
            userEmail: 'a@b.com',
          },
        },
      );
      expect(result).toEqual({
        id: 'x',
        authType: 'session',
        authenticatedUser: { id: 'usr_1', email: 'a@b.com' },
      });
    });

    it('omits authenticatedUser when only one of id/email is present', async () => {
      const result = (await run(
        { id: 'x' },
        { request: { authType: 'session', userId: 'usr_1' } },
      )) as Record<string, unknown>;
      expect(result.authenticatedUser).toBeUndefined();
      expect(result.authType).toBe('session');
    });
  });

  describe('leaves the body alone', () => {
    it('when the endpoint opts out', async () => {
      const body = { data: [] };
      await expect(
        run(body, { metadata: { [SKIP_AUTH_CONTEXT_RESPONSE_KEY]: true } }),
      ).resolves.toEqual(body);
    });

    it('when the endpoint is @Public()', async () => {
      const body = { data: [] };
      await expect(
        run(body, { metadata: { [IS_PUBLIC_KEY]: true } }),
      ).resolves.toEqual(body);
    });

    it('when the request carries no auth context', async () => {
      const body = { data: [] };
      await expect(run(body, { request: {} })).resolves.toEqual(body);
    });

    it('when the controller already set authType itself', async () => {
      const body = { data: [], authType: 'session' };
      await expect(run(body)).resolves.toEqual(body);
    });

    it('for a non-http context', async () => {
      const body = { data: [] };
      await expect(run(body, { type: 'rpc' })).resolves.toEqual(body);
    });
  });

  describe('refuses to corrupt non-object payloads', () => {
    it('passes arrays through untouched', async () => {
      await expect(run([{ id: 1 }])).resolves.toEqual([{ id: 1 }]);
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['a string', 'ok'],
      ['a number', 42],
      ['a boolean', true],
    ])('passes %s through untouched', async (_label, value) => {
      await expect(run(value)).resolves.toEqual(value);
    });

    it('passes a Buffer through untouched', async () => {
      const buf = Buffer.from('pdf-bytes');
      const result = await run(buf);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result).toEqual(buf);
    });

    it('passes a stream through untouched', async () => {
      const stream = Readable.from(['chunk']);
      expect(await run(stream)).toBe(stream);
    });

    it('passes a StreamableFile through untouched', async () => {
      const file = new StreamableFile(Buffer.from('x'));
      expect(await run(file)).toBe(file);
    });

    it('passes a Date through untouched', async () => {
      const date = new Date('2026-01-01T00:00:00Z');
      expect(await run(date)).toBe(date);
    });

    it('passes a class instance through untouched', async () => {
      class Dto {
        constructor(public id: string) {}
      }
      const dto = new Dto('x');
      expect(await run(dto)).toBe(dto);
    });
  });

  it('does not mutate the original body object', async () => {
    const body = { data: [] };
    await run(body);
    expect(body).toEqual({ data: [] });
    expect('authType' in body).toBe(false);
  });
});

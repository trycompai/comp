import { describe, expect, test } from 'bun:test';
import {
  getRequestSecurityError,
  requiresRequestCredentials,
} from '../src/mcp-server/cli/serve/security.js';

describe('HTTP MCP security', () => {
  test.each(['0.0.0.0', '::', '192.168.1.10', 'mcp.example.com'])(
    "never uses the operator's static key on network host %s",
    (host) => {
      expect(requiresRequestCredentials({ host, disableStaticAuth: false })).toBe(true);
      expect(
        getRequestSecurityError({
          origin: undefined,
          apiKey: undefined,
          requireCredentials: true,
        })?.status,
      ).toBe(401);
    },
  );

  test.each(['127.0.0.1', 'localhost', '::1'])(
    'preserves static-key local clients on %s',
    (host) => {
      expect(requiresRequestCredentials({ host, disableStaticAuth: false })).toBe(false);
      expect(requiresRequestCredentials({ host, disableStaticAuth: true })).toBe(true);
    },
  );

  test.each([
    'https://attacker.example',
    'http://localhost.attacker.example',
    'null',
    'invalid-origin',
    'file://localhost/private',
  ])('rejects hostile or invalid browser Origin %s', (origin) => {
    expect(
      getRequestSecurityError({
        origin,
        apiKey: 'caller-key',
        requireCredentials: true,
      })?.status,
    ).toBe(403);
  });

  test.each([{ apiKey: '' }, { apiKey: '   ' }, { apiKey: undefined }, { apiKey: ['one', 'two'] }])(
    'rejects missing, empty, or ambiguous credentials %s',
    ({ apiKey }) => {
      expect(
        getRequestSecurityError({
          origin: undefined,
          apiKey,
          requireCredentials: true,
        })?.status,
      ).toBe(401);
    },
  );

  test('accepts headerless local clients and credentialed network clients', () => {
    expect(
      getRequestSecurityError({
        origin: undefined,
        apiKey: undefined,
        requireCredentials: false,
      }),
    ).toBeUndefined();
    expect(
      getRequestSecurityError({
        origin: undefined,
        apiKey: 'caller-key',
        requireCredentials: true,
      }),
    ).toBeUndefined();
  });

  test.each(['http://localhost:2718', 'http://127.0.0.1:2718', 'http://[::1]:2718'])(
    'accepts valid loopback Origin %s',
    (origin) => {
      expect(
        getRequestSecurityError({
          origin,
          apiKey: 'caller-key',
          requireCredentials: true,
        }),
      ).toBeUndefined();
    },
  );
});

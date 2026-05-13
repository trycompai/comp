import { REDACTED_VALUE, sanitizeEvidence } from './evidence-sanitizer';

describe('evidence-sanitizer', () => {
  describe('top-level sensitive keys', () => {
    it('redacts string values under sensitive keys', () => {
      expect(sanitizeEvidence({ password: 'mySecret' })).toEqual({
        password: REDACTED_VALUE,
      });
    });

    it('matches case-insensitively', () => {
      expect(
        sanitizeEvidence({ Password: 'x', PASSWORD: 'y', PassWord: 'z' }),
      ).toEqual({
        Password: REDACTED_VALUE,
        PASSWORD: REDACTED_VALUE,
        PassWord: REDACTED_VALUE,
      });
    });

    it('redacts snake_case credential keys (e.g. AWS-style access_key_id)', () => {
      expect(
        sanitizeEvidence({
          access_key_id: 'AKIAIOSFODNN7EXAMPLE',
          secret_access_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          session_token: 'IQoJb3JpZ2luX2VjEHMa...',
        }),
      ).toEqual({
        access_key_id: REDACTED_VALUE,
        secret_access_key: REDACTED_VALUE,
        session_token: REDACTED_VALUE,
      });
    });

    it('redacts kebab-case and dotted credential keys (e.g. x-api-key)', () => {
      expect(
        sanitizeEvidence({
          'x-api-key': 'sk-abc',
          'auth.token': 'bearer-xyz',
        }),
      ).toEqual({
        'x-api-key': REDACTED_VALUE,
        'auth.token': REDACTED_VALUE,
      });
    });

    it('redacts every configured sensitive suffix pattern', () => {
      const input: Record<string, string> = {
        password: 'a',
        userPassword: 'a2',
        secret: 'b',
        clientSecret: 'b2',
        token: 'c',
        accessToken: 'c2',
        refreshToken: 'c3',
        bearerToken: 'c4',
        credential: 'd',
        credentials: 'd2',
        awsCredentials: 'd3',
        privateKey: 'e',
        publicKey: 'e2',
        accessKey: 'f',
        accessKeyId: 'f2',
        secretAccessKey: 'f3',
        apiKey: 'g',
        signingKey: 'h',
        sessionId: 'i',
        sessionToken: 'i2',
        bearer: 'j',
        authorization: 'k',
        cookie: 'l',
      };
      const result = sanitizeEvidence(input) as Record<string, unknown>;
      for (const key of Object.keys(input)) {
        expect(result[key]).toBe(REDACTED_VALUE);
      }
    });

    it('leaves non-sensitive keys unchanged', () => {
      expect(
        sanitizeEvidence({
          bucketName: 'logs-archive',
          region: 'us-east-1',
          accountId: '123456789012',
        }),
      ).toEqual({
        bucketName: 'logs-archive',
        region: 'us-east-1',
        accountId: '123456789012',
      });
    });

    it('does NOT redact keys that merely contain a sensitive word as a prefix or middle', () => {
      // suffix-match means these stay visible — they are config info, not secrets
      expect(
        sanitizeEvidence({
          passwordPolicy: { minimumLength: 14 },
          requirePassword: true,
          tokenLifetime: 3600,
          secretsCount: 5,
        }),
      ).toEqual({
        passwordPolicy: { minimumLength: 14 },
        requirePassword: true,
        tokenLifetime: 3600,
        secretsCount: 5,
      });
    });

    it('does NOT redact booleans or numbers even when key is sensitive', () => {
      // preserving non-string config like `requirePassword: true` is important
      // for auditors — the FACT that a flag is set is not itself a secret
      expect(
        sanitizeEvidence({
          requireSecret: false,
          tokenCount: 3,
        }),
      ).toEqual({
        requireSecret: false,
        tokenCount: 3,
      });
    });
  });

  describe('nested objects', () => {
    it('redacts sensitive keys deep in the tree', () => {
      expect(
        sanitizeEvidence({
          bucket: {
            name: 'my-bucket',
            config: { accessKey: 'AKIA1234' },
          },
        }),
      ).toEqual({
        bucket: {
          name: 'my-bucket',
          config: { accessKey: REDACTED_VALUE },
        },
      });
    });

    it('redacts whole nested object when its key is sensitive', () => {
      expect(
        sanitizeEvidence({
          bucket: {
            name: 'logs',
            credentials: { accessKeyId: 'AKIA', secretAccessKey: 'sk' },
          },
        }),
      ).toEqual({
        bucket: {
          name: 'logs',
          credentials: REDACTED_VALUE,
        },
      });
    });
  });

  describe('arrays', () => {
    it('sanitizes objects inside arrays', () => {
      expect(
        sanitizeEvidence({
          users: [
            { name: 'john', token: 'abc' },
            { name: 'alice', token: 'def' },
          ],
        }),
      ).toEqual({
        users: [
          { name: 'john', token: REDACTED_VALUE },
          { name: 'alice', token: REDACTED_VALUE },
        ],
      });
    });

    it('preserves arrays of primitives', () => {
      expect(
        sanitizeEvidence({ regions: ['us-east-1', 'eu-west-1'] }),
      ).toEqual({
        regions: ['us-east-1', 'eu-west-1'],
      });
    });

    it('redacts string elements of an array under a sensitive key', () => {
      expect(
        sanitizeEvidence({
          tokens: ['t1', 't2', 't3'],
          numericMix: 'should stay visible',
        }),
      ).toEqual({
        tokens: [REDACTED_VALUE, REDACTED_VALUE, REDACTED_VALUE],
        numericMix: 'should stay visible',
      });
    });

    it('redacts object elements of an array under a sensitive key', () => {
      expect(
        sanitizeEvidence({
          credentials: [
            { user: 'john', secret: 'x' },
            { user: 'alice', secret: 'y' },
          ],
        }),
      ).toEqual({
        credentials: [REDACTED_VALUE, REDACTED_VALUE],
      });
    });

    it('handles a top-level array', () => {
      expect(sanitizeEvidence([{ token: 'a' }, { name: 'b' }])).toEqual([
        { token: REDACTED_VALUE },
        { name: 'b' },
      ]);
    });
  });

  describe('non-object inputs', () => {
    it('returns null/undefined unchanged', () => {
      expect(sanitizeEvidence(null)).toBeNull();
      expect(sanitizeEvidence(undefined)).toBeUndefined();
    });

    it('returns primitives unchanged', () => {
      expect(sanitizeEvidence('hello')).toBe('hello');
      expect(sanitizeEvidence(42)).toBe(42);
      expect(sanitizeEvidence(true)).toBe(true);
      expect(sanitizeEvidence(false)).toBe(false);
    });
  });

  describe('purity', () => {
    it('does not mutate the input', () => {
      const input = {
        bucketName: 'logs',
        accessKey: 'AKIA',
        nested: { token: 'xyz' },
      };
      const snapshot = JSON.stringify(input);
      sanitizeEvidence(input);
      expect(JSON.stringify(input)).toBe(snapshot);
    });
  });

  describe('realistic AWS payload', () => {
    it('keeps policy structure visible and redacts only credentials', () => {
      const input = {
        accountId: '123456789012',
        passwordPolicy: {
          minimumPasswordLength: 8,
          requireSymbols: true,
          requireUppercaseCharacters: false,
        },
        region: 'us-east-1',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      };
      expect(sanitizeEvidence(input)).toEqual({
        accountId: '123456789012',
        passwordPolicy: {
          minimumPasswordLength: 8,
          requireSymbols: true,
          requireUppercaseCharacters: false,
        },
        region: 'us-east-1',
        accessKeyId: REDACTED_VALUE,
        secretAccessKey: REDACTED_VALUE,
      });
    });
  });
});

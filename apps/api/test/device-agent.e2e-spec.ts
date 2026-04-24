/**
 * Device-agent long-lived session — end-to-end integration tests.
 *
 * Strategy
 * --------
 * - `@trycompai/db`          → mocked at module level (mockDb)
 * - `../src/auth/auth.server` → mocked at module level (mockGetSession,
 *                               mockHasPermission, mockInternalCreateSession)
 * - `../src/device-agent/device-agent-kv` → mocked (mockRedis)
 *
 * We spin up a real NestJS test-application using DeviceAgentModule so the
 * full guard/controller/service chain executes.  Per-test setup overrides the
 * mock return values to cover every scenario.
 */

import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

// ---------------------------------------------------------------------------
// Module-level mock handles — must be declared before jest.mock calls
// ---------------------------------------------------------------------------

const mockGetSession = jest.fn();
const mockHasPermission = jest.fn();
const mockInternalCreateSession = jest.fn();

jest.mock('../src/auth/auth.server', () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      hasPermission: (...args: unknown[]) => mockHasPermission(...args),
    },
    $context: Promise.resolve({
      internalAdapter: {
        createSession: (...args: unknown[]) =>
          mockInternalCreateSession(...args),
      },
    }),
    handler: jest.fn(),
    options: {},
  },
  isTrustedOrigin: jest.fn().mockResolvedValue(true),
  getTrustedOrigins: jest.fn().mockReturnValue([]),
}));

const mockDevice = {
  findFirst: jest.fn(),
  findUnique: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
  findMany: jest.fn(),
};

const mockMember = {
  findFirst: jest.fn(),
  findMany: jest.fn(),
};

const mockSession = {
  delete: jest.fn(),
};

const mockApiKey = {
  findFirst: jest.fn(),
};

const mockOrganization = {
  findUnique: jest.fn(),
};

const mockDb = {
  device: mockDevice,
  member: mockMember,
  session: mockSession,
  apiKey: mockApiKey,
  organization: mockOrganization,
};

jest.mock('@trycompai/db', () => ({
  db: mockDb,
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, { code }: { code: string }) {
        super(message);
        this.code = code;
      }
    },
  },
}));

const mockRedis = {
  set: jest.fn(),
  get: jest.fn(),
  getdel: jest.fn(),
  del: jest.fn(),
};

jest.mock('../src/device-agent/device-agent-kv', () => ({
  deviceAgentRedisClient: mockRedis,
}));

// ---------------------------------------------------------------------------
// Import after mocks are set up
// ---------------------------------------------------------------------------

import { DeviceAgentModule } from '../src/device-agent/device-agent.module';

// ---------------------------------------------------------------------------
// Fixed test fixtures
// ---------------------------------------------------------------------------

const USER_ID = 'usr_test_001';
const ORG_ID = 'org_test_001';
const MEMBER_ID = 'mem_test_001';
const DEVICE_ID = 'dev_test_001';
const SESSION_ID_NEW = 'ses_new_001';
const SESSION_TOKEN_NEW = 'tok_new_001';
const SESSION_ID_OLD = 'ses_old_001';
const SESSION_ID_UPGRADED = 'ses_upgraded_001';
const SESSION_TOKEN_UPGRADED = 'tok_upgraded_001';
const AGENT_SESSION_ID = 'ses_agent_001';

/** Returns a minimal better-auth session with deviceAgent=true */
function makeAgentSession(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: USER_ID, email: 'test@example.com', role: null },
    session: {
      id: SESSION_ID_NEW,
      activeOrganizationId: ORG_ID,
      deviceAgent: true,
      ...overrides,
    },
  };
}

/** Returns a minimal better-auth session with deviceAgent=false (legacy web) */
function makeLegacySession(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: USER_ID, email: 'test@example.com', role: null },
    session: {
      id: SESSION_ID_OLD,
      activeOrganizationId: ORG_ID,
      deviceAgent: false,
      ...overrides,
    },
  };
}

function makeMember(role = 'owner') {
  return {
    id: MEMBER_ID,
    role,
    department: null,
    userId: USER_ID,
    organizationId: ORG_ID,
    deactivated: false,
  };
}

function makeDevice(overrides: Record<string, unknown> = {}) {
  return {
    id: DEVICE_ID,
    memberId: MEMBER_ID,
    organizationId: ORG_ID,
    agentSessionId: null,
    name: 'Test Mac',
    hostname: 'test-mac.local',
    platform: 'macos',
    osVersion: '14.0',
    serialNumber: 'SN001',
    diskEncryptionEnabled: true,
    antivirusEnabled: true,
    passwordPolicySet: true,
    screenLockEnabled: true,
    isCompliant: true,
    checkDetails: {},
    lastCheckIn: null,
    installedAt: new Date(),
    agentVersion: null,
    hardwareModel: null,
    ...overrides,
  };
}

const CHECKIN_BODY = {
  deviceId: DEVICE_ID,
  checks: [
    {
      checkType: 'disk_encryption',
      passed: true,
      checkedAt: new Date().toISOString(),
      details: { method: 'fde', raw: 'ok', message: 'encrypted' },
    },
  ],
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('DeviceAgent (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [DeviceAgentModule],
    }).compile();

    app = moduleRef.createNestApplication();

    // Mirror the global pipe + versioning from main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // -------------------------------------------------------------------------
  // 1. exchange-code — happy path
  // -------------------------------------------------------------------------

  describe('POST /v1/device-agent/exchange-code', () => {
    it('returns session_token and user_id, calls createSession with deviceAgent:true', async () => {
      const CODE = 'valid_code_abc';

      // Redis returns the stored auth code
      mockRedis.getdel.mockResolvedValueOnce({
        userId: USER_ID,
        state: 'some-state',
        createdAt: Date.now(),
      });

      // internalAdapter.createSession returns the new session
      mockInternalCreateSession.mockResolvedValueOnce({
        id: SESSION_ID_NEW,
        token: SESSION_TOKEN_NEW,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const res = await request(app.getHttpServer())
        .post('/v1/device-agent/exchange-code')
        .send({ code: CODE })
        .expect(201);

      expect(res.body).toMatchObject({
        session_token: SESSION_TOKEN_NEW,
        user_id: USER_ID,
      });

      expect(mockInternalCreateSession).toHaveBeenCalledTimes(1);

      // Verify deviceAgent:true was passed as part of the extra data arg
      const callArgs = mockInternalCreateSession.mock.calls[0] as unknown[];
      // Signature: createSession(userId, undefined, { expiresAt, deviceAgent }, overrideAll)
      const extraData = callArgs[2] as Record<string, unknown>;
      expect(extraData).toMatchObject({ deviceAgent: true });
    });

    it('returns 401 for an invalid or expired code', async () => {
      mockRedis.getdel.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .post('/v1/device-agent/exchange-code')
        .send({ code: 'stale' })
        .expect(401);
    });
  });

  // -------------------------------------------------------------------------
  // 2. register — links agentSessionId, no stale-session delete for fresh device
  // -------------------------------------------------------------------------

  describe('POST /v1/device-agent/register', () => {
    it('links agentSessionId; does NOT delete session for fresh device', async () => {
      // Guard: agent session (deviceAgent:true)
      mockGetSession.mockResolvedValue(makeAgentSession());
      mockMember.findFirst
        // 1st call: HybridAuthGuard member lookup (skipOrgCheck path is active here
        //           but register itself calls findFirst to verify org membership)
        .mockResolvedValueOnce(makeMember())
        // 2nd call: registerDevice membership check
        .mockResolvedValueOnce(makeMember());

      // The registration helpers call device.findUnique then device.create
      mockDevice.findUnique.mockResolvedValueOnce(null); // no existing device
      const freshDevice = makeDevice({ agentSessionId: null });
      mockDevice.create.mockResolvedValueOnce(freshDevice);
      mockDevice.update.mockResolvedValueOnce({
        ...freshDevice,
        agentSessionId: SESSION_ID_NEW,
      });

      const res = await request(app.getHttpServer())
        .post('/v1/device-agent/register')
        .set('Authorization', 'Bearer x')
        .send({
          name: 'Test Mac',
          hostname: 'test-mac.local',
          platform: 'macos',
          osVersion: '14.0',
          organizationId: ORG_ID,
          serialNumber: 'SN001',
        })
        .expect(201);

      expect(res.body).toMatchObject({ deviceId: DEVICE_ID });

      // agentSessionId linked to the session from the guard
      expect(mockDevice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ agentSessionId: SESSION_ID_NEW }),
        }),
      );

      // No stale session to delete
      expect(mockSession.delete).not.toHaveBeenCalled();
    });

    it('deletes stale agentSession when device already has a different one', async () => {
      mockGetSession.mockResolvedValue(makeAgentSession());
      mockMember.findFirst
        .mockResolvedValueOnce(makeMember())
        .mockResolvedValueOnce(makeMember());

      // Device already exists with a different agentSessionId
      const existingDevice = makeDevice({ agentSessionId: 'ses_stale_old' });
      mockDevice.findUnique.mockResolvedValueOnce({
        id: DEVICE_ID,
        memberId: MEMBER_ID,
      });
      mockDevice.update
        // first update call is from registerWithSerial
        .mockResolvedValueOnce(existingDevice)
        // second update call links new session
        .mockResolvedValueOnce({ ...existingDevice, agentSessionId: SESSION_ID_NEW });
      mockSession.delete.mockResolvedValueOnce({});

      await request(app.getHttpServer())
        .post('/v1/device-agent/register')
        .set('Authorization', 'Bearer x')
        .send({
          name: 'Test Mac',
          hostname: 'test-mac.local',
          platform: 'macos',
          osVersion: '14.0',
          organizationId: ORG_ID,
          serialNumber: 'SN001',
        })
        .expect(201);

      expect(mockSession.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ses_stale_old' },
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // 3. check-in — already a device-agent session → no upgrade
  // -------------------------------------------------------------------------

  describe('POST /v1/device-agent/check-in (deviceAgent=true)', () => {
    it('returns isCompliant + nextCheckIn without upgradedSessionToken', async () => {
      mockGetSession.mockResolvedValue(makeAgentSession());

      mockDevice.findFirst.mockResolvedValueOnce(makeDevice());
      mockDevice.update.mockResolvedValueOnce(makeDevice());

      const res = await request(app.getHttpServer())
        .post('/v1/device-agent/check-in')
        .set('Authorization', 'Bearer x')
        .send(CHECKIN_BODY)
        .expect(201);

      expect(res.body).toMatchObject({
        isCompliant: expect.any(Boolean),
        nextCheckIn: expect.any(String),
      });
      expect(res.body.upgradedSessionToken).toBeUndefined();

      // No new session should be created
      expect(mockInternalCreateSession).not.toHaveBeenCalled();
    });

    it('backfills agentSessionId when device.agentSessionId differs from session.id', async () => {
      // Device has a different (or null) agentSessionId
      mockGetSession.mockResolvedValue(makeAgentSession());

      mockDevice.findFirst.mockResolvedValueOnce(
        makeDevice({ agentSessionId: 'ses_old_different' }),
      );
      mockDevice.update.mockResolvedValueOnce(
        makeDevice({ agentSessionId: SESSION_ID_NEW }),
      );

      const res = await request(app.getHttpServer())
        .post('/v1/device-agent/check-in')
        .set('Authorization', 'Bearer x')
        .send(CHECKIN_BODY)
        .expect(201);

      // No upgrade token — this is just a backfill
      expect(res.body.upgradedSessionToken).toBeUndefined();

      // The update should write the current sessionId
      expect(mockDevice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ agentSessionId: SESSION_ID_NEW }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // 4. check-in — legacy web session → silent upgrade
  // -------------------------------------------------------------------------

  describe('POST /v1/device-agent/check-in (silent upgrade, deviceAgent=false)', () => {
    it('returns upgradedSessionToken and calls createSession with deviceAgent:true', async () => {
      mockGetSession.mockResolvedValue(makeLegacySession());

      // createDeviceAgentSession will call internalAdapter.createSession
      mockInternalCreateSession.mockResolvedValueOnce({
        id: SESSION_ID_UPGRADED,
        token: SESSION_TOKEN_UPGRADED,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      mockDevice.findFirst.mockResolvedValueOnce(makeDevice());
      mockDevice.update.mockResolvedValueOnce(
        makeDevice({ agentSessionId: SESSION_ID_UPGRADED }),
      );

      const res = await request(app.getHttpServer())
        .post('/v1/device-agent/check-in')
        .set('Authorization', 'Bearer x')
        .send(CHECKIN_BODY)
        .expect(201);

      expect(res.body).toMatchObject({
        isCompliant: expect.any(Boolean),
        nextCheckIn: expect.any(String),
        upgradedSessionToken: SESSION_TOKEN_UPGRADED,
      });

      expect(mockInternalCreateSession).toHaveBeenCalledTimes(1);

      const callArgs = mockInternalCreateSession.mock.calls[0] as unknown[];
      const extraData = callArgs[2] as Record<string, unknown>;
      expect(extraData).toMatchObject({ deviceAgent: true });

      // Device update should link to the new session id
      expect(mockDevice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agentSessionId: SESSION_ID_UPGRADED,
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // 5. revoke — admin succeeds (204), employee fails (403), wrong-org (404)
  // -------------------------------------------------------------------------

  describe('DELETE /v1/device-agent/sessions/:deviceId', () => {
    it('admin: returns 204 and deletes the agent session', async () => {
      // Guard resolves session for admin user with active org
      mockGetSession.mockResolvedValue(
        makeAgentSession({ activeOrganizationId: ORG_ID }),
      );
      // Permission check: admin passes
      mockHasPermission.mockResolvedValue({ success: true });
      // HybridAuthGuard member lookup
      mockMember.findFirst.mockResolvedValueOnce(makeMember('owner'));

      // Device found in org
      mockDevice.findFirst.mockResolvedValueOnce(
        makeDevice({ agentSessionId: AGENT_SESSION_ID }),
      );
      mockSession.delete.mockResolvedValueOnce({});

      await request(app.getHttpServer())
        .delete(`/v1/device-agent/sessions/${DEVICE_ID}`)
        .set('Authorization', 'Bearer x')
        .expect(204);

      expect(mockSession.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: AGENT_SESSION_ID },
        }),
      );
    });

    it('employee: returns 403, never deletes session', async () => {
      mockGetSession.mockResolvedValue(
        makeAgentSession({ activeOrganizationId: ORG_ID }),
      );
      // PermissionGuard denies
      mockHasPermission.mockResolvedValue({ success: false });
      mockMember.findFirst.mockResolvedValueOnce(makeMember('employee'));

      await request(app.getHttpServer())
        .delete(`/v1/device-agent/sessions/${DEVICE_ID}`)
        .set('Authorization', 'Bearer x')
        .expect(403);

      expect(mockSession.delete).not.toHaveBeenCalled();
    });

    it('wrong-org: returns 404 when device belongs to a different org', async () => {
      mockGetSession.mockResolvedValue(
        makeAgentSession({ activeOrganizationId: ORG_ID }),
      );
      mockHasPermission.mockResolvedValue({ success: true });
      mockMember.findFirst.mockResolvedValueOnce(makeMember('owner'));

      // Simulate device not found for caller's org
      mockDevice.findFirst.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .delete(`/v1/device-agent/sessions/${DEVICE_ID}`)
        .set('Authorization', 'Bearer x')
        .expect(404);

      expect(mockSession.delete).not.toHaveBeenCalled();
    });
  });
});

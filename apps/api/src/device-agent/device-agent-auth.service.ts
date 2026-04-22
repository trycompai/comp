import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { db, Prisma } from '@db';
import { auth } from '../auth/auth.server';
import { deviceAgentRedisClient } from './device-agent-kv';
import { createDeviceAgentSession } from './device-agent-session.helper';
import {
  registerWithSerial,
  registerWithoutSerial,
} from './device-registration.helpers';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { CheckInDto } from './dto/check-in.dto';

interface StoredAuthCode {
  userId: string;
  state: string;
  createdAt: number;
}

const CHECK_TYPE_TO_FIELD: Record<string, string> = {
  disk_encryption: 'diskEncryptionEnabled',
  antivirus: 'antivirusEnabled',
  password_policy: 'passwordPolicySet',
  screen_lock: 'screenLockEnabled',
};

@Injectable()
export class DeviceAgentAuthService {
  private readonly logger = new Logger(DeviceAgentAuthService.name);

  async generateAuthCode({
    headers,
    state,
  }: {
    headers: Headers;
    state: string;
  }) {
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      throw new UnauthorizedException('No active session');
    }

    const code = randomBytes(32).toString('hex');

    await deviceAgentRedisClient.set(
      `device-auth:${code}`,
      {
        userId: session.user.id,
        state,
        createdAt: Date.now(),
      },
      { ex: 120 },
    );

    return { code };
  }

  async exchangeCode({ code }: { code: string }) {
    const stored = await deviceAgentRedisClient.getdel<StoredAuthCode>(
      `device-auth:${code}`,
    );

    if (!stored) {
      throw new UnauthorizedException('Invalid or expired authorization code');
    }

    const session = await createDeviceAgentSession({ userId: stored.userId });

    return {
      session_token: session.token,
      user_id: stored.userId,
    };
  }

  async getMyOrganizations({ userId }: { userId: string }) {
    const memberships = await db.member.findMany({
      where: { userId, deactivated: false },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    const organizations = memberships.map((m) => ({
      organizationId: m.organization.id,
      organizationName: m.organization.name,
      organizationSlug: m.organization.slug,
      role: m.role,
    }));

    return { organizations };
  }

  async registerDevice({
    userId,
    sessionId,
    dto,
  }: {
    userId: string;
    sessionId: string;
    dto: RegisterDeviceDto;
  }) {
    const member = await db.member.findFirst({
      where: {
        userId,
        organizationId: dto.organizationId,
        deactivated: false,
      },
    });

    if (!member) {
      throw new ForbiddenException('Not a member of this organization');
    }

    const device = dto.serialNumber
      ? await registerWithSerial({ member, dto })
      : await registerWithoutSerial({ member, dto });

    if (device.agentSessionId && device.agentSessionId !== sessionId) {
      try {
        await db.session.delete({ where: { id: device.agentSessionId } });
      } catch (err) {
        if ((err as { code?: string }).code !== 'P2025') {
          this.logger.error(
            `Failed to delete stale agent session ${device.agentSessionId} for device ${device.id}: ${err}`,
          );
          throw err;
        }
      }
    }

    await db.device.update({
      where: { id: device.id },
      data: { agentSessionId: sessionId },
    });

    return { deviceId: device.id };
  }

  async checkIn({
    userId,
    sessionId,
    sessionDeviceAgent,
    dto,
  }: {
    userId: string;
    sessionId: string;
    sessionDeviceAgent: boolean;
    dto: CheckInDto;
  }) {
    const device = await db.device.findFirst({
      where: {
        id: dto.deviceId,
        member: { userId, deactivated: false },
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const checkFields: Record<string, boolean> = {
      diskEncryptionEnabled: device.diskEncryptionEnabled,
      antivirusEnabled: device.antivirusEnabled,
      passwordPolicySet: device.passwordPolicySet,
      screenLockEnabled: device.screenLockEnabled,
    };

    const checkDetails: Record<string, unknown> =
      (device.checkDetails as Record<string, unknown>) ?? {};

    for (const check of dto.checks) {
      const field = CHECK_TYPE_TO_FIELD[check.checkType];
      if (field) {
        checkFields[field] = check.passed;
      }
      checkDetails[check.checkType] = {
        ...check.details,
        passed: check.passed,
        checkedAt: check.checkedAt,
      };
    }

    const isCompliant =
      checkFields.diskEncryptionEnabled &&
      checkFields.antivirusEnabled &&
      checkFields.passwordPolicySet &&
      checkFields.screenLockEnabled;

    let upgradedSessionToken: string | undefined;
    let sessionIdToLink: string | undefined;

    if (!sessionDeviceAgent) {
      const upgraded = await createDeviceAgentSession({ userId });
      upgradedSessionToken = upgraded.token;
      sessionIdToLink = upgraded.sessionId;
    } else if (device.agentSessionId !== sessionId) {
      sessionIdToLink = sessionId;
    }

    await db.device.update({
      where: { id: dto.deviceId },
      data: {
        ...checkFields,
        checkDetails: checkDetails as Prisma.InputJsonValue,
        isCompliant,
        lastCheckIn: new Date(),
        ...(dto.agentVersion ? { agentVersion: dto.agentVersion } : {}),
        ...(sessionIdToLink !== undefined ? { agentSessionId: sessionIdToLink } : {}),
      },
    });

    return {
      isCompliant,
      nextCheckIn: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      ...(upgradedSessionToken ? { upgradedSessionToken } : {}),
    };
  }

  async revokeAgentAccess({
    organizationId,
    deviceId,
  }: {
    organizationId: string;
    deviceId: string;
  }): Promise<void> {
    const device = await db.device.findFirst({
      where: { id: deviceId, organizationId },
      select: { id: true, agentSessionId: true },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (!device.agentSessionId) {
      return;
    }

    try {
      await db.session.delete({ where: { id: device.agentSessionId } });
    } catch (err) {
      if ((err as { code?: string }).code !== 'P2025') {
        this.logger.error(
          `Failed to revoke agent session ${device.agentSessionId} for device ${device.id}: ${err}`,
        );
        throw err;
      }
    }
  }

  async getDeviceStatus({
    userId,
    deviceId,
    organizationId,
  }: {
    userId: string;
    deviceId?: string;
    organizationId?: string;
  }) {
    if (!deviceId) {
      const devices = await db.device.findMany({
        where: {
          member: { userId, deactivated: false },
          ...(organizationId ? { organizationId } : {}),
        },
        orderBy: { installedAt: 'desc' },
      });

      return { devices };
    }

    const device = await db.device.findFirst({
      where: {
        id: deviceId,
        member: { userId, deactivated: false },
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return { device };
  }
}

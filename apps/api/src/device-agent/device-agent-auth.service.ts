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
import {
  registerWithSerial,
  registerWithoutSerial,
} from './device-registration.helpers';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { CheckInDto } from './dto/check-in.dto';

interface StoredAuthCode {
  sessionToken: string;
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
        sessionToken: session.session.token,
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
      throw new UnauthorizedException(
        'Invalid or expired authorization code',
      );
    }

    return {
      session_token: stored.sessionToken,
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
    dto,
  }: {
    userId: string;
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

    return { deviceId: device.id };
  }

  async checkIn({ userId, dto }: { userId: string; dto: CheckInDto }) {
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

    await db.device.update({
      where: { id: dto.deviceId },
      data: {
        ...checkFields,
        checkDetails: checkDetails as Prisma.InputJsonValue,
        isCompliant,
        lastCheckIn: new Date(),
        ...(dto.agentVersion ? { agentVersion: dto.agentVersion } : {}),
      },
    });

    return {
      isCompliant,
      nextCheckIn: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
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

import { Injectable } from '@nestjs/common';
import { db } from '@db';
import type { IntegrationCredentialVersion } from '@prisma/client';

export interface CreateCredentialVersionDto {
  connectionId: string;
  encryptedPayload: object;
  expiresAt?: Date;
}

@Injectable()
export class CredentialRepository {
  async findById(id: string): Promise<IntegrationCredentialVersion | null> {
    return db.integrationCredentialVersion.findUnique({
      where: { id },
    });
  }

  async findLatestByConnection(
    connectionId: string,
  ): Promise<IntegrationCredentialVersion | null> {
    return db.integrationCredentialVersion.findFirst({
      where: { connectionId },
      orderBy: { version: 'desc' },
    });
  }

  async findByConnectionAndVersion(
    connectionId: string,
    version: number,
  ): Promise<IntegrationCredentialVersion | null> {
    return db.integrationCredentialVersion.findUnique({
      where: {
        connectionId_version: {
          connectionId,
          version,
        },
      },
    });
  }

  async findAllByConnection(
    connectionId: string,
  ): Promise<IntegrationCredentialVersion[]> {
    return db.integrationCredentialVersion.findMany({
      where: { connectionId },
      orderBy: { version: 'desc' },
    });
  }

  async create(
    data: CreateCredentialVersionDto,
  ): Promise<IntegrationCredentialVersion> {
    // Get the next version number
    const latestVersion = await this.findLatestByConnection(data.connectionId);
    const nextVersion = (latestVersion?.version ?? 0) + 1;

    return db.integrationCredentialVersion.create({
      data: {
        connectionId: data.connectionId,
        encryptedPayload: data.encryptedPayload,
        version: nextVersion,
        expiresAt: data.expiresAt,
      },
    });
  }

  async markRotated(id: string): Promise<IntegrationCredentialVersion> {
    return db.integrationCredentialVersion.update({
      where: { id },
      data: {
        rotatedAt: new Date(),
      },
    });
  }

  async deleteOldVersions(
    connectionId: string,
    keepCount: number = 5,
  ): Promise<number> {
    const versions = await db.integrationCredentialVersion.findMany({
      where: { connectionId },
      orderBy: { version: 'desc' },
      skip: keepCount,
      select: { id: true },
    });

    if (versions.length === 0) return 0;

    const result = await db.integrationCredentialVersion.deleteMany({
      where: {
        id: { in: versions.map((v) => v.id) },
      },
    });

    return result.count;
  }
}

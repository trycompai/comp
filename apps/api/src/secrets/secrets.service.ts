import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@trycompai/db';
import { encrypt, decrypt, type EncryptedData } from './encryption.util';

@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);

  async listSecrets(organizationId: string) {
    const secrets = await db.secret.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        createdAt: true,
        updatedAt: true,
        lastUsedAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return secrets;
  }

  async getSecret(id: string, organizationId: string) {
    const secret = await db.secret.findFirst({
      where: { id, organizationId },
    });

    if (!secret) {
      throw new NotFoundException('Secret not found');
    }

    const decryptedValue = decrypt(
      JSON.parse(secret.value) as EncryptedData,
    );

    return { ...secret, value: decryptedValue };
  }

  async createSecret(
    organizationId: string,
    data: {
      name: string;
      value: string;
      description?: string | null;
      category?: string | null;
    },
  ) {
    const existing = await db.secret.findUnique({
      where: {
        organizationId_name: { organizationId, name: data.name },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Secret with name ${data.name} already exists`,
      );
    }

    const encryptedValue = encrypt(data.value);

    return db.secret.create({
      data: {
        organizationId,
        name: data.name,
        value: JSON.stringify(encryptedValue),
        description: data.description,
        category: data.category,
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        createdAt: true,
      },
    });
  }

  async updateSecret(
    id: string,
    organizationId: string,
    data: {
      name?: string;
      value?: string;
      description?: string | null;
      category?: string | null;
    },
  ) {
    const existing = await db.secret.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Secret not found');
    }

    if (data.name && data.name !== existing.name) {
      const duplicate = await db.secret.findUnique({
        where: {
          organizationId_name: { organizationId, name: data.name },
        },
      });
      if (duplicate) {
        throw new BadRequestException(
          `Secret with name ${data.name} already exists`,
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.value !== undefined) {
      updateData.value = JSON.stringify(encrypt(data.value));
    }
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;

    return db.secret.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        updatedAt: true,
      },
    });
  }

  async deleteSecret(id: string, organizationId: string) {
    const existing = await db.secret.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Secret not found');
    }

    await db.secret.delete({ where: { id } });

    return { success: true, deletedSecretName: existing.name };
  }
}

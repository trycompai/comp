import { Injectable } from '@nestjs/common';
import { db } from '@db';
import type { IntegrationOAuthState } from '@prisma/client';
import { randomBytes } from 'crypto';

export interface CreateOAuthStateDto {
  providerSlug: string;
  organizationId: string;
  userId: string;
  codeVerifier?: string;
  redirectUrl?: string;
  /** Expiration time in minutes (default: 10) */
  expiresInMinutes?: number;
}

@Injectable()
export class OAuthStateRepository {
  async findByState(state: string): Promise<IntegrationOAuthState | null> {
    return db.integrationOAuthState.findUnique({
      where: { state },
    });
  }

  async create(data: CreateOAuthStateDto): Promise<IntegrationOAuthState> {
    const state = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + (data.expiresInMinutes ?? 10),
    );

    return db.integrationOAuthState.create({
      data: {
        state,
        providerSlug: data.providerSlug,
        organizationId: data.organizationId,
        userId: data.userId,
        codeVerifier: data.codeVerifier,
        redirectUrl: data.redirectUrl,
        expiresAt,
      },
    });
  }

  async delete(state: string): Promise<void> {
    await db.integrationOAuthState.delete({
      where: { state },
    });
  }

  async deleteById(id: string): Promise<void> {
    await db.integrationOAuthState.delete({
      where: { id },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await db.integrationOAuthState.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }

  async isValid(state: string): Promise<boolean> {
    const oauthState = await this.findByState(state);
    if (!oauthState) return false;
    return oauthState.expiresAt > new Date();
  }
}

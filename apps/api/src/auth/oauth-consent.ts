import { NotFoundException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import { db } from '@db';
import { parsePendingAuthorization } from './oauth-pending-authorization';

export class OAuthConsentQueryDto {
  @ApiProperty({ description: 'Consent code from the authorization redirect' })
  @IsString()
  @Matches(/^[A-Za-z0-9]{16,128}$/)
  consent_code!: string;
}

export interface PendingConsent {
  clientName: string;
  redirectUri: string;
}

export async function getPendingConsent({
  consentCode,
  userId,
}: {
  consentCode: string;
  userId: string;
}): Promise<PendingConsent> {
  const record = await db.verification.findFirst({
    where: { identifier: consentCode },
    orderBy: { createdAt: 'desc' },
    select: { value: true, expiresAt: true },
  });
  const pending =
    record && record.expiresAt > new Date()
      ? parsePendingAuthorization(record.value)
      : null;
  if (!pending?.requireConsent || pending.userId !== userId) {
    throw new NotFoundException();
  }

  const client = await db.oauthApplication.findUnique({
    where: { clientId: pending.clientId },
    select: { name: true, disabled: true },
  });
  if (!client || client.disabled) throw new NotFoundException();

  return { clientName: client.name, redirectUri: pending.redirectURI };
}

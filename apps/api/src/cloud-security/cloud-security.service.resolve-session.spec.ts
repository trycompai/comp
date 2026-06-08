jest.mock('@db', () => ({
  db: { integrationConnection: { findFirst: jest.fn() } },
  Prisma: {},
}));

import { db } from '@db';
import {
  CloudSecurityService,
  ConnectionNotFoundError,
} from './cloud-security.service';

type Ctor = ConstructorParameters<typeof CloudSecurityService>;

const findFirst = (db as unknown as {
  integrationConnection: { findFirst: jest.Mock };
}).integrationConnection.findFirst;

describe('CloudSecurityService.resolveAwsSession', () => {
  let credentialVault: { getDecryptedCredentials: jest.Mock };
  let awsService: { resolveRoleSession: jest.Mock };
  let service: CloudSecurityService;

  beforeEach(() => {
    credentialVault = { getDecryptedCredentials: jest.fn() };
    awsService = { resolveRoleSession: jest.fn() };
    service = new CloudSecurityService(
      credentialVault as unknown as Ctor[0],
      {} as unknown as Ctor[1],
      {} as unknown as Ctor[2],
      awsService as unknown as Ctor[3],
      {} as unknown as Ctor[4],
      {} as unknown as Ctor[5],
    );
    jest.clearAllMocks();
  });

  it('scopes the connection lookup by organizationId (tenant isolation)', async () => {
    findFirst.mockResolvedValueOnce(null);

    await expect(
      service.resolveAwsSession('conn_1', 'org_1'),
    ).rejects.toBeInstanceOf(ConnectionNotFoundError);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conn_1', organizationId: 'org_1', status: 'active' },
      }),
    );
  });

  it('returns not_configured for a non-AWS provider (never assumes)', async () => {
    findFirst.mockResolvedValueOnce({ provider: { slug: 'gcp' } });

    const result = await service.resolveAwsSession('conn_1', 'org_1');

    expect(result).toEqual({ ok: false, reason: 'not_configured' });
    expect(awsService.resolveRoleSession).not.toHaveBeenCalled();
  });

  it('returns not_configured when roleArn/externalId are missing', async () => {
    findFirst.mockResolvedValueOnce({
      provider: { slug: 'aws' },
      variables: {},
    });
    credentialVault.getDecryptedCredentials.mockResolvedValueOnce({
      externalId: 'eid', // roleArn missing
    });

    const result = await service.resolveAwsSession('conn_1', 'org_1');

    expect(result).toEqual({ ok: false, reason: 'not_configured' });
    expect(awsService.resolveRoleSession).not.toHaveBeenCalled();
  });

  it('returns the resolved session on success', async () => {
    findFirst.mockResolvedValueOnce({
      provider: { slug: 'aws' },
      variables: { regions: ['us-east-1'] },
    });
    credentialVault.getDecryptedCredentials.mockResolvedValueOnce({
      roleArn: 'arn:aws:iam::123456789012:role/x',
      externalId: 'eid',
      regions: ['us-east-1'],
    });
    awsService.resolveRoleSession.mockResolvedValueOnce({
      accessKeyId: 'AKIA_TEMP',
      secretAccessKey: 'secret',
      sessionToken: 'token',
    });

    const result = await service.resolveAwsSession('conn_1', 'org_1');

    expect(result).toEqual({
      ok: true,
      session: {
        accessKeyId: 'AKIA_TEMP',
        secretAccessKey: 'secret',
        sessionToken: 'token',
      },
    });
  });

  it('returns assume_failed with the real reason when the assume throws', async () => {
    findFirst.mockResolvedValueOnce({
      provider: { slug: 'aws' },
      variables: {},
    });
    credentialVault.getDecryptedCredentials.mockResolvedValueOnce({
      roleArn: 'arn:aws:iam::123456789012:role/x',
      externalId: 'eid',
      regions: ['us-east-1'],
    });
    awsService.resolveRoleSession.mockRejectedValueOnce(
      new Error('not authorized to perform sts:AssumeRole'),
    );

    const result = await service.resolveAwsSession('conn_1', 'org_1');

    expect(result).toEqual({
      ok: false,
      reason: 'assume_failed',
      error: 'not authorized to perform sts:AssumeRole',
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConnectionCheckRunnerService } from './connection-check-runner.service';
import { ConnectionRepository } from '../repositories/connection.repository';
import { ProviderRepository } from '../repositories/provider.repository';
import { CredentialVaultService } from './credential-vault.service';
import { OAuthCredentialsService } from './oauth-credentials.service';

jest.mock('@db', () => ({ db: {} }));

jest.mock('@trycompai/integration-platform', () => ({
  getManifest: jest.fn(),
  runAllChecks: jest.fn(),
}));

import { getManifest, runAllChecks } from '@trycompai/integration-platform';

const mockedGetManifest = getManifest as jest.Mock;
const mockedRunAllChecks = runAllChecks as jest.Mock;

const AWS_MANIFEST = {
  id: 'aws',
  name: 'AWS',
  auth: { type: 'custom' },
  checks: [{ id: 'aws-s3-public-access', name: 'S3 public access' }],
};

const RUN_RESULT = {
  results: [{ checkId: 'aws-s3-public-access', status: 'success', result: {} }],
  totalFindings: 0,
  totalPassing: 3,
};

describe('ConnectionCheckRunnerService', () => {
  let service: ConnectionCheckRunnerService;

  const mockConnectionRepository = { findById: jest.fn() };
  const mockProviderRepository = { findById: jest.fn() };
  const mockCredentialVaultService = {
    getDecryptedCredentials: jest.fn(),
    getValidAccessToken: jest.fn(),
    refreshOAuthTokens: jest.fn(),
  };
  const mockOAuthCredentialsService = { getCredentials: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionCheckRunnerService,
        { provide: ConnectionRepository, useValue: mockConnectionRepository },
        { provide: ProviderRepository, useValue: mockProviderRepository },
        {
          provide: CredentialVaultService,
          useValue: mockCredentialVaultService,
        },
        {
          provide: OAuthCredentialsService,
          useValue: mockOAuthCredentialsService,
        },
      ],
    }).compile();

    service = module.get(ConnectionCheckRunnerService);
    jest.clearAllMocks();

    mockConnectionRepository.findById.mockResolvedValue({
      id: 'conn_1',
      organizationId: 'org_1',
      providerId: 'prov_aws',
      status: 'active',
      variables: {},
    });
    mockProviderRepository.findById.mockResolvedValue({
      id: 'prov_aws',
      slug: 'aws',
    });
    mockedGetManifest.mockReturnValue(AWS_MANIFEST);
    mockCredentialVaultService.getDecryptedCredentials.mockResolvedValue({
      roleArn: 'arn:aws:iam::111111111111:role/x',
      externalId: 'ext',
    });
    mockedRunAllChecks.mockResolvedValue(RUN_RESULT);
  });

  it('runs the checks on the server and returns the raw result (no persistence)', async () => {
    const result = await service.runChecks({
      connectionId: 'conn_1',
      organizationId: 'org_1',
      checkId: 'aws-s3-public-access',
    });

    expect(mockedRunAllChecks).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'conn_1',
        organizationId: 'org_1',
        checkId: 'aws-s3-public-access',
      }),
    );
    expect(result).toBe(RUN_RESULT);
  });

  it('runs ALL checks when no checkId is given (auto-run path)', async () => {
    await service.runChecks({
      connectionId: 'conn_1',
      organizationId: 'org_1',
    });
    expect(mockedRunAllChecks).toHaveBeenCalledWith(
      expect.objectContaining({ checkId: undefined }),
    );
  });

  it('throws NotFound for a connection in another org (no cross-tenant run)', async () => {
    mockConnectionRepository.findById.mockResolvedValue({
      id: 'conn_1',
      organizationId: 'org_OTHER',
      providerId: 'prov_aws',
      status: 'active',
    });
    await expect(
      service.runChecks({ connectionId: 'conn_1', organizationId: 'org_1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockedRunAllChecks).not.toHaveBeenCalled();
  });

  it('throws BadRequest for an inactive connection', async () => {
    mockConnectionRepository.findById.mockResolvedValue({
      id: 'conn_1',
      organizationId: 'org_1',
      providerId: 'prov_aws',
      status: 'paused',
    });
    await expect(
      service.runChecks({ connectionId: 'conn_1', organizationId: 'org_1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockedRunAllChecks).not.toHaveBeenCalled();
  });

  it('throws BadRequest when credentials are missing', async () => {
    mockCredentialVaultService.getDecryptedCredentials.mockResolvedValue(null);
    await expect(
      service.runChecks({ connectionId: 'conn_1', organizationId: 'org_1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockedRunAllChecks).not.toHaveBeenCalled();
  });

  it('validates by auth type — rejects empty custom credentials (matches in-app run)', async () => {
    // AWS uses custom auth; empty creds must be rejected up front, not executed.
    mockCredentialVaultService.getDecryptedCredentials.mockResolvedValue({});
    await expect(
      service.runChecks({ connectionId: 'conn_1', organizationId: 'org_1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockedRunAllChecks).not.toHaveBeenCalled();
  });
});

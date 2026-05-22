import {
  GenerateCredentialReportCommand,
  GetAccountPasswordPolicyCommand,
  GetCredentialReportCommand,
  GetLoginProfileCommand,
  IAMClient,
  ListAccessKeysCommand,
  ListMFADevicesCommand,
  ListUsersCommand,
} from '@aws-sdk/client-iam';
import { IamAdapter } from './iam.adapter';

const CREDENTIAL_REPORT = [
  [
    'user',
    'arn',
    'user_creation_time',
    'password_enabled',
    'password_last_used',
    'password_last_changed',
    'password_next_rotation',
    'mfa_active',
    'access_key_1_active',
    'access_key_1_last_rotated',
    'access_key_1_last_used_date',
    'access_key_1_last_used_region',
    'access_key_1_last_used_service',
    'access_key_2_active',
    'access_key_2_last_rotated',
    'access_key_2_last_used_date',
    'access_key_2_last_used_region',
    'access_key_2_last_used_service',
    'cert_1_active',
    'cert_1_last_rotated',
    'cert_2_active',
    'cert_2_last_rotated',
  ].join(','),
  [
    '<root_account>',
    'arn:aws:iam::123456789012:root',
    '2024-01-01T00:00:00+00:00',
    'not_supported',
    'N/A',
    'not_supported',
    'not_supported',
    'true',
    'false',
    'N/A',
    'N/A',
    'N/A',
    'N/A',
    'false',
    'N/A',
    'N/A',
    'N/A',
    'N/A',
    'false',
    'N/A',
    'false',
    'N/A',
  ].join(','),
].join('\n');

function makeNoSuchEntityError(): Error {
  const error = new Error('Login profile does not exist');
  error.name = 'NoSuchEntity';
  return error;
}

function makeAccessDeniedError(): Error {
  const error = new Error('Not authorized to call iam:GetLoginProfile');
  error.name = 'AccessDeniedException';
  return error;
}

describe('IamAdapter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not raise MFA findings for IAM users without console access', async () => {
    const mfaCheckedUsers: string[] = [];
    jest
      .spyOn(IAMClient.prototype, 'send')
      .mockImplementation(async (command) => {
        if (command instanceof GetAccountPasswordPolicyCommand) {
          return {
            PasswordPolicy: {
              MinimumPasswordLength: 14,
              RequireUppercaseCharacters: true,
              RequireLowercaseCharacters: true,
              RequireNumbers: true,
              RequireSymbols: true,
            },
          };
        }

        if (command instanceof ListUsersCommand) {
          return {
            Users: [
              {
                UserName: 'console-user',
                Arn: 'arn:aws:iam::123456789012:user/console-user',
              },
              {
                UserName: 'api-only-user',
                Arn: 'arn:aws:iam::123456789012:user/api-only-user',
              },
            ],
          };
        }

        if (command instanceof GetLoginProfileCommand) {
          if (command.input.UserName === 'api-only-user') {
            throw makeNoSuchEntityError();
          }
          return { LoginProfile: { UserName: command.input.UserName } };
        }

        if (command instanceof ListMFADevicesCommand) {
          if (command.input.UserName)
            mfaCheckedUsers.push(command.input.UserName);
          return { MFADevices: [] };
        }

        if (command instanceof ListAccessKeysCommand) {
          return { AccessKeyMetadata: [] };
        }

        if (command instanceof GenerateCredentialReportCommand) return {};
        if (command instanceof GetCredentialReportCommand) {
          return { Content: Buffer.from(CREDENTIAL_REPORT, 'utf-8') };
        }

        return {};
      });

    const findings = await new IamAdapter().scan({
      credentials: {
        accessKeyId: 'key',
        secretAccessKey: 'secret',
      },
      region: 'us-east-1',
      accountId: '123456789012',
    });

    expect(mfaCheckedUsers).toEqual(['console-user']);
    expect(findings.map((finding) => finding.id)).toContain(
      'iam-no-mfa-console-user',
    );
    expect(findings.map((finding) => finding.id)).not.toContain(
      'iam-no-mfa-api-only-user',
    );
  });

  it('continues MFA checks when the console-access probe fails unexpectedly', async () => {
    const mfaCheckedUsers: string[] = [];
    jest
      .spyOn(IAMClient.prototype, 'send')
      .mockImplementation(async (command) => {
        if (command instanceof GetAccountPasswordPolicyCommand) {
          return {
            PasswordPolicy: {
              MinimumPasswordLength: 14,
              RequireUppercaseCharacters: true,
              RequireLowercaseCharacters: true,
              RequireNumbers: true,
              RequireSymbols: true,
            },
          };
        }

        if (command instanceof ListUsersCommand) {
          return {
            Users: [
              {
                UserName: 'console-probe-error-user',
                Arn: 'arn:aws:iam::123456789012:user/console-probe-error-user',
              },
            ],
          };
        }

        if (command instanceof GetLoginProfileCommand) {
          throw makeAccessDeniedError();
        }

        if (command instanceof ListMFADevicesCommand) {
          if (command.input.UserName)
            mfaCheckedUsers.push(command.input.UserName);
          return { MFADevices: [] };
        }

        if (command instanceof ListAccessKeysCommand) {
          return { AccessKeyMetadata: [] };
        }

        if (command instanceof GenerateCredentialReportCommand) return {};
        if (command instanceof GetCredentialReportCommand) {
          return { Content: Buffer.from(CREDENTIAL_REPORT, 'utf-8') };
        }

        return {};
      });

    const findings = await new IamAdapter().scan({
      credentials: {
        accessKeyId: 'key',
        secretAccessKey: 'secret',
      },
      region: 'us-east-1',
      accountId: '123456789012',
    });

    expect(mfaCheckedUsers).toEqual(['console-probe-error-user']);
    expect(findings.map((finding) => finding.id)).toContain(
      'iam-no-mfa-console-probe-error-user',
    );
  });
});

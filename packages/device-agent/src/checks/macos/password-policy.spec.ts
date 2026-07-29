import { beforeEach, describe, expect, it, vi } from 'vitest';

const execSyncMock = vi.fn();

vi.mock('node:child_process', () => ({
  execSync: (command: string) => execSyncMock(command),
}));

import { MacOSPasswordPolicyCheck } from './password-policy';

/**
 * Captured `pwpolicy getaccountpolicies` output of a stock, unmanaged Mac (macOS 26.2),
 * with the non-English `policyContentDescription` localizations trimmed.
 */
const ACCOUNT_POLICIES_MIN_4 = `Getting global account policies
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>policyCategoryPasswordContent</key>
	<array>
		<dict>
			<key>policyContent</key>
			<string>policyAttributePassword matches '.{4,}+'</string>
			<key>policyContentDescription</key>
			<dict>
				<key>en</key>
				<string>Enter a password that is four characters or more.</string>
			</dict>
			<key>policyIdentifier</key>
			<string>com.apple.defaultpasswordpolicy.fde</string>
		</dict>
	</array>
</dict>
</plist>
`;

/** The same output with the content policy's quantifier raised to 8 characters. */
const ACCOUNT_POLICIES_MIN_8 = ACCOUNT_POLICIES_MIN_4.replace("'.{4,}+'", "'.{8,}+'");

/** `pwpolicy getaccountpolicies` when no account policy is set at all. */
const NO_ACCOUNT_POLICIES = `Getting global account policies
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict/>
</plist>
`;

/** Representative `system_profiler SPConfigurationProfileDataType` output of a managed Mac. */
const MDM_PROFILE_MIN_8 = `Configuration Profiles:

    ProfileItems:

        PayloadType: com.apple.mobiledevice.passwordpolicy
        minLength: 8
`;

function mockCommands({
  accountPolicies,
  globalPolicy = '',
  configurationProfiles = '',
}: {
  accountPolicies: string;
  globalPolicy?: string;
  configurationProfiles?: string;
}) {
  execSyncMock.mockImplementation((command: string) => {
    if (command.includes('getaccountpolicies')) return accountPolicies;
    if (command.includes('getglobalpolicy')) return globalPolicy;
    if (command.includes('system_profiler')) return configurationProfiles;
    throw new Error(`unexpected command: ${command}`);
  });
}

describe('MacOSPasswordPolicyCheck', () => {
  beforeEach(() => {
    execSyncMock.mockReset();
  });

  it('fails when the effective account policy only requires 4 characters', async () => {
    // `minChars` in the deprecated global store is what our own remediation used to write;
    // macOS does not enforce it, so it must not make this check pass.
    mockCommands({ accountPolicies: ACCOUNT_POLICIES_MIN_4, globalPolicy: 'minChars=8\n' });

    const result = await new MacOSPasswordPolicyCheck().run();

    expect(result.passed).toBe(false);
    expect(result.details.message).toContain('only 4 characters');
    expect(execSyncMock.mock.calls.flat().join('\n')).not.toContain('getglobalpolicy');
  });

  it('fails when nothing constrains the password length', async () => {
    mockCommands({ accountPolicies: NO_ACCOUNT_POLICIES });

    const result = await new MacOSPasswordPolicyCheck().run();

    expect(result.passed).toBe(false);
    expect(result.details.message).toContain('No minimum password length policy detected');
  });

  it('passes when the account policy content requires 8 characters', async () => {
    mockCommands({ accountPolicies: ACCOUNT_POLICIES_MIN_8 });

    const result = await new MacOSPasswordPolicyCheck().run();

    expect(result.passed).toBe(true);
    expect(result.details.message).toContain('minimum 8 characters');
  });

  it('passes when an MDM passcode payload raises the minimum above the account policy', async () => {
    // A managed Mac keeps the built-in 4-character policy; the profile is enforced on top of it.
    mockCommands({
      accountPolicies: ACCOUNT_POLICIES_MIN_4,
      configurationProfiles: MDM_PROFILE_MIN_8,
    });

    const result = await new MacOSPasswordPolicyCheck().run();

    expect(result.passed).toBe(true);
    expect(result.details.message).toContain('minimum 8 characters');
  });
});

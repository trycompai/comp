import type { BasicAuthConfig } from '@trycompai/integration-platform';
import { buildBasicAuthCredentialFields } from './basic-auth-credential-fields';

describe('buildBasicAuthCredentialFields', () => {
  it('maps usernameField/passwordField to labeled fields (Fivetran api_key/api_secret)', () => {
    const config: BasicAuthConfig = {
      usernameField: 'api_key',
      passwordField: 'api_secret',
    };

    const fields = buildBasicAuthCredentialFields(config);

    // Ids must equal the config field names so the runtime finds them when
    // building the Basic auth header; labels must read as API Key / API Secret.
    expect(fields).toEqual([
      {
        id: 'api_key',
        label: 'API Key',
        type: 'text',
        required: true,
        placeholder: 'Enter API Key',
      },
      {
        id: 'api_secret',
        label: 'API Secret',
        type: 'password',
        required: true,
        placeholder: 'Enter API Secret',
      },
    ]);
  });

  it('falls back to generic username/password when field names are unset', () => {
    const fields = buildBasicAuthCredentialFields({} as BasicAuthConfig);

    expect(fields.map((f) => f.id)).toEqual(['username', 'password']);
    expect(fields.map((f) => f.label)).toEqual(['Username', 'Password']);
  });
});

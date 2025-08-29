import { Client, ItemCategory, ItemFieldType, createClient } from '@1password/sdk';

const VAULT_NAME = 'Browser Agent';
let onePassClient: Client | null = null;

/**
 * Get or create a 1Password client instance
 */
async function getOnePasswordClient(): Promise<Client> {
  if (!onePassClient) {
    onePassClient = await createClient({
      auth: process.env.OP_SERVICE_ACCOUNT_TOKEN!,
      integrationName: 'My Browserbase and 1Password Integration',
      integrationVersion: 'v1.0.0',
    });
  }
  return onePassClient;
}

/**
 * Create a 1Password login item
 */
export async function createOnePasswordLoginItem(params: {
  organizationId: string;
  username: string;
  password: string;
  titleSuffix?: string;
}) {
  const { organizationId, username, password, titleSuffix } = params;
  const client = await getOnePasswordClient();

  const loginItem = await client.items.create({
    title: `${organizationId}${titleSuffix ? ` - ${titleSuffix}` : ''}`,
    vaultId: VAULT_NAME,
    category: ItemCategory.Login,
    fields: [
      { id: 'username', title: 'username', value: username, fieldType: ItemFieldType.Text },
      { id: 'password', title: 'password', value: password, fieldType: ItemFieldType.Concealed },
    ],
  });

  return loginItem;
}

/**
 * Get credentials from 1Password
 */
export async function getOrgCredentials({ organizationId }: { organizationId: string }) {
  const client = await getOnePasswordClient();

  const onePassBaseUrl = `op://${VAULT_NAME}/${organizationId}`;
  const usernameUrl = `${onePassBaseUrl}/username`;
  const passwordUrl = `${onePassBaseUrl}/password`;

  console.log('usernameUrl', usernameUrl);
  console.log('passwordUrl', passwordUrl);

  const username = await client.secrets.resolve(usernameUrl);
  const password = await client.secrets.resolve(passwordUrl);

  return { username, password };
}

import { Client, createClient } from '@1password/sdk';

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
 * Get credentials from 1Password
 */
export async function getGitHubCredentials() {
  const client = await getOnePasswordClient();

  const vault = 'testing';
  const title = 'Login';

  const onePassBaseUrl = `op://${vault}/${title}`;
  const usernameUrl = `${onePassBaseUrl}/username`;
  const passwordUrl = `${onePassBaseUrl}/password`;

  const username = await client.secrets.resolve(usernameUrl);
  const password = await client.secrets.resolve(passwordUrl);

  return { username, password };
}

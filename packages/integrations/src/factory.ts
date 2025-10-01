import type { AWSCredentials } from './aws/src';
import { fetch as awsFetch } from './aws/src';

import type { AzureCredentials } from './azure/src';
import { fetch as azureFetch } from './azure/src';

import type { GCPCredentials } from './gcp/src';
import { fetch as gcpFetch } from './gcp/src';

// Add Deel credentials type
interface DeelCredentials {
  api_key: string;
}

// Add GitHub credentials type
interface GitHubCredentials {
  GITHUB_TOKEN: string;
}

// Define the EncryptedData type locally to avoid import issues
interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
  salt: string;
}

// Common interface for all integration findings
export interface IntegrationFinding {
  title: string;
  description: string;
  remediation: string;
  status: string;
  severity: string;
  resultDetails: any;
}

// Type for decrypt function
type DecryptFunction = (data: EncryptedData) => Promise<string>;

// Generic interface for integration handlers
export interface IntegrationHandler<T> {
  id: string;
  fetch: (credentials: T) => Promise<IntegrationFinding[]>;
  processCredentials: (
    encryptedSettings: Record<string, unknown>,
    decrypt: DecryptFunction,
  ) => Promise<T>;
}

// Common method to decrypt settings - takes decrypt function as a parameter
const decryptSettings = async (
  encryptedSettings: Record<string, unknown>,
  decrypt: DecryptFunction,
): Promise<Record<string, string>> => {
  const decryptedCredentials: Record<string, string> = {};

  for (const [key, value] of Object.entries(encryptedSettings)) {
    try {
      // Check if the value has the structure of EncryptedData
      if (
        value &&
        typeof value === 'object' &&
        'encrypted' in value &&
        'iv' in value &&
        'tag' in value &&
        'salt' in value
      ) {
        decryptedCredentials[key] = await decrypt(value as EncryptedData);
      } else {
        // If not encrypted, keep the original value
        decryptedCredentials[key] = String(value);
      }
    } catch (error) {
      console.error(`Error decrypting field ${key}:`, error);
    }
  }

  return decryptedCredentials;
};

// Initialize handlers map
const handlers: Map<string, IntegrationHandler<any>> = new Map();

// Initialize AWS handler
handlers.set('aws', {
  id: 'aws',
  fetch: awsFetch,
  processCredentials: async (encryptedSettings, decrypt) => {
    const decrypted = await decryptSettings(encryptedSettings, decrypt);
    return {
      region: decrypted.region,
      access_key_id: decrypted.access_key_id,
      secret_access_key: decrypted.secret_access_key,
    } as AWSCredentials;
  },
});

// Initialize Azure handler
handlers.set('azure', {
  id: 'azure',
  fetch: azureFetch,
  processCredentials: async (encryptedSettings, decrypt) => {
    const decrypted = await decryptSettings(encryptedSettings, decrypt);
    return {
      AZURE_CLIENT_ID: decrypted.AZURE_CLIENT_ID,
      AZURE_TENANT_ID: decrypted.AZURE_TENANT_ID,
      AZURE_CLIENT_SECRET: decrypted.AZURE_CLIENT_SECRET,
      AZURE_SUBSCRIPTION_ID: decrypted.AZURE_SUBSCRIPTION_ID,
    } as AzureCredentials;
  },
});

// Initialize GCP handler
handlers.set('gcp', {
  id: 'gcp',
  fetch: gcpFetch,
  processCredentials: async (encryptedSettings, decrypt) => {
    const decrypted = await decryptSettings(encryptedSettings, decrypt);
    return {
      organization_id: decrypted.organization_id,
      service_account_key: decrypted.service_account_key,
    } as GCPCredentials;
  },
});

// Initialize Deel handler (mock implementation since we don't have the actual fetch function)
handlers.set('deel', {
  id: 'deel',
  // This is a placeholder implementation; replace with actual fetch once available
  fetch: async (credentials: DeelCredentials): Promise<IntegrationFinding[]> => {
    return []; // Return empty array as placeholder
  },
  processCredentials: async (encryptedSettings, decrypt) => {
    const decrypted = await decryptSettings(encryptedSettings, decrypt);
    return {
      api_key: decrypted.api_key,
    } as DeelCredentials;
  },
});

// Initialize GitHub handler
handlers.set('github', {
  id: 'github',
  // Placeholder for now - will be used by automations
  fetch: async (credentials: GitHubCredentials): Promise<IntegrationFinding[]> => {
    return []; // GitHub integration is primarily for automation access
  },
  processCredentials: async (encryptedSettings, decrypt) => {
    const decrypted = await decryptSettings(encryptedSettings, decrypt);
    return {
      GITHUB_TOKEN: decrypted.GITHUB_TOKEN,
    } as GitHubCredentials;
  },
});

// Add additional integration handlers as needed

// Get an integration handler by ID
export const getIntegrationHandler = <T>(
  integrationId: string,
): IntegrationHandler<T> | undefined => {
  return handlers.get(integrationId);
};

// Export types
export type { AWSCredentials, AzureCredentials, DecryptFunction, EncryptedData, GCPCredentials };

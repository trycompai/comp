import Aws from "./aws/config";
import Azure from "./azure/config";
import Deel from "./deel/config";
import Gcp from "./gcp/config";

export const integrations = [Aws, Azure, Deel, Gcp];

// Export the integration factory
export { getIntegrationHandler, type IntegrationHandler } from "./factory";
export type {
  AWSCredentials,
  AzureCredentials,
  DecryptFunction,
  EncryptedData,
} from "./factory";

export type { AzureServiceAdapter } from './azure-service-adapter';
export {
  fetchAllPages,
  AZURE_CATEGORY_TO_SERVICE,
  AZURE_SERVICE_NAMES,
} from './azure-service-adapter';

export { AksAdapter } from './aks.adapter';
export { AppServiceAdapter } from './app-service.adapter';
export { ContainerRegistryAdapter } from './container-registry.adapter';
export { CosmosDbAdapter } from './cosmos-db.adapter';
export { EntraIdAdapter } from './entra-id.adapter';
export { KeyVaultAdapter } from './key-vault.adapter';
export { MonitorAdapter } from './monitor.adapter';
export { NetworkWatcherAdapter } from './network-watcher.adapter';
export { PolicyAdapter } from './policy.adapter';
export { SqlDatabaseAdapter } from './sql-database.adapter';
export { StorageAccountAdapter } from './storage-account.adapter';
export { VirtualMachineAdapter } from './virtual-machine.adapter';

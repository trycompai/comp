export {
  storageHttpsTlsCheck,
  storagePublicAccessCheck,
  storageEncryptionCheck,
} from './storage';
export { sqlTlsCheck, sqlPublicAccessCheck, sqlAuditingCheck } from './sql';
export { keyVaultProtectionCheck, keyVaultRbacCheck } from './key-vault';
export { nsgNoOpenPortsCheck } from './network';
export { rbacLeastPrivilegeCheck } from './entra-id';
export { monitorLoggingAlertingCheck } from './monitor';

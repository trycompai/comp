import {
  createNativeCompletionBinding,
  createNativeScanCompletionBinding,
  declarativeDefinitionIdentity,
  dynamicManifestIdentity,
} from '../../../../packages/integration-platform/src/runtime/completion-binding';

export const NATIVE_SOURCE_FIXTURE = 'a'.repeat(64);
export const NATIVE_TEMPLATE = 'frk_tt_68e52b26bf0e656af9e4e9c3';

// These are explicit known synthetic identities, never a deployed build claim.
export const nativeSdk = {
  createNativeCompletionBinding,
  createNativeScanCompletionBinding,
  declarativeDefinitionIdentity,
  dynamicManifestIdentity,
  getNativeSourceIdentity: jest.fn<string | null, []>(
    () => NATIVE_SOURCE_FIXTURE,
  ),
  isCodeManifest: jest.fn(() => true),
  getManifest: jest.fn(() => ({
    id: 'aws',
    checks: [{ id: 'synthetic-check', taskMapping: NATIVE_TEMPLATE }],
  })),
};

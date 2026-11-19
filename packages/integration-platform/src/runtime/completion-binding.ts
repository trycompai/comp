import { createHash } from 'node:crypto';

export interface NativeCompletionContext {
  taskId: string;
  credentialRevision: string | null;
  configurationMetadata: unknown;
}

function canonical({ value, depth = 0 }: { value: unknown; depth?: number }): string {
  if (depth > 64) throw new Error('Evidence configuration exceeds JSON depth');
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) {
    const entries: string[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, index);
      if (!descriptor || !('value' in descriptor)) throw new Error('Array is not JSON data');
      entries.push(canonical({ value: descriptor.value, depth: depth + 1 }));
    }
    if (Reflect.ownKeys(value).length !== value.length + 1) {
      throw new Error('Array has non-JSON properties');
    }
    return `[${entries.join(',')}]`;
  }
  if (
    typeof value !== 'object' ||
    !value ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    throw new Error('Evidence configuration is not JSON');
  }
  const keys = Object.keys(value);
  if (Reflect.ownKeys(value).length !== keys.length) throw new Error('Object is not JSON data');
  return `{${keys
    .sort()
    .map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !('value' in descriptor)) throw new Error('Object is not JSON data');
      return `${JSON.stringify(key)}:${canonical({ value: descriptor.value, depth: depth + 1 })}`;
    })
    .join(',')}}`;
}

function digest(value: unknown): string | null {
  try {
    return createHash('sha256').update(canonical({ value })).digest('hex');
  } catch {
    return null;
  }
}

/** A task-agnostic cloud scan has its own identity, never a fabricated task ID. */
export function createNativeScanCompletionBinding(input: {
  sourceIdentity: string | null;
  organizationId: string;
  connectionId: string;
  runId: string;
  startedAt: string;
  credentialRevision: string | null;
  variables: unknown;
  configurationMetadata: unknown;
  scanMode: string;
  baselineServices: string[];
  enabledServices: string[] | null;
}): string | null {
  if (
    !input.sourceIdentity ||
    !/^[a-f0-9]{64}$/.test(input.sourceIdentity) ||
    !input.organizationId ||
    !input.connectionId ||
    !input.runId ||
    !input.credentialRevision ||
    !Number.isFinite(Date.parse(input.startedAt))
  )
    return null;
  return digest({ kind: 'native-cloud-scan-evidence-v1', ...input });
}

export function declarativeDefinitionIdentity(input: {
  id: string;
  name: string;
  description: string;
  definition: unknown;
  taskMapping?: string;
  defaultSeverity?: string;
  variables?: unknown;
  service?: string;
}): string | null {
  return digest({
    kind: 'declarative-check-v1',
    id: input.id,
    name: input.name,
    description: input.description,
    definition: input.definition,
    taskMapping: input.taskMapping ?? null,
    defaultSeverity: input.defaultSeverity || 'medium',
    variables: input.variables ?? [],
    service: input.service ?? null,
  });
}

export function dynamicManifestIdentity(input: {
  slug: string;
  authConfig: unknown;
  baseUrl: string | null;
  defaultHeaders: unknown;
  syncDefinition: unknown;
  services: unknown;
}): string | null {
  return digest({
    kind: 'dynamic-manifest-v1',
    slug: input.slug,
    authConfig: input.authConfig,
    baseUrl: input.baseUrl,
    defaultHeaders: input.defaultHeaders,
    syncDefinition: input.syncDefinition,
    services: input.services,
  });
}

export function createNativeCompletionBinding(input: {
  sourceIdentity: string | null;
  definitionIdentity: string | null;
  manifestIdentity?: string | null;
  organizationId: string;
  connectionId: string;
  checkId: string;
  context?: NativeCompletionContext;
  variables: unknown;
}): string | null {
  const { context, sourceIdentity, definitionIdentity } = input;
  const manifestIdentity = input.manifestIdentity ?? null;
  if (
    !sourceIdentity ||
    !/^[a-f0-9]{64}$/.test(sourceIdentity) ||
    (definitionIdentity !== null && !/^[a-f0-9]{64}$/.test(definitionIdentity)) ||
    (manifestIdentity !== null && !/^[a-f0-9]{64}$/.test(manifestIdentity)) ||
    !context?.taskId ||
    !context.credentialRevision ||
    !input.organizationId ||
    !input.connectionId ||
    !input.checkId ||
    !input.variables ||
    typeof input.variables !== 'object' ||
    Array.isArray(input.variables) ||
    (context.configurationMetadata !== null &&
      (typeof context.configurationMetadata !== 'object' ||
        Array.isArray(context.configurationMetadata)))
  ) {
    return null;
  }
  // Only a digest and opaque revision are retained. Never include credential
  // values, bearer tokens or a caller-provided release/Git label.
  return digest({
    kind: 'native-task-evidence-v1',
    sourceIdentity,
    definitionIdentity,
    manifestIdentity,
    organizationId: input.organizationId,
    connectionId: input.connectionId,
    checkId: input.checkId,
    taskId: context.taskId,
    credentialRevision: context.credentialRevision,
    configurationMetadata: context.configurationMetadata,
    variables: input.variables,
  });
}

import type { OpenAPIObject } from '@nestjs/swagger';

const INTERNAL_PROPERTY_NAMES = [
  'checks',
  'evidenceLevel',
  'pipelineTesting',
  'scanDepth',
  'source',
  'testMode',
  'webhookUrl',
];

function shouldRemoveProperty(propertyName: string, propertySchema: unknown) {
  if (INTERNAL_PROPERTY_NAMES.includes(propertyName)) {
    return true;
  }

  if (propertyName !== 'templateId') {
    return false;
  }

  return JSON.stringify(propertySchema).includes('Finding template');
}

function collectSchemaRefs(value: unknown, refs: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectSchemaRefs(item, refs);
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (
      key === '$ref' &&
      typeof child === 'string' &&
      child.startsWith('#/components/schemas/')
    ) {
      refs.add(child.replace('#/components/schemas/', ''));
      continue;
    }

    collectSchemaRefs(child, refs);
  }
}

export function removeUnusedSchemas(document: OpenAPIObject): void {
  const schemas = document.components?.schemas;
  if (!schemas) {
    return;
  }

  const referencedSchemas = new Set<string>();
  collectSchemaRefs(document.paths, referencedSchemas);

  let size = 0;
  while (size !== referencedSchemas.size) {
    size = referencedSchemas.size;
    for (const schemaName of [...referencedSchemas]) {
      collectSchemaRefs(schemas[schemaName], referencedSchemas);
    }
  }

  for (const schemaName of Object.keys(schemas)) {
    if (!referencedSchemas.has(schemaName)) {
      delete schemas[schemaName];
    }
  }
}

function sanitizeSchemaDetails(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) sanitizeSchemaDetails(item);
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  const record = value as Record<string, unknown>;
  const properties = record.properties;

  if (properties && typeof properties === 'object') {
    const schemaProperties = properties as Record<string, unknown>;
    const removedProperties = new Set<string>();
    for (const [propertyName, propertySchema] of Object.entries(
      schemaProperties,
    )) {
      if (shouldRemoveProperty(propertyName, propertySchema)) {
        removedProperties.add(propertyName);
        delete schemaProperties[propertyName];
      }
    }

    if (Array.isArray(record.required)) {
      record.required = record.required.filter(
        (propertyName) =>
          typeof propertyName !== 'string' ||
          !removedProperties.has(propertyName),
      );
    }
  }

  if (
    Array.isArray(record.enum) &&
    record.enum.includes('secrets_info_disclosure')
  ) {
    delete record.enum;
  }

  for (const child of Object.values(record)) {
    sanitizeSchemaDetails(child);
  }
}

export function sanitizePublicSchemas(document: OpenAPIObject): void {
  const schemas = document.components?.schemas;
  if (!schemas) {
    return;
  }

  sanitizeSchemaDetails(schemas);
}

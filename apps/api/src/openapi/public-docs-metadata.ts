import type { OpenAPIObject } from '@nestjs/swagger';
import { PUBLIC_OPERATION_METADATA } from './operation-metadata';
import {
  PUBLIC_DOCS_EXCLUDED_PATH_PATTERNS,
  PUBLIC_DOCS_EXCLUDED_PREFIXES,
} from './public-docs-quality';
import { removeUnusedSchemas, sanitizePublicSchemas } from './schema-pruning';
import {
  toActionFragment,
  toOperationDescription,
  toSeoDescription,
  toSeoTitle,
} from './seo-text';
import { PUBLIC_TAG_METADATA } from './tag-metadata';
import type {
  OpenApiOperation,
  PublicOperationMetadata,
  PublicTagMetadata,
  PublicVisibility,
} from './types';

export const PUBLIC_OPENAPI_TITLE = 'Comp AI API';

export const PUBLIC_OPENAPI_DESCRIPTION =
  'Compliance automation API for SOC 2, ISO 27001, HIPAA, GDPR, evidence collection, policy workflows, Trust Access, security questionnaires, integrations, cloud checks, and device compliance.';

export const PUBLIC_SERVER_URL = 'https://api.trycomp.ai';

function getVisibilityForOperation(
  operation: OpenApiOperation,
  metadata?: PublicOperationMetadata,
): PublicVisibility {
  if (metadata?.visibility) {
    return metadata.visibility;
  }

  const tags = operation.tags ?? [];
  if (tags.some((tag) => PUBLIC_TAG_METADATA[tag]?.visibility === 'excluded')) {
    return 'excluded';
  }

  if (tags.some((tag) => PUBLIC_TAG_METADATA[tag]?.visibility === 'hidden')) {
    return 'hidden';
  }

  return 'public';
}

function createMintMetadata(
  metadata: PublicOperationMetadata,
): Record<string, unknown> {
  const sidebarTitle = metadata.sidebarTitle ?? metadata.summary;
  const description = toSeoDescription(metadata.description);
  const title = toSeoTitle(metadata.summary);

  return {
    title,
    sidebarTitle,
    description,
    'og:title': title,
    'og:description': description,
  };
}

function applyOperationMetadata(
  operation: OpenApiOperation,
  metadata: PublicOperationMetadata,
): void {
  operation.summary = metadata.summary;
  operation.description = metadata.description;
  operation['x-mint'] = {
    ...(metadata.href && { href: metadata.href }),
    metadata: createMintMetadata(metadata),
    ...(metadata.content && { content: metadata.content }),
  };

  if (metadata.codeSamples) {
    operation['x-codeSamples'] = metadata.codeSamples;
  }

  if (metadata.security) {
    operation.security = metadata.security;
  }
}

function createFallbackDescription(operation: OpenApiOperation): string {
  const summary = operation.summary?.trim();
  const primaryTag = operation.tags?.[0];
  const tagDescription = primaryTag
    ? PUBLIC_TAG_METADATA[primaryTag]?.description
    : undefined;

  if (summary) {
    const base = `${toActionFragment(summary)} in Comp AI.`;

    if (tagDescription) {
      return toOperationDescription(`${base} ${tagDescription}`);
    }

    return base;
  }

  return tagDescription ?? PUBLIC_OPENAPI_DESCRIPTION;
}

function applyFallbackOperationMetadata(operation: OpenApiOperation): void {
  const summary = operation.summary?.trim();
  if (!summary) {
    return;
  }

  const fallbackDescription = createFallbackDescription(operation);
  const existingDescription = operation.description?.trim();
  const description =
    existingDescription && existingDescription.length >= 120
      ? existingDescription
      : fallbackDescription;

  operation.description = toOperationDescription(description);
  operation['x-mint'] = {
    metadata: createMintMetadata({
      summary,
      description,
    }),
  };
}

function applyVisibility(
  operation: OpenApiOperation,
  visibility: PublicVisibility,
): void {
  if (visibility === 'hidden') {
    operation['x-hidden'] = true;
    delete operation['x-excluded'];
    return;
  }

  if (visibility === 'excluded') {
    operation['x-excluded'] = true;
    delete operation['x-hidden'];
    return;
  }

  delete operation['x-hidden'];
  delete operation['x-excluded'];
}

function addTagMetadata(document: OpenAPIObject): void {
  const usedTags = new Set<string>();
  for (const methods of Object.values(document.paths)) {
    for (const operation of Object.values(
      methods as Record<string, OpenApiOperation>,
    )) {
      for (const tag of operation.tags ?? []) {
        usedTags.add(tag);
      }
    }
  }

  document.tags = [...usedTags].sort().map((name) => {
    const metadata: PublicTagMetadata | undefined = PUBLIC_TAG_METADATA[name];
    return {
      name,
      ...(metadata?.description && { description: metadata.description }),
      ...(metadata?.group && { 'x-group': metadata.group }),
    };
  });
}

function removeExcludedPaths(paths: Record<string, unknown>): void {
  for (const routePath of Object.keys(paths)) {
    const isExcluded =
      PUBLIC_DOCS_EXCLUDED_PREFIXES.some((prefix) =>
        routePath.startsWith(prefix),
      ) ||
      PUBLIC_DOCS_EXCLUDED_PATH_PATTERNS.some((pattern) =>
        pattern.test(routePath),
      );

    if (isExcluded) {
      delete paths[routePath];
    }
  }
}

export function applyPublicOpenApiMetadata(document: OpenAPIObject): void {
  document.info.title = PUBLIC_OPENAPI_TITLE;
  document.info.description = PUBLIC_OPENAPI_DESCRIPTION;
  document.servers = [
    {
      url: PUBLIC_SERVER_URL,
      description: 'Production API Server',
    },
  ];

  const paths = document.paths as Record<
    string,
    Record<string, OpenApiOperation>
  >;
  removeExcludedPaths(paths);

  for (const [routePath, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (!operation || typeof operation !== 'object') {
        continue;
      }

      const metadata = operation.operationId
        ? PUBLIC_OPERATION_METADATA[operation.operationId]
        : undefined;

      if (metadata) {
        applyOperationMetadata(operation, metadata);
      }

      const visibility = getVisibilityForOperation(operation, metadata);
      if (visibility === 'excluded') {
        delete methods[method];
        continue;
      }

      if (!metadata) {
        applyFallbackOperationMetadata(operation);
      }

      applyVisibility(operation, visibility);
    }

    if (Object.keys(methods).length === 0) {
      delete paths[routePath];
    }
  }

  addTagMetadata(document);
  removeUnusedSchemas(document);
  sanitizePublicSchemas(document);
}

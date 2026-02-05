'use client';

import { env } from '@/env.mjs';

/**
 * Download evidence PDF for a specific automation
 */
export async function downloadAutomationPDF({
  taskId,
  automationId,
  automationName,
}: {
  taskId: string;
  automationId: string;
  automationName?: string;
}): Promise<void> {
  const baseUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
  const endpoint = `/v1/tasks/${taskId}/evidence/automation/${automationId}/pdf`;

  await downloadFile(baseUrl + endpoint, {
    fallbackBaseName: automationName ? `${automationName}-evidence` : 'automation-evidence',
    fallbackExtension: 'pdf',
  });
}

/**
 * Download evidence ZIP for a task
 */
export async function downloadTaskEvidenceZip({
  taskId,
  taskTitle,
  includeJson = false,
}: {
  taskId: string;
  taskTitle?: string;
  includeJson?: boolean;
}): Promise<void> {
  const baseUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
  const endpoint = `/v1/tasks/${taskId}/evidence/export?includeJson=${includeJson}`;

  await downloadFile(baseUrl + endpoint, {
    fallbackBaseName: taskTitle ? `${taskTitle}-evidence` : 'task-evidence',
    fallbackExtension: 'zip',
  });
}

/**
 * Download all evidence for the organization (auditor only)
 */
export async function downloadAllEvidenceZip({
  organizationName,
  includeJson = false,
}: {
  organizationName?: string;
  includeJson?: boolean;
}): Promise<void> {
  const baseUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
  const endpoint = `/v1/evidence-export/all?includeJson=${includeJson}`;

  await downloadFile(baseUrl + endpoint, {
    fallbackBaseName: organizationName
      ? `${organizationName}-all-evidence`
      : 'all-evidence',
    fallbackExtension: 'zip',
  });
}

/**
 * Internal function to download a file from the API
 */
function sanitizeFilename(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function buildFallbackFilename(baseName: string, extension: string): string {
  const safeBase = sanitizeFilename(baseName) || 'evidence-export';
  const dateSuffix = new Date().toISOString().slice(0, 10);
  return `${safeBase}_${dateSuffix}.${extension}`;
}

async function downloadFile(
  url: string,
  fallback?: { fallbackBaseName: string; fallbackExtension: string },
): Promise<void> {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Failed to download: ${response.statusText}`);
  }

  // Get filename from Content-Disposition header
  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = fallback
    ? buildFallbackFilename(fallback.fallbackBaseName, fallback.fallbackExtension)
    : 'evidence-export';
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }
  }

  // Download the file
  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}

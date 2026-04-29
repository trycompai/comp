import type { ManifestControl, ManifestPolicy, ManifestTask } from './manifest.types';

export function isControlEdited(
  instance: { name: string; description: string },
  manifest: ManifestControl,
): boolean {
  return instance.name !== manifest.name || instance.description !== manifest.description;
}

export function isTaskEdited(
  instance: { title: string; description: string; frequency: string | null; department: string | null },
  manifest: ManifestTask,
): boolean {
  return (
    instance.title !== manifest.name ||
    instance.description !== manifest.description ||
    instance.frequency !== manifest.frequency ||
    instance.department !== manifest.department
  );
}

/**
 * Policy content can be stored either as the full TipTap doc object
 * (`{type: 'doc', content: [...]}`) or as just the inner node array. Instance
 * rows use the inner array (via Policy.content: Json[]); manifest entries copy
 * the template's raw Json which may be either shape. Normalize both sides so
 * equivalent content doesn't register as edited and block template updates.
 */
function normalizeTipTapContent(content: unknown): unknown {
  if (Array.isArray(content)) return content;
  if (
    content &&
    typeof content === 'object' &&
    'type' in content &&
    (content as Record<string, unknown>).type === 'doc' &&
    'content' in content &&
    Array.isArray((content as Record<string, unknown>).content)
  ) {
    return (content as Record<string, unknown>).content;
  }
  return content;
}

export function isPolicyEdited(
  instance: { name: string; description: string | null; content: unknown; frequency: string | null; department: string | null },
  manifest: ManifestPolicy,
): boolean {
  return (
    instance.name !== manifest.name ||
    instance.description !== manifest.description ||
    instance.frequency !== manifest.frequency ||
    instance.department !== manifest.department ||
    JSON.stringify(normalizeTipTapContent(instance.content)) !==
      JSON.stringify(normalizeTipTapContent(manifest.content))
  );
}

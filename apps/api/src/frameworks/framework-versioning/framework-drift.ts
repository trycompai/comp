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

export function isPolicyEdited(
  instance: { name: string; description: string | null; content: unknown; frequency: string | null; department: string | null },
  manifest: ManifestPolicy,
): boolean {
  return (
    instance.name !== manifest.name ||
    instance.description !== manifest.description ||
    instance.frequency !== manifest.frequency ||
    instance.department !== manifest.department ||
    JSON.stringify(instance.content) !== JSON.stringify(manifest.content)
  );
}

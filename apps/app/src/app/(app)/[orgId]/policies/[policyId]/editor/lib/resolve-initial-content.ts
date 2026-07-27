import type { JSONContent } from '@tiptap/react';

/** Minimal shape needed to resolve a version's editor content. */
interface VersionContentSource {
  id: string;
  content: unknown;
}

interface ResolveInitialPolicyContentArgs {
  /**
   * The version the editor is opening on — e.g. the `versionId` in the URL when
   * a draft is opened via "Edit" from the Versions tab. Undefined when simply
   * viewing the current/published content.
   */
  initialVersionId?: string;
  /** All known policy versions (each carrying its own content snapshot). */
  versions: VersionContentSource[];
  /** Fallback content: the published/current version's content. */
  policyContent: JSONContent | JSONContent[];
}

/**
 * Decide which content the policy editor should display on mount.
 *
 * The Content tab is unmounted when you switch tabs (the design-system Tabs do
 * not keep inactive panels mounted), so clicking "Edit" on a draft from the
 * Versions tab remounts it fresh with a `versionId` already in the URL. In that
 * case the editor must seed from THAT version's content. Falling back to
 * `policyContent` (which is always the published/current version's content) is
 * what made a draft's saved edits appear to vanish.
 *
 * Pure and side-effect free so it can be unit-tested without mounting the editor.
 */
export function resolveInitialPolicyContent({
  initialVersionId,
  versions,
  policyContent,
}: ResolveInitialPolicyContentArgs): JSONContent[] {
  if (initialVersionId) {
    const version = versions.find((v) => v.id === initialVersionId);
    if (version) {
      return toContentArray(version.content);
    }
  }
  return toContentArray(policyContent);
}

/** Normalize content to an array, matching the editor's existing handling. */
function toContentArray(raw: unknown): JSONContent[] {
  return Array.isArray(raw) ? (raw as JSONContent[]) : [raw as JSONContent];
}

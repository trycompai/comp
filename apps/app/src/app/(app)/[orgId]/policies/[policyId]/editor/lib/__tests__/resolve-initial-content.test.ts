import type { JSONContent } from '@tiptap/react';
import { describe, expect, it } from 'vitest';
import { resolveInitialPolicyContent } from '../resolve-initial-content';

const publishedContent: JSONContent[] = [
  { type: 'paragraph', content: [{ type: 'text', text: 'published' }] },
];
const draftContent: JSONContent[] = [
  { type: 'paragraph', content: [{ type: 'text', text: 'draft edit' }] },
];

describe('resolveInitialPolicyContent', () => {
  it('seeds from the targeted version when initialVersionId matches a draft (the bug fix)', () => {
    const result = resolveInitialPolicyContent({
      initialVersionId: 'pv_draft',
      versions: [
        { id: 'pv_published', content: publishedContent },
        { id: 'pv_draft', content: draftContent },
      ],
      policyContent: publishedContent,
    });

    expect(result).toEqual(draftContent);
  });

  it('falls back to policyContent when no initialVersionId is given', () => {
    const result = resolveInitialPolicyContent({
      initialVersionId: undefined,
      versions: [{ id: 'pv_draft', content: draftContent }],
      policyContent: publishedContent,
    });

    expect(result).toEqual(publishedContent);
  });

  it('falls back to policyContent when initialVersionId matches no known version', () => {
    const result = resolveInitialPolicyContent({
      initialVersionId: 'pv_missing',
      versions: [{ id: 'pv_draft', content: draftContent }],
      policyContent: publishedContent,
    });

    expect(result).toEqual(publishedContent);
  });

  it('wraps a single (non-array) version content into an array', () => {
    const singleNode: JSONContent = { type: 'paragraph', content: [{ type: 'text', text: 'one' }] };
    const result = resolveInitialPolicyContent({
      initialVersionId: 'pv_draft',
      versions: [{ id: 'pv_draft', content: singleNode }],
      policyContent: publishedContent,
    });

    expect(result).toEqual([singleNode]);
  });

  it('wraps a single (non-array) policyContent fallback into an array', () => {
    const singleNode: JSONContent = { type: 'paragraph', content: [{ type: 'text', text: 'pub' }] };
    const result = resolveInitialPolicyContent({
      initialVersionId: undefined,
      versions: [],
      policyContent: singleNode,
    });

    expect(result).toEqual([singleNode]);
  });

  it('returns an empty array for an empty draft version (does not fall back)', () => {
    const result = resolveInitialPolicyContent({
      initialVersionId: 'pv_draft',
      versions: [{ id: 'pv_draft', content: [] }],
      policyContent: publishedContent,
    });

    expect(result).toEqual([]);
  });
});

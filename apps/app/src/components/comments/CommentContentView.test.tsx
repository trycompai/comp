import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The TipTap editor instance is irrelevant to the plain-text render branch
// exercised here, so stub it out to keep the test light and deterministic.
vi.mock('@tiptap/react', () => ({
  useEditor: () => null,
  EditorContent: () => null,
}));

vi.mock('@trycompai/ui/editor', () => ({
  validateAndFixTipTapContent: (content: unknown) => content,
  createMentionExtension: () => ({}),
}));

vi.mock('@trycompai/ui/editor/extensions', () => ({
  defaultExtensions: () => [],
}));

vi.mock('@/hooks/use-organization-members', () => ({
  useOrganizationMembers: () => ({ members: [] }),
}));

import { CommentContentView } from './CommentContentView';

// Regression for CS-592: a long, space-less URL pasted into a finding comment
// rendered as a single unbreakable token and overflowed the comment card / sheet
// horizontally (the comment column is a flex `min-w:auto` item, so the break
// must shrink min-content — `break-all` / `overflow-wrap: anywhere`, not
// `break-word`).
describe('CommentContentView', () => {
  const longUrl =
    'https://app.trycomp.ai/org_0ab47745b0c0b2c/tasks/tsk_6916cd97cc6f4c40bca83199';

  it('renders plain-text URLs as links that can wrap instead of overflowing', () => {
    // A non-JSON string takes the plain-text render branch.
    render(<CommentContentView content={`See ${longUrl}`} />);

    const link = screen.getByRole('link', { name: longUrl });
    expect(link).toHaveAttribute('href', longUrl);
    expect(link).toHaveClass('break-all');
  });

  it('breaks long URLs inside rendered TipTap (.ProseMirror) content', () => {
    // The TipTap render branch styles links via the global editor stylesheet,
    // which cannot be exercised through jsdom layout — guard the rule directly.
    const css = readFileSync(resolve(process.cwd(), 'src/styles/editor.css'), 'utf8');
    const linkRule = css.match(/\.ProseMirror a\s*\{([\s\S]*?)\}/);

    expect(linkRule).not.toBeNull();
    expect(linkRule?.[1]).toContain('overflow-wrap: anywhere');
  });
});

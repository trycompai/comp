# Inline Suggestion Mode — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate ProposedChangesCard with inline suggestions rendered directly inside the TipTap policy editor, using ProseMirror decorations for visual diffs and gutter icons for accept/reject actions.

**Architecture:** A `useSuggestions` hook diffs current vs proposed markdown, maps diff hunks to ProseMirror document positions via a `buildPositionMap` utility, and produces `SuggestionRange[]`. A TipTap `SuggestionsExtension` renders these ranges as inline decorations (strikethrough for deletions, highlighted insertions, gutter accept/reject icons). A `SuggestionsTopBar` component shows a summary bar above the editor. The editor's real document is never mutated by the suggestion system — only accepting a change triggers a real document edit.

**Tech Stack:** TipTap 2 / ProseMirror (decorations, plugins), React 19, `diff` library (structuredPatch, diffWords), TypeScript strict mode, Vitest for tests.

**Design spec:** `docs/specs/2026-03-13-inline-suggestions-design.md`

---

## File Structure

```
apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/
  lib/
    suggestion-types.ts                   # NEW — Shared types (SuggestionRange, DiffSegment, PositionMap)
    build-position-map.ts                 # NEW — ProseMirror doc → markdown + line→position map
    compute-suggestion-ranges.ts          # NEW — Diff two markdowns → SuggestionRange[]
  hooks/
    use-suggestions.ts                    # NEW — Core React hook orchestrating diff, decisions, actions
  components/
    ai/
      suggestions-top-bar.tsx             # NEW — Sticky summary bar above editor
      proposed-changes-card.tsx           # DELETE (replaced by inline suggestions)
      policy-ai-assistant.tsx             # MODIFY — remove hasActiveProposal "view below" hint
    PolicyDetails.tsx                     # MODIFY — swap ProposedChangesCard for useSuggestions

packages/ui/src/components/editor/
  index.tsx                               # MODIFY — add onEditorReady + additionalExtensions props
  extensions/
    suggestions.ts                        # NEW — ProseMirror plugin rendering decorations

apps/app/src/components/editor/
  advanced-editor.tsx                     # MODIFY — thread new editor props
  policy-editor.tsx                       # MODIFY — thread new editor props

apps/app/src/styles/editor.css            # MODIFY — add suggestion decoration styles
```

---

## Chunk 1: Foundation — Types, Position Map, Range Computation

### Task 1: Create shared types

**Files:**
- Create: `apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/lib/suggestion-types.ts`

- [ ] **Step 1: Write the types file**

```typescript
// suggestion-types.ts
export interface DiffSegment {
  text: string;
  type: 'unchanged' | 'insert' | 'delete';
}

export interface SuggestionRange {
  id: string;
  type: 'modify' | 'insert' | 'delete';
  /** ProseMirror position: start of affected range */
  from: number;
  /** ProseMirror position: end of affected range */
  to: number;
  /** For modifications: word-level diff segments for inline rendering */
  segments: DiffSegment[];
  /** The proposed replacement text (for inserts and modifications) */
  proposedText: string;
  /** The original text being replaced (for modifications and deletions) */
  originalText: string;
  /** User decision */
  decision: 'pending' | 'accepted' | 'rejected';
}

export interface PositionMap {
  /** Maps 1-indexed markdown line number → ProseMirror position range */
  lineToPos: Map<number, { from: number; to: number }>;
  /** The markdown text generated from the doc */
  markdown: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/lib/suggestion-types.ts
git commit -m "feat(suggestions): add shared type definitions for inline suggestions"
```

---

### Task 2: Build position map — maps markdown lines to ProseMirror positions

The position map is the bridge between text-based diffs and the ProseMirror document. It traverses the editor's doc tree, generates markdown for each node, and records which markdown line numbers correspond to which ProseMirror positions.

**Files:**
- Create: `apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/lib/build-position-map.ts`
- Create: `apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/lib/__tests__/build-position-map.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// build-position-map.test.ts
import { describe, expect, it } from 'vitest';
import { buildPositionMap } from '../build-position-map';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { schema } from '../test-helpers/editor-schema';

// Helper to create a doc from TipTap-style JSON
function createDoc(content: object[]): ProseMirrorNode {
  return ProseMirrorNode.fromJSON(schema, { type: 'doc', content });
}

describe('buildPositionMap', () => {
  it('maps a single paragraph to the correct line and positions', () => {
    const doc = createDoc([
      { type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] },
    ]);

    const result = buildPositionMap(doc);

    expect(result.markdown).toBe('Hello world');
    expect(result.lineToPos.get(1)).toEqual({ from: 1, to: 12 });
  });

  it('maps a heading to the correct line with markdown prefix', () => {
    const doc = createDoc([
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Title' }] },
    ]);

    const result = buildPositionMap(doc);

    expect(result.markdown).toBe('## Title');
    // Position covers the heading node's content
    expect(result.lineToPos.get(1)).toBeDefined();
  });

  it('maps multiple blocks with correct line numbers', () => {
    const doc = createDoc([
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'First paragraph.' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Second paragraph.' }] },
    ]);

    const result = buildPositionMap(doc);

    const lines = result.markdown.split('\n');
    expect(lines).toContain('# Title');
    expect(lines).toContain('First paragraph.');
    expect(lines).toContain('Second paragraph.');

    // Each line should have a position entry
    for (let i = 1; i <= lines.length; i++) {
      if (lines[i - 1]?.trim()) {
        expect(result.lineToPos.has(i)).toBe(true);
      }
    }
  });

  it('maps bullet list items to individual lines', () => {
    const doc = createDoc([
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item one' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item two' }] }] },
        ],
      },
    ]);

    const result = buildPositionMap(doc);

    expect(result.markdown).toContain('- Item one');
    expect(result.markdown).toContain('- Item two');
  });

  it('returns an empty map for an empty doc', () => {
    const doc = createDoc([]);

    const result = buildPositionMap(doc);

    expect(result.markdown).toBe('');
    expect(result.lineToPos.size).toBe(0);
  });
});
```

- [ ] **Step 2: Create test-helpers/editor-schema.ts**

We need a ProseMirror schema that matches TipTap's for testing. Create a minimal schema:

```typescript
// apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/lib/test-helpers/editor-schema.ts
import { Schema } from '@tiptap/pm/model';

/**
 * Minimal ProseMirror schema matching TipTap's StarterKit for testing.
 * Only includes node types used in policy documents.
 */
export const schema = new Schema({
  nodes: {
    doc: { content: 'block*' },
    text: { group: 'inline' },
    paragraph: {
      group: 'block',
      content: 'inline*',
      parseDOM: [{ tag: 'p' }],
      toDOM: () => ['p', 0] as const,
    },
    heading: {
      group: 'block',
      content: 'inline*',
      attrs: { level: { default: 1 } },
      parseDOM: [1, 2, 3, 4, 5, 6].map((level) => ({
        tag: `h${level}`,
        attrs: { level },
      })),
      toDOM: (node) => [`h${node.attrs.level}`, 0] as const,
    },
    bulletList: {
      group: 'block',
      content: 'listItem+',
      parseDOM: [{ tag: 'ul' }],
      toDOM: () => ['ul', 0] as const,
    },
    orderedList: {
      group: 'block',
      content: 'listItem+',
      attrs: { start: { default: 1 } },
      parseDOM: [{ tag: 'ol' }],
      toDOM: () => ['ol', 0] as const,
    },
    listItem: {
      content: 'paragraph block*',
      parseDOM: [{ tag: 'li' }],
      toDOM: () => ['li', 0] as const,
    },
    blockquote: {
      group: 'block',
      content: 'block+',
      parseDOM: [{ tag: 'blockquote' }],
      toDOM: () => ['blockquote', 0] as const,
    },
    horizontalRule: {
      group: 'block',
      parseDOM: [{ tag: 'hr' }],
      toDOM: () => ['hr'] as const,
    },
  },
  marks: {
    bold: {
      parseDOM: [{ tag: 'strong' }],
      toDOM: () => ['strong', 0] as const,
    },
    italic: {
      parseDOM: [{ tag: 'em' }],
      toDOM: () => ['em', 0] as const,
    },
    link: {
      attrs: { href: {} },
      parseDOM: [{ tag: 'a', getAttrs: (dom) => ({ href: (dom as HTMLElement).getAttribute('href') }) }],
      toDOM: (node) => ['a', { href: node.attrs.href }, 0] as const,
    },
  },
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd apps/app && npx vitest run src/app/\\(app\\)/\\[orgId\\]/policies/\\[policyId\\]/editor/lib/__tests__/build-position-map.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement buildPositionMap**

```typescript
// build-position-map.ts
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { PositionMap } from './suggestion-types';

/**
 * Traverse a ProseMirror document, generate markdown, and build a map
 * from markdown line numbers (1-indexed) to ProseMirror positions.
 *
 * The markdown output must match `convertContentToMarkdown` in PolicyDetails.tsx
 * so that diffs against AI-proposed markdown align correctly.
 */
export function buildPositionMap(doc: ProseMirrorNode): PositionMap {
  const lineToPos = new Map<number, { from: number; to: number }>();
  const markdownLines: string[] = [];
  let currentLine = 1;

  doc.forEach((node, offset) => {
    const nodeFrom = offset + 1; // +1 because doc node itself takes position 0
    const nodeTo = nodeFrom + node.nodeSize - 2; // -2 for open/close tokens of block

    const lines = nodeToMarkdownLines(node);

    for (const line of lines) {
      markdownLines.push(line);
      if (line.trim()) {
        lineToPos.set(currentLine, { from: nodeFrom, to: nodeTo });
      }
      currentLine++;
    }
  });

  // Remove trailing empty lines
  while (markdownLines.length > 0 && markdownLines[markdownLines.length - 1] === '') {
    markdownLines.pop();
  }

  return {
    lineToPos,
    markdown: markdownLines.join('\n').trim(),
  };
}

function extractText(node: ProseMirrorNode): string {
  let text = '';
  node.forEach((child) => {
    if (child.isText) {
      text += child.text ?? '';
    } else {
      text += extractText(child);
    }
  });
  return text;
}

function nodeToMarkdownLines(node: ProseMirrorNode): string[] {
  switch (node.type.name) {
    case 'heading': {
      const level = (node.attrs.level as number) || 1;
      const text = extractText(node);
      return ['', '#'.repeat(level) + ' ' + text, ''];
    }
    case 'paragraph': {
      const text = extractText(node);
      return [text, ''];
    }
    case 'bulletList':
    case 'orderedList': {
      const lines: string[] = [''];
      node.forEach((listItem) => {
        const text = extractText(listItem);
        lines.push('- ' + text);
      });
      lines.push('');
      return lines;
    }
    case 'blockquote': {
      const lines: string[] = [''];
      node.forEach((child) => {
        const text = extractText(child);
        lines.push('> ' + text);
      });
      lines.push('');
      return lines;
    }
    case 'horizontalRule':
      return ['', '---', ''];
    default: {
      const text = extractText(node);
      return text ? [text, ''] : [''];
    }
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/app && npx vitest run src/app/\\(app\\)/\\[orgId\\]/policies/\\[policyId\\]/editor/lib/__tests__/build-position-map.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/lib/build-position-map.ts \
       apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/lib/__tests__/build-position-map.test.ts \
       apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/lib/test-helpers/editor-schema.ts
git commit -m "feat(suggestions): add position map builder with tests"
```

---

### Task 3: Compute suggestion ranges from diff

Takes two markdown strings and a position map, produces `SuggestionRange[]` with word-level diff segments.

**Files:**
- Create: `apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/lib/compute-suggestion-ranges.ts`
- Create: `apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/lib/__tests__/compute-suggestion-ranges.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// compute-suggestion-ranges.test.ts
import { describe, expect, it } from 'vitest';
import { computeSuggestionRanges } from '../compute-suggestion-ranges';
import type { PositionMap } from '../suggestion-types';

function makePositionMap(lines: string[]): PositionMap {
  const lineToPos = new Map<number, { from: number; to: number }>();
  let pos = 1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim()) {
      lineToPos.set(i + 1, { from: pos, to: pos + line.length });
    }
    pos += line.length + 1; // +1 for newline
  }
  return { lineToPos, markdown: lines.join('\n') };
}

describe('computeSuggestionRanges', () => {
  it('returns empty array for identical content', () => {
    const markdown = 'Hello world';
    const posMap = makePositionMap(['Hello world']);

    const ranges = computeSuggestionRanges(posMap, markdown);

    expect(ranges).toEqual([]);
  });

  it('detects a modification with word-level segments', () => {
    const currentLines = ['The quick brown fox'];
    const posMap = makePositionMap(currentLines);
    const proposed = 'The slow brown fox';

    const ranges = computeSuggestionRanges(posMap, proposed);

    expect(ranges).toHaveLength(1);
    expect(ranges[0]!.type).toBe('modify');
    expect(ranges[0]!.decision).toBe('pending');
    // Should have segments showing "quick" → "slow"
    expect(ranges[0]!.segments.some((s) => s.type === 'delete' && s.text.includes('quick'))).toBe(true);
    expect(ranges[0]!.segments.some((s) => s.type === 'insert' && s.text.includes('slow'))).toBe(true);
  });

  it('detects an insertion', () => {
    const currentLines = ['Line one', '', 'Line three'];
    const posMap = makePositionMap(currentLines);
    const proposed = 'Line one\n\nNew line two\n\nLine three';

    const ranges = computeSuggestionRanges(posMap, proposed);

    expect(ranges.some((r) => r.type === 'insert')).toBe(true);
  });

  it('detects a deletion', () => {
    const currentLines = ['Line one', '', 'Line two', '', 'Line three'];
    const posMap = makePositionMap(currentLines);
    const proposed = 'Line one\n\nLine three';

    const ranges = computeSuggestionRanges(posMap, proposed);

    expect(ranges.some((r) => r.type === 'delete')).toBe(true);
  });

  it('assigns unique IDs to each range', () => {
    const currentLines = ['Line one', '', 'Line two'];
    const posMap = makePositionMap(currentLines);
    const proposed = 'Changed one\n\nChanged two';

    const ranges = computeSuggestionRanges(posMap, proposed);

    const ids = ranges.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('skips hunks with only whitespace changes', () => {
    const currentLines = ['Hello  world'];
    const posMap = makePositionMap(currentLines);
    const proposed = 'Hello world';

    const ranges = computeSuggestionRanges(posMap, proposed);

    expect(ranges).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/app && npx vitest run src/app/\\(app\\)/\\[orgId\\]/policies/\\[policyId\\]/editor/lib/__tests__/compute-suggestion-ranges.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement computeSuggestionRanges**

```typescript
// compute-suggestion-ranges.ts
import { structuredPatch } from 'diff';
import { diffWords } from 'diff';
import type { DiffSegment, PositionMap, SuggestionRange } from './suggestion-types';

/**
 * Diff current markdown (from position map) against proposed markdown.
 * Maps each diff hunk to ProseMirror positions using the position map.
 * Returns SuggestionRange[] with word-level diff segments.
 */
export function computeSuggestionRanges(
  positionMap: PositionMap,
  proposedMarkdown: string,
): SuggestionRange[] {
  const { markdown: currentMarkdown, lineToPos } = positionMap;

  if (normalizeWhitespace(currentMarkdown) === normalizeWhitespace(proposedMarkdown)) {
    return [];
  }

  const patch = structuredPatch('policy', 'policy', currentMarkdown, proposedMarkdown, '', '', {
    context: 0,
  });

  const ranges: SuggestionRange[] = [];

  for (const hunk of patch.hunks) {
    const oldLines: string[] = [];
    const newLines: string[] = [];

    for (const line of hunk.lines) {
      if (line.startsWith('-')) {
        oldLines.push(line.slice(1));
      } else if (line.startsWith('+')) {
        newLines.push(line.slice(1));
      } else {
        // Context line (shouldn't appear with context: 0, but handle gracefully)
        oldLines.push(line.startsWith(' ') ? line.slice(1) : line);
        newLines.push(line.startsWith(' ') ? line.slice(1) : line);
      }
    }

    const oldText = oldLines.join('\n');
    const newText = newLines.join('\n');

    // Skip whitespace-only changes
    if (normalizeWhitespace(oldText) === normalizeWhitespace(newText)) {
      continue;
    }

    // Find ProseMirror positions for this hunk
    const positions = resolveHunkPositions(hunk.oldStart, hunk.oldLines, lineToPos);
    if (!positions) continue;

    const rangeType = classifyHunk(oldLines, newLines);
    const segments = rangeType === 'modify' ? computeWordDiff(oldText, newText) : [];

    ranges.push({
      id: `suggestion-${hunk.oldStart}-${hunk.newStart}`,
      type: rangeType,
      from: positions.from,
      to: positions.to,
      segments,
      proposedText: newText,
      originalText: oldText,
      decision: 'pending',
    });
  }

  return ranges;
}

function classifyHunk(oldLines: string[], newLines: string[]): SuggestionRange['type'] {
  const hasOld = oldLines.some((l) => l.trim().length > 0);
  const hasNew = newLines.some((l) => l.trim().length > 0);

  if (hasOld && hasNew) return 'modify';
  if (!hasOld && hasNew) return 'insert';
  return 'delete';
}

function resolveHunkPositions(
  oldStart: number,
  oldLines: number,
  lineToPos: Map<number, { from: number; to: number }>,
): { from: number; to: number } | null {
  // For insertions (oldLines === 0), anchor to the line before the insertion point
  if (oldLines === 0) {
    const anchor = lineToPos.get(oldStart) ?? lineToPos.get(oldStart - 1);
    if (!anchor) return findNearestPosition(oldStart, lineToPos);
    return anchor;
  }

  // Find the first and last mapped lines in the hunk range
  let from: number | null = null;
  let to: number | null = null;

  for (let line = oldStart; line < oldStart + oldLines; line++) {
    const pos = lineToPos.get(line);
    if (pos) {
      if (from === null || pos.from < from) from = pos.from;
      if (to === null || pos.to > to) to = pos.to;
    }
  }

  if (from === null || to === null) {
    return findNearestPosition(oldStart, lineToPos);
  }

  return { from, to };
}

function findNearestPosition(
  targetLine: number,
  lineToPos: Map<number, { from: number; to: number }>,
): { from: number; to: number } | null {
  let closest: { from: number; to: number } | null = null;
  let closestDist = Infinity;

  for (const [line, pos] of lineToPos) {
    const dist = Math.abs(line - targetLine);
    if (dist < closestDist) {
      closestDist = dist;
      closest = pos;
    }
  }

  return closest;
}

function computeWordDiff(oldText: string, newText: string): DiffSegment[] {
  const changes = diffWords(oldText, newText);
  return changes.map((change) => ({
    text: change.value,
    type: change.added ? 'insert' : change.removed ? 'delete' : 'unchanged',
  }));
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/app && npx vitest run src/app/\\(app\\)/\\[orgId\\]/policies/\\[policyId\\]/editor/lib/__tests__/compute-suggestion-ranges.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/lib/compute-suggestion-ranges.ts \
       apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/lib/__tests__/compute-suggestion-ranges.test.ts
git commit -m "feat(suggestions): add range computation with word-level diffing"
```

---

## Chunk 2: TipTap Extension + Editor Plumbing

### Task 4: Create the SuggestionsExtension

A ProseMirror plugin that reads `SuggestionRange[]` and renders inline decorations + gutter widgets.

**Files:**
- Create: `packages/ui/src/components/editor/extensions/suggestions.ts`

- [ ] **Step 1: Write the extension**

```typescript
// suggestions.ts
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * SuggestionRange interface — mirrors the type in suggestion-types.ts.
 * Defined here so the extension has zero app-level imports.
 * The useSuggestions hook is responsible for mapping between the two.
 */
export interface SuggestionRange {
  id: string;
  type: 'modify' | 'insert' | 'delete';
  from: number;
  to: number;
  segments: Array<{ text: string; type: 'unchanged' | 'insert' | 'delete' }>;
  proposedText: string;
  originalText: string;
  decision: 'pending' | 'accepted' | 'rejected';
}

export interface SuggestionsPluginState {
  ranges: SuggestionRange[];
  decorations: DecorationSet;
}

export const suggestionsPluginKey = new PluginKey<SuggestionsPluginState>('suggestions');

export interface SuggestionsExtensionOptions {
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onFeedback?: (id: string) => void;
}

/**
 * Dispatch this meta on any transaction to update the suggestion ranges.
 * Usage: editor.view.dispatch(editor.state.tr.setMeta(suggestionsPluginKey, newRanges))
 */
export const SuggestionsExtension = Extension.create<SuggestionsExtensionOptions>({
  name: 'suggestions',

  addOptions() {
    return {
      onAccept: undefined,
      onReject: undefined,
      onFeedback: undefined,
    };
  },

  addProseMirrorPlugins() {
    const { onAccept, onReject, onFeedback } = this.options;

    return [
      new Plugin<SuggestionsPluginState>({
        key: suggestionsPluginKey,

        state: {
          init(): SuggestionsPluginState {
            return { ranges: [], decorations: DecorationSet.empty };
          },

          apply(tr, state): SuggestionsPluginState {
            const meta = tr.getMeta(suggestionsPluginKey) as SuggestionRange[] | undefined;

            if (meta !== undefined) {
              // New ranges dispatched — rebuild decorations
              const pendingRanges = meta.filter((r) => r.decision === 'pending');
              const decorations = buildDecorations(tr.doc, pendingRanges, { onAccept, onReject, onFeedback });
              return { ranges: meta, decorations };
            }

            // Map existing decorations through document changes
            if (tr.docChanged) {
              return {
                ranges: state.ranges,
                decorations: state.decorations.map(tr.mapping, tr.doc),
              };
            }

            return state;
          },
        },

        props: {
          decorations(state) {
            return suggestionsPluginKey.getState(state)?.decorations ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});

function buildDecorations(
  doc: Parameters<typeof DecorationSet.create>[0],
  ranges: SuggestionRange[],
  actions: {
    onAccept?: (id: string) => void;
    onReject?: (id: string) => void;
    onFeedback?: (id: string) => void;
  },
): DecorationSet {
  const decorations: Decoration[] = [];

  for (const range of ranges) {
    // Clamp positions to valid doc range
    const maxPos = doc.content.size;
    const from = Math.max(0, Math.min(range.from, maxPos));
    const to = Math.max(from, Math.min(range.to, maxPos));

    // Resolve node boundaries safely for Decoration.node
    // ProseMirror requires exact node boundary positions.
    const resolvedFrom = doc.resolve(from);
    const blockStart = resolvedFrom.before(resolvedFrom.depth);
    const resolvedTo = doc.resolve(Math.min(to, maxPos));
    const blockEnd = resolvedTo.after(resolvedTo.depth);

    switch (range.type) {
      case 'modify': {
        // Node decoration on the parent block: green left border
        decorations.push(
          Decoration.node(blockStart, blockEnd, {
            class: 'suggestion-modified',
          }),
        );

        // Inline decorations for word-level segments
        let segPos = from;
        for (const segment of range.segments) {
          const segEnd = Math.min(segPos + segment.text.length, maxPos);

          if (segment.type === 'delete') {
            if (segPos < segEnd) {
              decorations.push(
                Decoration.inline(segPos, segEnd, { class: 'suggestion-delete' }),
              );
            }
          } else if (segment.type === 'insert') {
            // Widget decoration to inject new text
            decorations.push(
              Decoration.widget(segPos, createInsertWidget(segment.text), { side: 1 }),
            );
            // Don't advance segPos — inserts are zero-width in the original doc
            continue;
          }

          segPos = segEnd;
        }
        break;
      }

      case 'insert': {
        // Widget at insertion point showing the proposed content
        decorations.push(
          Decoration.widget(from, createNewSectionWidget(range.proposedText), { side: 1 }),
        );
        break;
      }

      case 'delete': {
        // Node decoration on deleted range
        if (from < to) {
          decorations.push(
            Decoration.node(blockStart, blockEnd, {
              class: 'suggestion-deleted-section',
            }),
          );
        }
        break;
      }
    }

    // Gutter widget for accept/reject/feedback
    decorations.push(
      Decoration.widget(from, createGutterWidget(range.id, actions), { side: -1 }),
    );
  }

  return DecorationSet.create(doc, decorations);
}

function createInsertWidget(text: string): (view: EditorView) => HTMLElement {
  return (_view: EditorView) => {
    const span = document.createElement('span');
    span.className = 'suggestion-insert';
    span.textContent = text;
    return span;
  };
}

function createNewSectionWidget(text: string): (view: EditorView) => HTMLElement {
  return (_view: EditorView) => {
    const div = document.createElement('div');
    div.className = 'suggestion-new-section';
    div.textContent = text;
    return div;
  };
}

function createGutterWidget(
  rangeId: string,
  actions: {
    onAccept?: (id: string) => void;
    onReject?: (id: string) => void;
    onFeedback?: (id: string) => void;
  },
): (view: EditorView) => HTMLElement {
  return (_view: EditorView) => {
    const container = document.createElement('div');
    container.className = 'suggestion-gutter';

    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'suggestion-gutter-accept';
    acceptBtn.title = 'Accept change';
    acceptBtn.textContent = '\u2713'; // ✓
    acceptBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      actions.onAccept?.(rangeId);
    });

    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'suggestion-gutter-reject';
    rejectBtn.title = 'Reject change';
    rejectBtn.textContent = '\u2715'; // ✕
    rejectBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      actions.onReject?.(rangeId);
    });

    const feedbackBtn = document.createElement('button');
    feedbackBtn.className = 'suggestion-gutter-feedback';
    feedbackBtn.title = 'Give feedback';
    feedbackBtn.textContent = '\u270E'; // ✎
    feedbackBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      actions.onFeedback?.(rangeId);
    });

    container.append(acceptBtn, rejectBtn, feedbackBtn);
    return container;
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/ui/src/components/editor/extensions/suggestions.ts
git commit -m "feat(suggestions): add TipTap extension with ProseMirror decorations"
```

---

### Task 5: Modify Editor to support external extensions and editor ref

**Files:**
- Modify: `packages/ui/src/components/editor/index.tsx`

- [ ] **Step 1: Add `onEditorReady` and `additionalExtensions` props to the Editor**

Add to `EditorProps`:
```typescript
additionalExtensions?: import('@tiptap/core').Extension[];
onEditorReady?: (editor: import('@tiptap/react').Editor) => void;
```

In the `useEditor` call, merge `additionalExtensions` into the extensions array:
```typescript
extensions: [
  ...defaultExtensions({ placeholder, openLinksOnClick: readOnly }),
  ...(additionalExtensions ?? []),
],
```

After `useEditor`, add effect to call `onEditorReady`:
```typescript
useEffect(() => {
  if (editor && onEditorReady) {
    onEditorReady(editor);
  }
}, [editor, onEditorReady]);
```

Also re-export the `Editor as TipTapEditor` type from `@tiptap/react` for consumers:
```typescript
export type { Editor as TipTapEditor } from '@tiptap/react';
```

- [ ] **Step 2: Run typecheck**

Run: `npx turbo run typecheck --filter=@comp/ui`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/components/editor/index.tsx
git commit -m "feat(editor): add onEditorReady callback and additionalExtensions prop"
```

---

### Task 6: Thread new props through PolicyEditor chain

**Files:**
- Modify: `apps/app/src/components/editor/advanced-editor.tsx`
- Modify: `apps/app/src/components/editor/policy-editor.tsx`

- [ ] **Step 1: Update AdvancedEditor**

Add `additionalExtensions` and `onEditorReady` to `AdvancedEditorProps`, pass them through to `<Editor>`.

```typescript
import type { Extension } from '@tiptap/core';
import type { Editor as TipTapEditor } from '@tiptap/react';

interface AdvancedEditorProps {
  // ... existing props ...
  additionalExtensions?: Extension[];
  onEditorReady?: (editor: TipTapEditor) => void;
}
```

- [ ] **Step 2: Update PolicyEditor**

Add `additionalExtensions` and `onEditorReady` to `PolicyEditorProps`, pass them through to `<AdvancedEditor>`.

```typescript
import type { Extension } from '@tiptap/core';
import type { Editor as TipTapEditor } from '@tiptap/react';

interface PolicyEditorProps {
  // ... existing props ...
  additionalExtensions?: Extension[];
  onEditorReady?: (editor: TipTapEditor) => void;
}
```

- [ ] **Step 3: Run typecheck**

Run: `npx turbo run typecheck --filter=@comp/app`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/app/src/components/editor/advanced-editor.tsx \
       apps/app/src/components/editor/policy-editor.tsx
git commit -m "feat(editor): thread extension and ref props through editor chain"
```

---

## Chunk 3: Hook, TopBar, Styles

### Task 7: Create useSuggestions hook

The core orchestration hook. Computes diffs, manages decisions, dispatches ProseMirror transactions.

**Files:**
- Create: `apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/hooks/use-suggestions.ts`

- [ ] **Step 1: Write the hook**

```typescript
// use-suggestions.ts
import type { Editor } from '@tiptap/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildPositionMap } from '../lib/build-position-map';
import { computeSuggestionRanges } from '../lib/compute-suggestion-ranges';
import type { SuggestionRange } from '../lib/suggestion-types';
import { suggestionsPluginKey } from '@comp/ui/editor';
import { markdownToTipTapJSON } from '../components/ai/markdown-utils';

interface UseSuggestionsOptions {
  editor: Editor | null;
  proposedMarkdown: string | null;
  onFeedback?: (rangeId: string, feedback: string) => void;
}

interface UseSuggestionsReturn {
  ranges: SuggestionRange[];
  activeCount: number;
  totalCount: number;
  accept: (id: string) => void;
  reject: (id: string) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  dismissAll: () => void;
  giveFeedback: (id: string, feedback: string) => void;
  isActive: boolean;
}

export function useSuggestions({
  editor,
  proposedMarkdown,
  onFeedback,
}: UseSuggestionsOptions): UseSuggestionsReturn {
  const [ranges, setRanges] = useState<SuggestionRange[]>([]);
  const rangesRef = useRef<SuggestionRange[]>([]);
  const proposedMarkdownRef = useRef<string | null>(null);

  // Keep refs in sync
  useEffect(() => {
    rangesRef.current = ranges;
  }, [ranges]);
  useEffect(() => {
    proposedMarkdownRef.current = proposedMarkdown;
  }, [proposedMarkdown]);

  /**
   * Recompute ranges from the current editor state.
   * Preserves existing decisions by matching on content identity.
   */
  const recomputeRanges = useCallback(
    (prevRanges: SuggestionRange[]) => {
      if (!editor || !proposedMarkdownRef.current) {
        return [];
      }

      const positionMap = buildPositionMap(editor.state.doc);
      const freshRanges = computeSuggestionRanges(positionMap, proposedMarkdownRef.current);

      // Carry over decisions from previous ranges by matching originalText + proposedText
      const decisionMap = new Map<string, SuggestionRange['decision']>();
      for (const r of prevRanges) {
        if (r.decision !== 'pending') {
          decisionMap.set(`${r.originalText}::${r.proposedText}`, r.decision);
        }
      }

      return freshRanges.map((r) => {
        const key = `${r.originalText}::${r.proposedText}`;
        const prevDecision = decisionMap.get(key);
        return prevDecision ? { ...r, decision: prevDecision } : r;
      });
    },
    [editor],
  );

  // Compute ranges when proposed markdown changes
  useEffect(() => {
    if (!editor || !proposedMarkdown) {
      setRanges([]);
      return;
    }

    const positionMap = buildPositionMap(editor.state.doc);
    const newRanges = computeSuggestionRanges(positionMap, proposedMarkdown);
    setRanges(newRanges);
  }, [editor, proposedMarkdown]);

  // Sync ranges to ProseMirror plugin state (decorations)
  useEffect(() => {
    if (!editor) return;

    const tr = editor.state.tr.setMeta(suggestionsPluginKey, ranges);
    editor.view.dispatch(tr);
  }, [editor, ranges]);

  /**
   * Parse proposed markdown into ProseMirror nodes and replace the target range.
   * Uses markdownToTipTapJSON to create proper block nodes (headings, lists, etc.)
   * instead of flat text nodes.
   */
  const applyRangeToDoc = useCallback(
    (range: SuggestionRange) => {
      if (!editor) return;

      const { tr } = editor.state;

      if (range.type === 'delete') {
        tr.delete(range.from, range.to);
      } else {
        // Parse proposed text into TipTap JSON, then into ProseMirror nodes
        const jsonNodes = markdownToTipTapJSON(range.proposedText);
        const pmNodes = jsonNodes.map((json) =>
          editor.state.schema.nodeFromJSON(json),
        );

        // For modifications: replace the block(s) at [from, to]
        // For insertions: insert after the anchor position
        if (pmNodes.length > 0) {
          tr.replaceWith(range.from, range.to, pmNodes);
        }
      }

      editor.view.dispatch(tr);
    },
    [editor],
  );

  const accept = useCallback(
    (id: string) => {
      if (!editor) return;

      const range = rangesRef.current.find((r) => r.id === id);
      if (!range || range.decision !== 'pending') return;

      applyRangeToDoc(range);

      // After document mutation, recompute ranges with fresh positions.
      // Mark the accepted range, then rebuild from the updated doc.
      const updatedRanges = rangesRef.current.map((r) =>
        r.id === id ? { ...r, decision: 'accepted' as const } : r,
      );
      const recomputed = recomputeRanges(updatedRanges);
      setRanges(recomputed);
    },
    [editor, applyRangeToDoc, recomputeRanges],
  );

  const reject = useCallback(
    (id: string) => {
      setRanges((prev) =>
        prev.map((r) => (r.id === id ? { ...r, decision: 'rejected' } : r)),
      );
    },
    [],
  );

  const acceptAll = useCallback(() => {
    if (!editor) return;

    // Accept all pending ranges in reverse document order
    // to avoid position invalidation within the same transaction.
    const pendingRanges = rangesRef.current
      .filter((r) => r.decision === 'pending')
      .sort((a, b) => b.from - a.from);

    const { tr } = editor.state;

    for (const range of pendingRanges) {
      if (range.type === 'delete') {
        tr.delete(range.from, range.to);
      } else {
        const jsonNodes = markdownToTipTapJSON(range.proposedText);
        const pmNodes = jsonNodes.map((json) =>
          editor.state.schema.nodeFromJSON(json),
        );
        if (pmNodes.length > 0) {
          tr.replaceWith(range.from, range.to, pmNodes);
        }
      }
    }

    editor.view.dispatch(tr);
    setRanges((prev) =>
      prev.map((r) => (r.decision === 'pending' ? { ...r, decision: 'accepted' } : r)),
    );
  }, [editor]);

  const rejectAll = useCallback(() => {
    setRanges((prev) =>
      prev.map((r) => (r.decision === 'pending' ? { ...r, decision: 'rejected' } : r)),
    );
  }, []);

  const dismissAll = useCallback(() => {
    setRanges([]);
  }, []);

  const giveFeedback = useCallback(
    (id: string, feedback: string) => {
      onFeedback?.(id, feedback);
    },
    [onFeedback],
  );

  const activeCount = useMemo(
    () => ranges.filter((r) => r.decision === 'pending').length,
    [ranges],
  );

  const totalCount = ranges.length;

  return {
    ranges,
    activeCount,
    totalCount,
    accept,
    reject,
    acceptAll,
    rejectAll,
    dismissAll,
    giveFeedback,
    isActive: ranges.length > 0 && ranges.some((r) => r.decision === 'pending'),
  };
}
```

- [ ] **Step 2: Export the extension from @comp/ui editor barrel**

In `packages/ui/src/components/editor/index.tsx`, add these re-exports at the bottom:
```typescript
export { SuggestionsExtension, suggestionsPluginKey } from './extensions/suggestions';
export type { SuggestionRange as EditorSuggestionRange } from './extensions/suggestions';
```

This way consumers import from `@comp/ui/editor` (the existing package.json export), not a deep path.

- [ ] **Step 3: Run typecheck**

Run: `npx turbo run typecheck --filter=@comp/app`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/hooks/use-suggestions.ts \
       packages/ui/src/components/editor/index.tsx
git commit -m "feat(suggestions): add useSuggestions hook for managing inline suggestions"
```

---

### Task 8: Create SuggestionsTopBar component

**Files:**
- Create: `apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/components/ai/suggestions-top-bar.tsx`

- [ ] **Step 1: Write the component**

```tsx
// suggestions-top-bar.tsx
import { Button } from '@trycompai/design-system';
import { Checkmark, Close } from '@trycompai/design-system/icons';

interface SuggestionsTopBarProps {
  activeCount: number;
  totalCount: number;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onDismiss: () => void;
}

export function SuggestionsTopBar({
  activeCount,
  totalCount,
  onAcceptAll,
  onRejectAll,
  onDismiss,
}: SuggestionsTopBarProps) {
  const resolvedCount = totalCount - activeCount;

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-foreground">
          {activeCount} {activeCount === 1 ? 'change' : 'changes'}
        </span>
        {resolvedCount > 0 && (
          <span className="text-muted-foreground">
            ({resolvedCount} resolved)
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onAcceptAll} disabled={activeCount === 0}>
          <Checkmark size={14} />
          Accept all
        </Button>
        <Button variant="ghost" size="sm" onClick={onRejectAll} disabled={activeCount === 0}>
          <Close size={14} />
          Reject all
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onDismiss} title="Dismiss suggestions">
          <Close size={14} />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/components/ai/suggestions-top-bar.tsx
git commit -m "feat(suggestions): add SuggestionsTopBar summary component"
```

---

### Task 9: Add suggestion CSS styles

**Files:**
- Modify: `apps/app/src/styles/editor.css`

- [ ] **Step 1: Append suggestion decoration styles**

Add these styles at the end of `editor.css`:

```css
/* ── Inline suggestion decorations ── */

.suggestion-insert {
  background: hsl(var(--primary) / 0.15);
  border-radius: 2px;
  padding: 1px 2px;
}

.suggestion-delete {
  background: hsl(var(--destructive) / 0.15);
  text-decoration: line-through;
  opacity: 0.6;
  border-radius: 2px;
  padding: 1px 2px;
}

.suggestion-modified {
  border-left: 3px solid hsl(var(--primary) / 0.4);
  padding-left: 12px;
}

.suggestion-new-section {
  background: hsl(var(--primary) / 0.05);
  border-left: 3px solid hsl(var(--primary) / 0.4);
  padding: 8px 12px;
  border-radius: 0 4px 4px 0;
  margin: 4px 0;
  white-space: pre-wrap;
}

.suggestion-deleted-section {
  border-left: 3px solid hsl(var(--destructive) / 0.4);
  opacity: 0.5;
  text-decoration: line-through;
}

/* Gutter icons — positioned in the left margin */
.suggestion-gutter {
  position: absolute;
  left: -40px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 5;
}

.suggestion-gutter button {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: background-color 0.15s;
}

.suggestion-gutter-accept {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.suggestion-gutter-accept:hover {
  background: hsl(var(--primary) / 0.2);
}

.suggestion-gutter-reject {
  background: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
}

.suggestion-gutter-reject:hover {
  background: hsl(var(--destructive) / 0.2);
}

.suggestion-gutter-feedback {
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

.suggestion-gutter-feedback:hover {
  background: hsl(var(--muted-foreground) / 0.15);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/app/src/styles/editor.css
git commit -m "feat(suggestions): add inline suggestion decoration styles"
```

---

## Chunk 4: Integration + Cleanup

### Task 10: Integrate inline suggestions in PolicyDetails

This is the main integration task. Replace the `ProposedChangesCard` with the inline suggestion system.

**Files:**
- Modify: `apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/components/PolicyDetails.tsx`

- [ ] **Step 1: Add imports**

Add to the top of PolicyDetails.tsx:
```typescript
import { useSuggestions } from '../hooks/use-suggestions';
import { SuggestionsTopBar } from './ai/suggestions-top-bar';
import { SuggestionsExtension } from '@comp/ui/editor';
import type { Editor as TipTapEditor } from '@tiptap/react';
```

Note: `SuggestionsExtension` is imported from `@comp/ui/editor` (the barrel re-export added in Task 7 Step 2), NOT from a deep path.

Remove:
```typescript
import { ProposedChangesCard } from './ai/proposed-changes-card';
```

- [ ] **Step 2: Add editor ref and suggestion extension to PolicyContentManager**

Inside `PolicyContentManager`, before the `useChat` call, add:

```typescript
const [editorInstance, setEditorInstance] = useState<TipTapEditor | null>(null);

const suggestionsExtension = useMemo(
  () => SuggestionsExtension.configure({}),
  [],
);
```

- [ ] **Step 3: Wire up useSuggestions hook**

Replace the `diffPatch` / `displayPatch` / `frozenPatch` state with:

```typescript
const suggestions = useSuggestions({
  editor: editorInstance,
  proposedMarkdown: proposedPolicyMarkdown,
});
```

Remove these state variables and their effects:
- `feedbackHunkIndex`
- `frozenPatch`
- `feedbackSourceKey`
- `isFeedbackInFlight`
- `feedbackStartedRef`
- `displayPatch`
- `diffPatch`
- The `useEffect` that clears feedback state

Keep `FEEDBACK_MARKER` and `handleHunkFeedback` but adapt them to use suggestion ranges instead of parsed diff hunks.

- [ ] **Step 4: Update the render**

Replace the `ProposedChangesCard` block:

```tsx
{/* Before — remove this: */}
{displayPatch && (activeProposal || isFeedbackInFlight) && (
  <ProposedChangesCard ... />
)}

{/* After — add this: */}
{suggestions.isActive && (
  <SuggestionsTopBar
    activeCount={suggestions.activeCount}
    totalCount={suggestions.totalCount}
    onAcceptAll={suggestions.acceptAll}
    onRejectAll={suggestions.rejectAll}
    onDismiss={() => {
      suggestions.dismissAll();
      if (activeProposal) setDismissedProposalKey(activeProposal.key);
    }}
  />
)}
```

- [ ] **Step 5: Pass editor props to PolicyEditorWrapper**

Add `onEditorReady` and `additionalExtensions` props to `PolicyEditorWrapper`:

```tsx
<PolicyEditorWrapper
  key={`${editorKey}-${viewingVersion}`}
  // ... existing props ...
  onEditorReady={setEditorInstance}
  additionalExtensions={[suggestionsExtension]}
/>
```

Update `PolicyEditorWrapper` to accept and forward these props:

```typescript
function PolicyEditorWrapper({
  // ... existing props ...
  onEditorReady,
  additionalExtensions,
}: {
  // ... existing types ...
  onEditorReady?: (editor: TipTapEditor) => void;
  additionalExtensions?: import('@tiptap/core').Extension[];
}) {
  // ...
  return (
    <Section>
      <Stack gap="sm">
        {/* ... status banner ... */}
        <PolicyEditor
          content={normalizedContent}
          onSave={savePolicy}
          readOnly={isReadOnly}
          onEditorReady={onEditorReady}
          additionalExtensions={additionalExtensions}
        />
      </Stack>
    </Section>
  );
}
```

- [ ] **Step 6: Update applyProposedChanges and applySelectedChanges**

`applyProposedChanges` can be replaced by `suggestions.acceptAll()`.
`applySelectedChanges` is no longer needed (individual accepts happen via gutter icons).

Remove both functions and adapt the dismiss/apply flow to use `suggestions.acceptAll()`.

- [ ] **Step 7: Simplify handleHunkFeedback**

The `useSuggestions` hook exposes `giveFeedback(id, feedback)` which calls the `onFeedback` callback. Wire it up in `PolicyContentManager`:

```typescript
const suggestions = useSuggestions({
  editor: editorInstance,
  proposedMarkdown: proposedPolicyMarkdown,
  onFeedback: (rangeId, feedback) => {
    const range = suggestions.ranges.find((r) => r.id === rangeId);
    if (!range) return;

    sendMessage({
      text: `For the section that says:\n"""\n${range.proposedText}\n"""\n\nFeedback: ${feedback}\n\nApply this feedback ONLY to the section above. Do not change any other sections.\n${FEEDBACK_MARKER}`,
    });
  },
});
```

Remove the old `handleHunkFeedback` function, `feedbackHunkIndex`, `frozenPatch`, `feedbackSourceKey` state, and their effects.

- [ ] **Step 8: Update PolicyAiAssistant hasActiveProposal usage**

In `PolicyAiAssistant`, the `hasActiveProposal` prop was used to show a "↓ View changes below" hint. With inline suggestions, this hint is no longer needed since changes are visible in-place. Either remove the prop or update the hint text to say "Changes highlighted in editor".

- [ ] **Step 9: Run typecheck**

Run: `npx turbo run typecheck --filter=@comp/app`
Expected: PASS

- [ ] **Step 10: Run existing tests**

Run: `cd apps/app && npx vitest run`
Expected: PASS (no test should break since we're replacing UI, not logic)

- [ ] **Step 11: Commit**

```bash
git add apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/components/PolicyDetails.tsx \
       apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/components/ai/policy-ai-assistant.tsx
git commit -m "feat(suggestions): integrate inline suggestions in PolicyDetails"
```

---

### Task 11: Remove ProposedChangesCard

**Files:**
- Delete: `apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/components/ai/proposed-changes-card.tsx`

- [ ] **Step 1: Delete the file**

```bash
rm apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/components/ai/proposed-changes-card.tsx
```

- [ ] **Step 2: Remove any remaining imports**

Search for any remaining references to `proposed-changes-card` or `ProposedChangesCard` and remove them.

- [ ] **Step 3: Clean up unused utilities**

Check if `createGitPatch`, `applySelectedHunks`, and `parseDiff` imports in PolicyDetails.tsx are still needed. If not, remove them.

The `convertContentToMarkdown` function is still used by `useSuggestions` (via `buildPositionMap`), but the old version in PolicyDetails.tsx can be removed if `buildPositionMap` replaces its usage. Update the `currentPolicyMarkdown` memo to use `buildPositionMap` instead:

```typescript
// Before:
const currentPolicyMarkdown = useMemo(
  () => convertContentToMarkdown(currentContent),
  [currentContent],
);

// After: remove this memo — buildPositionMap in useSuggestions handles it
```

Also remove the `convertContentToMarkdown` function definition (lines ~1275-1307) if no longer referenced.

- [ ] **Step 4: Run typecheck**

Run: `npx turbo run typecheck --filter=@comp/app`
Expected: PASS

- [ ] **Step 5: Run tests**

Run: `cd apps/app && npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -u  # stages deletions
git commit -m "refactor(suggestions): remove ProposedChangesCard and unused diff utilities"
```

---

## Chunk 5: Testing + Polish

### Task 12: Write integration tests for useSuggestions

**Files:**
- Create: `apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/hooks/__tests__/use-suggestions.test.ts`

- [ ] **Step 1: Write hook tests**

```typescript
// use-suggestions.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSuggestions } from '../use-suggestions';

// Minimal mock of TipTap Editor for testing
// The hook reads editor.state.doc, editor.state.schema, editor.view.dispatch
function createMockEditor(textContent: string) {
  const mockSchema = {
    nodeFromJSON: vi.fn((json: object) => json),
  };
  const dispatchFn = vi.fn();
  const doc = {
    content: { size: textContent.length + 2 },
    forEach: vi.fn((callback: Function) => {
      // Simulate a single paragraph node
      callback(
        {
          type: { name: 'paragraph' },
          nodeSize: textContent.length + 2,
          attrs: {},
          forEach: (cb: Function) => {
            cb({ isText: true, text: textContent }, 0);
          },
        },
        0,
      );
    }),
  };
  return {
    state: {
      doc,
      schema: mockSchema,
      tr: {
        setMeta: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        replaceWith: vi.fn().mockReturnThis(),
        mapping: { map: vi.fn((pos: number) => pos) },
      },
    },
    view: { dispatch: dispatchFn },
  } as unknown as Parameters<typeof useSuggestions>[0]['editor'];
}

describe('useSuggestions', () => {
  it('returns empty ranges when proposedMarkdown is null', () => {
    const editor = createMockEditor('Hello world');
    const { result } = renderHook(() =>
      useSuggestions({ editor, proposedMarkdown: null }),
    );

    expect(result.current.ranges).toEqual([]);
    expect(result.current.isActive).toBe(false);
    expect(result.current.activeCount).toBe(0);
  });

  it('returns empty ranges for identical content', () => {
    const editor = createMockEditor('Hello world');
    const { result } = renderHook(() =>
      useSuggestions({ editor, proposedMarkdown: 'Hello world' }),
    );

    expect(result.current.ranges).toEqual([]);
    expect(result.current.isActive).toBe(false);
  });

  it('reject marks range as rejected without doc change', () => {
    const editor = createMockEditor('Hello world');
    const { result } = renderHook(() =>
      useSuggestions({ editor, proposedMarkdown: 'Goodbye world' }),
    );

    // Should have at least one range
    if (result.current.ranges.length > 0) {
      const rangeId = result.current.ranges[0]!.id;
      act(() => result.current.reject(rangeId));

      expect(result.current.ranges.find((r) => r.id === rangeId)?.decision).toBe('rejected');
    }
  });

  it('rejectAll marks all pending as rejected', () => {
    const editor = createMockEditor('Hello world');
    const { result } = renderHook(() =>
      useSuggestions({ editor, proposedMarkdown: 'Goodbye world' }),
    );

    act(() => result.current.rejectAll());

    expect(result.current.ranges.every((r) => r.decision === 'rejected')).toBe(true);
    expect(result.current.isActive).toBe(false);
  });

  it('dismissAll clears all ranges', () => {
    const editor = createMockEditor('Hello world');
    const { result } = renderHook(() =>
      useSuggestions({ editor, proposedMarkdown: 'Goodbye world' }),
    );

    act(() => result.current.dismissAll());

    expect(result.current.ranges).toEqual([]);
    expect(result.current.isActive).toBe(false);
    expect(result.current.totalCount).toBe(0);
  });

  it('giveFeedback calls onFeedback callback', () => {
    const editor = createMockEditor('Hello world');
    const onFeedback = vi.fn();
    const { result } = renderHook(() =>
      useSuggestions({ editor, proposedMarkdown: 'Goodbye world', onFeedback }),
    );

    act(() => result.current.giveFeedback('suggestion-1-1', 'make it friendlier'));

    expect(onFeedback).toHaveBeenCalledWith('suggestion-1-1', 'make it friendlier');
  });
});
```

Note: These tests use a minimal mock editor. The `accept` and `acceptAll` flows involve ProseMirror transactions and position recomputation which are harder to mock — those are best verified with integration tests that render a real TipTap editor. Focus unit tests on the decision state management and callback wiring.

- [ ] **Step 2: Run tests**

Run: `cd apps/app && npx vitest run src/app/\\(app\\)/\\[orgId\\]/policies/\\[policyId\\]/editor/hooks/__tests__/use-suggestions.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/hooks/__tests__/use-suggestions.test.ts
git commit -m "test(suggestions): add unit tests for useSuggestions hook"
```

---

### Task 13: Manual testing checklist

After all code is merged, manually verify:

- [ ] AI proposes changes → inline decorations appear in the editor
- [ ] Deleted text shows strikethrough with red highlight
- [ ] Inserted text shows green highlight
- [ ] Modified sections show word-level red/green diff
- [ ] Gutter icons (✓ ✕ ✎) appear next to each change
- [ ] Clicking ✓ applies the change to the real document
- [ ] Clicking ✕ removes the decoration without changing the document
- [ ] "Accept all" in top bar applies all pending changes
- [ ] "Reject all" in top bar removes all decorations
- [ ] Dismiss (X) in top bar clears everything
- [ ] Per-hunk feedback (✎) sends feedback message to AI
- [ ] AI regenerates → new decorations replace old ones
- [ ] Editor content is never mutated until user explicitly accepts
- [ ] Editor remains fully editable while suggestions are visible
- [ ] No visual glitches on dark mode

---

## Known Limitations

**List-item granularity:** The position map maps all items within a single bullet/ordered list to the same ProseMirror node range (the outer list node). If the AI modifies only one bullet point, accepting the change will replace the entire list node. This is acceptable for the initial implementation since policy documents are mostly paragraph-heavy. A follow-up enhancement could traverse list children to build per-item position entries.

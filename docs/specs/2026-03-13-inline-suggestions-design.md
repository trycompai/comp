# Inline Suggestion Mode — Design Spec

## Overview

Replace the separate "Suggested Changes" card with inline suggestions rendered directly in the TipTap policy editor. Users review AI-proposed changes in context, accepting or rejecting each section via gutter icons without leaving the document.

## Architecture

### Hybrid: Decorations + Shadow Document

```
┌─────────────────────────────────────────────┐
│  AI Chat (useChat)                          │
│  └─ proposePolicy tool → proposed markdown  │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  useSuggestions Hook                        │
│  ├─ Diffs proposed vs current markdown      │
│  ├─ Produces SuggestionRange[]              │
│  ├─ Tracks per-range decisions              │
│  └─ Exposes accept/reject/acceptAll/etc.    │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  SuggestionsPlugin (TipTap Extension)       │
│  ├─ ProseMirror Plugin with DecorationSet   │
│  ├─ Renders inline diffs as Decorations     │
│  ├─ Gutter icons via widget Decorations     │
│  └─ Top bar via React portal                │
└─────────────────────────────────────────────┘
```

**Key principle:** The editor's real document (`editor.state.doc`) is never mutated by the suggestion system. All visual changes are Decorations. Only when the user accepts a change does the real content update.

## Data Model

### SuggestionRange

Each diffed section maps to a `SuggestionRange`:

```typescript
interface SuggestionRange {
  id: string;                    // Unique identifier
  type: 'modify' | 'insert' | 'delete';
  // Position in the editor document (ProseMirror positions)
  from: number;
  to: number;
  // The proposed replacement content (ProseMirror Slice for inserts/modifications)
  proposedSlice?: Slice;
  // For modifications: word-level diff segments for inline rendering
  segments?: DiffSegment[];
  // User decision
  decision: 'pending' | 'accepted' | 'rejected';
}

interface DiffSegment {
  text: string;
  type: 'unchanged' | 'insert' | 'delete';
}
```

### Mapping from Diff to SuggestionRanges

1. `useSuggestions` receives `currentMarkdown` and `proposedMarkdown`
2. Runs `structuredPatch` (from `diff` library, already in use) to get hunks
3. For each hunk, maps line ranges back to ProseMirror document positions using `editor.state.doc.resolve()`
4. Within each hunk, runs `diffWords` to produce `DiffSegment[]` for word-level highlighting
5. Outputs a `SuggestionRange[]` array

**Position mapping strategy:**

The current markdown is generated from the TipTap doc via `convertContentToMarkdown()`. We build a line-number → ProseMirror position map during this conversion by tracking which doc node produced which output line. This map lets us translate diff hunk line ranges back to exact editor positions.

```typescript
interface PositionMap {
  // Maps markdown line number → { from, to } ProseMirror positions
  lineToPos: Map<number, { from: number; to: number }>;
}

function buildPositionMap(doc: ProseMirrorNode): PositionMap;
```

## Components

### 1. `useSuggestions` Hook

**Location:** `apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/hooks/use-suggestions.ts`

**Responsibilities:**
- Compute diff between current and proposed content
- Map diffs to ProseMirror positions
- Track decisions per range
- Provide actions: `accept(id)`, `reject(id)`, `acceptAll()`, `rejectAll()`, `dismissAll()`
- Handle per-hunk feedback (reuses existing `handleHunkFeedback` pattern)

**Interface:**

```typescript
interface UseSuggestionsOptions {
  editor: Editor | null;
  currentMarkdown: string;
  proposedMarkdown: string | null;
  onApply: (newMarkdown: string) => void;
}

interface UseSuggestionsReturn {
  ranges: SuggestionRange[];
  activeCount: number;          // Ranges still pending
  totalCount: number;           // Total ranges with real changes
  accept: (id: string) => void;
  reject: (id: string) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  dismissAll: () => void;
  giveFeedback: (id: string, feedback: string) => void;
  isActive: boolean;            // Any suggestions present
}
```

**Accept behavior:**
- `accept(id)` → Dispatches a ProseMirror transaction that replaces the range `[from, to]` with `proposedSlice`. Updates the position map for all subsequent ranges (positions shift after insertion/deletion).
- `acceptAll()` → Applies all pending ranges in reverse document order (bottom-up) to avoid position invalidation.
- `reject(id)` → Marks the range as rejected, removes its decorations. No document change.
- `rejectAll()` → Marks all as rejected, clears all decorations.

### 2. `SuggestionsExtension` (TipTap Extension)

**Location:** `packages/ui/src/components/editor/extensions/suggestions.ts`

**Type:** ProseMirror Plugin (via `Extension.create`)

This extension reads `SuggestionRange[]` from a plugin state key and renders:

#### Inline Decorations

- **Modifications:** Inline decorations on the existing text range. Each `DiffSegment` gets a decoration:
  - `unchanged` → no decoration
  - `delete` → `class: "suggestion-delete"` (red strikethrough, muted)
  - `insert` → Widget decoration that injects the new text with `class: "suggestion-insert"` (green highlight)
  - The parent block node gets a node decoration with `class: "suggestion-modified"` (green left border)

- **Insertions (new sections):** Node decorations on a zero-width widget at the insertion point. The widget renders the full proposed content with `class: "suggestion-new-section"` (green background, green left border).

- **Deletions:** Node decorations on the deleted range with `class: "suggestion-deleted"` (red strikethrough, muted opacity, red left border).

#### Gutter Widget Decorations

For each `SuggestionRange`, a widget decoration is placed at the `from` position, rendered in the left gutter:

```typescript
// Widget decoration for gutter icons
Decoration.widget(range.from, (view) => {
  const container = document.createElement('div');
  container.className = 'suggestion-gutter';
  // Accept button
  const acceptBtn = document.createElement('button');
  acceptBtn.className = 'suggestion-gutter-accept';
  acceptBtn.onclick = () => accept(range.id);
  // Reject button
  const rejectBtn = document.createElement('button');
  rejectBtn.className = 'suggestion-gutter-reject';
  rejectBtn.onclick = () => reject(range.id);
  // Feedback button
  const feedbackBtn = document.createElement('button');
  feedbackBtn.className = 'suggestion-gutter-feedback';
  feedbackBtn.onclick = () => openFeedback(range.id);

  container.append(acceptBtn, rejectBtn, feedbackBtn);
  return container;
}, { side: -1 });
```

### 3. `SuggestionsTopBar` Component

**Location:** `apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/components/ai/suggestions-top-bar.tsx`

A React component rendered above the editor (not inside it) when suggestions are active.

```typescript
interface SuggestionsTopBarProps {
  activeCount: number;
  totalCount: number;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onDismiss: () => void;
}
```

**Renders:** A slim bar: `"3 changes · Accept all · Reject all"` with a dismiss button. Sticky at the top of the editor area. Uses DS `Button` and layout components.

### 4. CSS Classes

**Location:** `packages/ui/src/editor.css` (added to existing file)

```css
/* Suggestion decorations */
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
  padding-left: 12px;
}

.suggestion-deleted-section {
  border-left: 3px solid hsl(var(--destructive) / 0.4);
  opacity: 0.5;
  text-decoration: line-through;
}

/* Gutter icons */
.suggestion-gutter {
  position: absolute;
  left: -36px;
  display: flex;
  flex-direction: column;
  gap: 2px;
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
}

.suggestion-gutter-accept {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.suggestion-gutter-reject {
  background: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
}

.suggestion-gutter-feedback {
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}
```

## Integration with PolicyDetails

### Changes to PolicyDetails.tsx

1. **Remove** the `ProposedChangesCard` import and rendering
2. **Remove** `displayPatch`, `frozenPatch`, and related patch state
3. **Add** `useSuggestions` hook:

```typescript
const suggestions = useSuggestions({
  editor: editorRef.current,
  currentMarkdown: currentPolicyMarkdown,
  proposedMarkdown: proposedPolicyMarkdown,
  onApply: (newMarkdown) => {
    // Convert markdown back to TipTap JSON and save
  },
});
```

4. **Pass** `suggestions` to the editor and top bar:

```tsx
{suggestions.isActive && (
  <SuggestionsTopBar
    activeCount={suggestions.activeCount}
    totalCount={suggestions.totalCount}
    onAcceptAll={suggestions.acceptAll}
    onRejectAll={suggestions.rejectAll}
    onDismiss={suggestions.dismissAll}
  />
)}

<PolicyEditor
  // existing props...
  suggestions={suggestions.ranges}
/>
```

### Changes to PolicyEditor / Editor component

1. The editor component accepts an optional `suggestions` prop
2. When present, it registers the `SuggestionsExtension` with the provided ranges
3. The extension updates its decoration set whenever `suggestions` changes

### Editor Ref

The `PolicyEditor` needs to expose the TipTap `Editor` instance so `useSuggestions` can:
- Read the document structure for position mapping
- Dispatch transactions for accepting changes

This is done via `useImperativeHandle` + `forwardRef` or a callback ref pattern.

## Per-Hunk Feedback (Preserved)

The existing per-hunk feedback flow stays the same conceptually:
- User clicks pencil gutter icon → inline feedback input appears below the section
- Submits feedback → sends message via chat with `FEEDBACK_MARKER`
- AI regenerates → new `proposedMarkdown` arrives → `useSuggestions` recomputes ranges
- Decision remapping: match ranges by position and content identity (same as current `prevPatchRef` logic)

## What Gets Removed

- `proposed-changes-card.tsx` — entire file (replaced by inline decorations)
- `ProposedChangesCard` references in `PolicyDetails.tsx`
- `displayPatch`, `frozenPatch` state in `PolicyDetails.tsx`
- `parseDiff` usage in the card (the hook uses `structuredPatch` directly)
- The card's `HunkWithActions`, `ExpandableSkipSection`, `InlineLine`, `InlineSegment` components

## What Stays

- `useSuggestions` reuses `structuredPatch` from `diff` (already a dependency)
- `FEEDBACK_MARKER` and feedback message filtering in `PolicyDetails.tsx`
- `getLatestCompletedProposal` scanning logic
- `PolicyAiAssistant` with its tool card alerts (but `hasActiveProposal` no longer triggers "↓ View below")
- The AI chat route and system prompt (unchanged)

## Edge Cases

### Position invalidation after accept
When a change is accepted, all subsequent ProseMirror positions shift. Solution: accept in reverse document order for bulk operations. For single accepts, recompute the position map after the transaction.

### Editor content changes during review
If the user manually edits the document while suggestions are active, positions become stale. Solution: on any non-suggestion transaction, recompute the diff and position map. If a manually-edited region overlaps a suggestion range, auto-dismiss that suggestion.

### Empty diff
If the AI returns identical content, `useSuggestions` returns `isActive: false` and no decorations render.

### Large documents
ProseMirror decorations are efficient — they're part of the view layer, not stored in the document. Performance should be fine for policy-sized documents (typically <100 nodes).

## File Structure

```
apps/app/src/app/(app)/[orgId]/policies/[policyId]/editor/
  hooks/
    use-suggestions.ts              # Core hook: diff, position mapping, decisions
  components/
    ai/
      suggestions-top-bar.tsx       # Sticky summary bar
      policy-ai-assistant.tsx       # (existing, minor updates)
      proposed-changes-card.tsx     # DELETED

packages/ui/src/components/editor/
  extensions/
    suggestions.ts                  # TipTap extension with ProseMirror plugin
  editor.css                        # (existing, add suggestion styles)
```

## Testing Strategy

- **Unit tests** for `useSuggestions`: verify diff computation, position mapping, accept/reject state transitions
- **Unit tests** for position map builder: verify line-to-position mapping accuracy
- **Integration tests**: render editor with suggestions, verify decorations appear, verify accept updates content
- **Edge case tests**: overlapping edits, empty diffs, position invalidation after accept

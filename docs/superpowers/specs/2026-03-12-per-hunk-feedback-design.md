# Per-Hunk Feedback for Suggested Changes

## Problem

Users reviewing AI-proposed policy changes can accept or reject individual hunks, but cannot give targeted feedback to refine a specific section. Their only option is to use the parent AI chat, which regenerates the entire proposal and resets all per-hunk decisions.

## Solution

Add a per-hunk feedback mechanism: a pencil icon button alongside accept/reject that opens an inline text input. Submitting feedback regenerates only the targeted hunk while preserving decisions on all other hunks.

## UI Changes

### Three-Button Pill

The accept/reject pill gains a third button. The group becomes: `checkmark | close | pencil`.

- Clicking the pencil expands a small text input below the pill, inside the hunk area
- Input placeholder: "What should change?"
- Submit on Enter or a small send button
- Clicking pencil again or pressing Escape collapses without sending
- During loading: input collapses, hunk content replaced with shimmer/skeleton, pill hidden

### Loading State

When feedback is submitted:
1. Input collapses
2. Hunk content replaced with a shimmer animation
3. Accept/reject/pencil pill hidden for that hunk
4. Other hunks remain interactive

## Data Flow

1. User submits feedback on hunk N
2. `ProposedChangesCard` calls `onHunkFeedback(hunkIndex, feedback)`
3. `PolicyDetails` sends a chat message via existing `sendMessage` with context: "For the section that says '[first ~50 chars of hunk content]': [user feedback]"
4. `feedbackHunkIndex` state tracks which hunk is loading
5. AI responds with a new full proposal via `proposePolicy` tool
6. New proposal generates a new diff patch
7. Frontend re-maps hunk decisions: unchanged hunks keep their decision, the regenerated hunk resets to `pending`

## Props Changes

```typescript
// ProposedChangesCard gains:
onHunkFeedback: (hunkIndex: number, feedback: string) => void;
feedbackHunkIndex?: number | null;
```

## Decision Preservation

When the patch changes due to feedback:
- Map old hunk positions to new by matching `oldStart` line numbers
- Hunks with identical content keep their previous decision
- Changed hunks (the regenerated one) reset to `pending`

## Scope

- New icon: `Edit` (pencil) from `@trycompai/design-system/icons`
- New component: inline feedback input within `HunkWithActions`
- New state: `feedbackHunkIndex` in `PolicyDetails`
- Modified: `ProposedChangesCard` props and `HunkWithActions` to support feedback + loading
- Modified: `PolicyDetails` to handle `onHunkFeedback` callback and decision remapping

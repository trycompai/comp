import { describe, expect, it } from 'vitest';
import { EditorState } from '@tiptap/pm/state';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { buildPositionMap } from '../build-position-map';
import { buildReplacementNodes } from '../apply-suggestion';
import { schema } from '../test-helpers/editor-schema';

function listItem(text: string) {
  return schema.node('listItem', null, [
    schema.node('paragraph', null, [schema.text(text)]),
  ]);
}

function bulletDoc(items: string[]) {
  return schema.node('doc', null, [
    schema.node('bulletList', null, items.map(listItem)),
  ]);
}

// Real ProseMirror [before, after) boundaries for every listItem in the doc.
function realListItemBoundaries(doc: ProseMirrorNode): Array<{ from: number; to: number }> {
  const out: Array<{ from: number; to: number }> = [];
  doc.descendants((node, pos) => {
    if (node.type.name === 'listItem') {
      out.push({ from: pos, to: pos + node.nodeSize });
    }
  });
  return out;
}

// The list-item ranges the position map produced (lines beginning with "- ").
function mappedListItemRanges(doc: ProseMirrorNode): Array<{ from: number; to: number }> {
  const map = buildPositionMap(doc);
  const lines = map.markdown.split('\n');
  const out: Array<{ from: number; to: number }> = [];
  lines.forEach((line, idx) => {
    if (line.startsWith('- ')) {
      const pos = map.lineToPos.get(idx + 1);
      if (pos) out.push(pos);
    }
  });
  return out.sort((a, b) => a.from - b.from);
}

describe('buildPositionMap list-item boundaries (CS-265)', () => {
  it('maps list items to their exact ProseMirror node boundaries', () => {
    const doc = bulletDoc(['First item', 'Second item', 'Third item']);
    expect(mappedListItemRanges(doc)).toEqual(realListItemBoundaries(doc));
  });

  it('is correct when a paragraph precedes the list', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('Intro paragraph.')]),
      schema.node('bulletList', null, [listItem('Alpha'), listItem('Beta')]),
    ]);
    expect(mappedListItemRanges(doc)).toEqual(realListItemBoundaries(doc));
  });
});

describe('single-bullet edit does not bleed into neighbors (CS-265)', () => {
  it('replaces only the targeted item, leaving siblings intact', () => {
    const doc = bulletDoc(['Alpha', 'Bravo', 'Charlie']);
    const ranges = mappedListItemRanges(doc);
    const middle = ranges[1]!; // "Bravo"

    // Replicate applyRangeToDoc's "modify" path exactly.
    const state = EditorState.create({ doc });
    const pmNodes = buildReplacementNodes(state, '- Bravo replaced', middle.from);
    const tr = state.tr.replaceWith(middle.from, middle.to, pmNodes);
    const newDoc = tr.doc;

    // The document must remain a single bulletList with exactly three sibling
    // list items — no nesting, no fragments bleeding between bullets.
    expect(newDoc.childCount).toBe(1);
    const list = newDoc.child(0);
    expect(list.type.name).toBe('bulletList');
    expect(list.childCount).toBe(3);

    const texts: string[] = [];
    list.forEach((item) => {
      expect(item.type.name).toBe('listItem');
      texts.push(item.textContent);
    });
    expect(texts).toEqual(['Alpha', 'Bravo replaced', 'Charlie']);
  });

  it('replaces a multi-bullet range with the right number of clean items', () => {
    const doc = bulletDoc(['Alpha', 'Bravo', 'Charlie']);
    const ranges = mappedListItemRanges(doc);
    const from = ranges[0]!.from; // start of Alpha
    const to = ranges[1]!.to; // end of Bravo (covers two items)

    const state = EditorState.create({ doc });
    const pmNodes = buildReplacementNodes(state, '- One\n- Two', from);
    const newDoc = state.tr.replaceWith(from, to, pmNodes).doc;

    expect(newDoc.childCount).toBe(1);
    const list = newDoc.child(0);
    expect(list.type.name).toBe('bulletList');
    const texts: string[] = [];
    list.forEach((item) => texts.push(item.textContent));
    expect(texts).toEqual(['One', 'Two', 'Charlie']);
  });

  it('inserts a new bullet without splitting or nesting the list', () => {
    const doc = bulletDoc(['Alpha', 'Bravo']);
    const ranges = mappedListItemRanges(doc);
    const afterFirst = ranges[0]!.to; // boundary between Alpha and Bravo

    const state = EditorState.create({ doc });
    const pmNodes = buildReplacementNodes(state, '- Inserted', afterFirst);
    const newDoc = state.tr.insert(afterFirst, pmNodes).doc;

    expect(newDoc.childCount).toBe(1);
    const list = newDoc.child(0);
    expect(list.type.name).toBe('bulletList');
    const texts: string[] = [];
    list.forEach((item) => {
      expect(item.type.name).toBe('listItem');
      texts.push(item.textContent);
    });
    expect(texts).toEqual(['Alpha', 'Inserted', 'Bravo']);
  });
});

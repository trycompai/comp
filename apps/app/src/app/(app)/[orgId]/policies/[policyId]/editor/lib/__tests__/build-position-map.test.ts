import { describe, expect, it } from 'vitest';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { schema } from '../test-helpers/editor-schema';
import { buildPositionMap } from '../build-position-map';

function createDoc(...children: ProseMirrorNode[]) {
  return schema.node('doc', null, children);
}

function p(text: string) {
  return schema.node('paragraph', null, text ? [schema.text(text)] : []);
}

function h(level: number, text: string) {
  return schema.node('heading', { level }, [schema.text(text)]);
}

function bulletList(...items: string[]) {
  const listItems = items.map((text) =>
    schema.node('listItem', null, [schema.node('paragraph', null, [schema.text(text)])]),
  );
  return schema.node('bulletList', null, listItems);
}

describe('buildPositionMap', () => {
  it('maps a single paragraph to correct line and positions', () => {
    const doc = createDoc(p('Hello world'));
    const result = buildPositionMap(doc);

    expect(result.markdown).toBe('Hello world');
    expect(result.lineToPos.size).toBe(1);
    expect(result.lineToPos.get(1)).toEqual({ from: 1, to: 12 });
  });

  it('maps a heading with markdown prefix', () => {
    const doc = createDoc(h(2, 'My Heading'));
    const result = buildPositionMap(doc);

    expect(result.markdown).toBe('## My Heading');
    // Heading produces ['', '## My Heading', ''] so the content line is line 2
    expect(result.lineToPos.get(2)).toEqual({ from: 1, to: 11 });
  });

  it('maps multiple blocks with correct line numbers', () => {
    const doc = createDoc(p('First paragraph'), h(1, 'Title'), p('Second paragraph'));
    const result = buildPositionMap(doc);

    expect(result.markdown).toContain('First paragraph');
    expect(result.markdown).toContain('# Title');
    expect(result.markdown).toContain('Second paragraph');

    // paragraph "First paragraph" -> line 1
    expect(result.lineToPos.get(1)).toBeDefined();
    // heading "Title" -> produces empty line, then "# Title" line
    // After paragraph: lines 1 (text), 2 (empty), then heading: 3 (empty), 4 (# Title), 5 (empty)
    const titlePos = result.lineToPos.get(4);
    expect(titlePos).toBeDefined();
  });

  it('maps bullet list items to individual lines', () => {
    const doc = createDoc(bulletList('Item one', 'Item two', 'Item three'));
    const result = buildPositionMap(doc);

    expect(result.markdown).toContain('- Item one');
    expect(result.markdown).toContain('- Item two');
    expect(result.markdown).toContain('- Item three');

    // All list items map to the same node positions (the whole bulletList node)
    const entries = Array.from(result.lineToPos.entries());
    expect(entries.length).toBeGreaterThanOrEqual(3);
  });

  it('returns empty map for empty doc', () => {
    const doc = schema.node('doc', null, []);
    const result = buildPositionMap(doc);

    expect(result.lineToPos.size).toBe(0);
    expect(result.markdown).toBe('');
  });
});

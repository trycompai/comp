import { Schema } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { buildPositionMap } from '../build-position-map';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    text: { group: 'inline' },
    paragraph: {
      group: 'block',
      content: 'inline*',
    },
    heading: {
      group: 'block',
      content: 'inline*',
      attrs: { level: { default: 1 } },
    },
    bulletList: {
      group: 'block',
      content: 'listItem+',
    },
    orderedList: {
      group: 'block',
      content: 'listItem+',
    },
    listItem: {
      content: 'paragraph+',
    },
    blockquote: {
      group: 'block',
      content: 'block+',
    },
    horizontalRule: {
      group: 'block',
    },
  },
});

function h(level: number, text: string) {
  return schema.node('heading', { level }, [schema.text(text)]);
}

function p(text: string) {
  return text
    ? schema.node('paragraph', null, [schema.text(text)])
    : schema.node('paragraph', null);
}

function ul(...items: string[]) {
  return schema.node(
    'bulletList',
    null,
    items.map((text) =>
      schema.node('listItem', null, [
        schema.node('paragraph', null, [schema.text(text)]),
      ]),
    ),
  );
}

function doc(...children: ReturnType<typeof h>[]) {
  return schema.node('doc', null, children);
}

describe('buildPositionMap', () => {
  describe('headings', () => {
    it('maps a single heading with correct markdown prefix', () => {
      const result = buildPositionMap(doc(h(2, 'Purpose')));

      expect(result.markdown).toBe('## Purpose');
      // The heading content line should be mapped
      const pos = result.lineToPos.get(1);
      expect(pos).toBeDefined();
      expect(pos!.from).toBe(1);
    });

    it('uses the correct number of # for each level', () => {
      const result = buildPositionMap(
        doc(h(1, 'H1'), h(3, 'H3')),
      );

      expect(result.markdown).toContain('# H1');
      expect(result.markdown).toContain('### H3');
    });

    it('adds a blank line before headings (except the first)', () => {
      const result = buildPositionMap(
        doc(h(2, 'First'), h(2, 'Second')),
      );
      const lines = result.markdown.split('\n');

      // First heading on line 1, blank after, blank before second, second heading
      expect(lines[0]).toBe('## First');
      expect(lines[1]).toBe(''); // blank after first heading
      expect(lines[2]).toBe(''); // blank before second heading
      expect(lines[3]).toBe('## Second');
    });

    it('adds a blank line after headings', () => {
      const result = buildPositionMap(
        doc(h(2, 'Title'), p('Body')),
      );
      const lines = result.markdown.split('\n');

      expect(lines[0]).toBe('## Title');
      expect(lines[1]).toBe(''); // blank after heading
      expect(lines[2]).toBe('Body');
    });

    it('maps the heading content line, not blank lines around it', () => {
      const result = buildPositionMap(
        doc(p('Intro'), h(2, 'Section')),
      );

      // Find which line maps to the heading position
      for (const [lineNum, pos] of result.lineToPos) {
        const lines = result.markdown.split('\n');
        const lineContent = lines[lineNum - 1];
        // Every mapped line should be non-empty
        expect(lineContent?.trim()).not.toBe('');
      }
    });
  });

  describe('paragraphs', () => {
    it('maps a single paragraph correctly', () => {
      const result = buildPositionMap(doc(p('Hello world')));

      expect(result.markdown).toBe('Hello world');
      const pos = result.lineToPos.get(1);
      expect(pos).toBeDefined();
      expect(pos!.from).toBe(1);
    });

    it('separates consecutive paragraphs with a blank line', () => {
      const result = buildPositionMap(
        doc(p('First'), p('Second')),
      );
      const lines = result.markdown.split('\n');

      expect(lines[0]).toBe('First');
      expect(lines[1]).toBe('');
      expect(lines[2]).toBe('Second');
    });

    it('maps each paragraph to increasing positions', () => {
      const result = buildPositionMap(
        doc(p('Alpha'), p('Beta')),
      );

      const positions = Array.from(result.lineToPos.values());
      expect(positions.length).toBe(2);
      expect(positions[1]!.from).toBeGreaterThan(positions[0]!.from);
    });
  });

  describe('bullet lists', () => {
    it('renders list items with "- " prefix', () => {
      const result = buildPositionMap(doc(ul('Item one', 'Item two')));

      expect(result.markdown).toContain('- Item one');
      expect(result.markdown).toContain('- Item two');
    });

    it('consecutive single-item bullet lists have no blank lines between items', () => {
      // TipTap renders each bullet as a separate <ul> with one <li>
      const result = buildPositionMap(
        doc(ul('Item A'), ul('Item B'), ul('Item C')),
      );
      const lines = result.markdown.split('\n');

      const idxA = lines.indexOf('- Item A');
      const idxB = lines.indexOf('- Item B');
      const idxC = lines.indexOf('- Item C');

      // Items should be on consecutive lines
      expect(idxB).toBe(idxA + 1);
      expect(idxC).toBe(idxB + 1);
    });

    it('multi-item bullet list renders items consecutively', () => {
      const result = buildPositionMap(
        doc(ul('One', 'Two', 'Three')),
      );
      const lines = result.markdown.split('\n');

      const idx1 = lines.indexOf('- One');
      expect(lines[idx1 + 1]).toBe('- Two');
      expect(lines[idx1 + 2]).toBe('- Three');
    });

    it('adds a blank line before the first list item when preceded by a paragraph', () => {
      const result = buildPositionMap(
        doc(p('Before the list'), ul('Item')),
      );
      const lines = result.markdown.split('\n');

      const listIdx = lines.indexOf('- Item');
      expect(listIdx).toBeGreaterThan(0);
      expect(lines[listIdx - 1]).toBe('');
    });

    it('adds a blank line after the last list item in a group', () => {
      const result = buildPositionMap(
        doc(ul('Item'), p('After')),
      );
      const lines = result.markdown.split('\n');

      const itemIdx = lines.indexOf('- Item');
      expect(lines[itemIdx + 1]).toBe('');
      expect(lines[itemIdx + 2]).toBe('After');
    });

    it('maps each list item to its own ProseMirror position', () => {
      const result = buildPositionMap(
        doc(ul('Alpha', 'Beta')),
      );

      const entries = Array.from(result.lineToPos.entries());
      expect(entries.length).toBeGreaterThanOrEqual(2);

      // Positions should be distinct
      const froms = entries.map(([, pos]) => pos.from);
      expect(new Set(froms).size).toBe(froms.length);
    });
  });

  describe('mixed content', () => {
    it('heading -> paragraph -> bullets -> paragraph -> heading', () => {
      const result = buildPositionMap(
        doc(
          h(2, 'Introduction'),
          p('This is the intro.'),
          ul('Point A'),
          ul('Point B'),
          p('Conclusion text.'),
          h(2, 'Next Section'),
        ),
      );
      const lines = result.markdown.split('\n');

      // Heading first
      expect(lines[0]).toBe('## Introduction');
      expect(lines[1]).toBe(''); // blank after heading

      // Paragraph
      expect(lines[2]).toBe('This is the intro.');

      // Blank before list items
      const pointAIdx = lines.indexOf('- Point A');
      expect(pointAIdx).toBeGreaterThan(2);
      expect(lines[pointAIdx - 1]).toBe('');

      // No blank between list items
      expect(lines[pointAIdx + 1]).toBe('- Point B');

      // Blank after list group
      expect(lines[pointAIdx + 2]).toBe('');

      // Conclusion paragraph
      expect(lines[pointAIdx + 3]).toBe('Conclusion text.');

      // Blank before next heading
      const nextIdx = lines.indexOf('## Next Section');
      expect(nextIdx).toBeGreaterThan(pointAIdx);
      expect(lines[nextIdx - 1]).toBe('');
    });

    it('positions increase monotonically through the document', () => {
      const result = buildPositionMap(
        doc(
          h(2, 'Title'),
          p('Body text'),
          ul('Item'),
        ),
      );

      const positions = Array.from(result.lineToPos.values()).map(
        (pos) => pos.from,
      );
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i]).toBeGreaterThan(positions[i - 1]!);
      }
    });

    it('does not map blank lines in lineToPos', () => {
      const result = buildPositionMap(
        doc(h(2, 'Title'), p('Content')),
      );
      const lines = result.markdown.split('\n');

      for (const [lineNum] of result.lineToPos) {
        const line = lines[lineNum - 1];
        expect(line?.trim().length).toBeGreaterThan(0);
      }
    });

    it('removes trailing empty lines from markdown output', () => {
      const result = buildPositionMap(doc(p('Hello')));

      expect(result.markdown).not.toMatch(/\n$/);
      expect(result.markdown).toBe('Hello');
    });

    it('returns empty map for doc with only empty paragraphs', () => {
      const result = buildPositionMap(doc(p('')));

      // Empty paragraph has no text, so it should not appear in lineToPos
      expect(result.lineToPos.size).toBe(0);
    });
  });
});

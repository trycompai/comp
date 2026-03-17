import { describe, expect, it } from 'vitest';
import { markdownToTipTapJSON } from '../markdown-utils';

describe('markdownToTipTapJSON', () => {
  describe('headings', () => {
    it('converts ## heading to heading node with level 2', () => {
      const result = markdownToTipTapJSON('## Title');

      expect(result).toEqual([
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Title' }],
        },
      ]);
    });

    it('converts # heading to level 1', () => {
      const result = markdownToTipTapJSON('# Top Level');

      expect(result).toEqual([
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Top Level' }],
        },
      ]);
    });

    it('converts ### heading to level 3', () => {
      const result = markdownToTipTapJSON('### Sub Section');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'heading',
        attrs: { level: 3 },
      });
    });

    it('supports heading levels 1 through 6', () => {
      for (let level = 1; level <= 6; level++) {
        const hashes = '#'.repeat(level);
        const result = markdownToTipTapJSON(`${hashes} Heading`);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          type: 'heading',
          attrs: { level },
        });
      }
    });
  });

  describe('paragraphs', () => {
    it('converts plain text to paragraph node', () => {
      const result = markdownToTipTapJSON('Hello world');

      expect(result).toEqual([
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ]);
    });

    it('converts multiple lines to separate paragraphs', () => {
      const result = markdownToTipTapJSON('First line\nSecond line');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        type: 'paragraph',
        content: [{ type: 'text', text: 'First line' }],
      });
      expect(result[1]).toMatchObject({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Second line' }],
      });
    });

    it('trims leading and trailing whitespace from lines', () => {
      const result = markdownToTipTapJSON('   Hello   ');

      expect(result).toHaveLength(1);
      expect(result[0]!.content![0]).toMatchObject({
        type: 'text',
        text: 'Hello',
      });
    });
  });

  describe('bullet lists', () => {
    it('converts - item to bulletList with listItem child', () => {
      const result = markdownToTipTapJSON('- Item one');

      expect(result).toEqual([
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Item one' }],
                },
              ],
            },
          ],
        },
      ]);
    });

    it('converts * item to bulletList', () => {
      const result = markdownToTipTapJSON('* Starred item');

      expect(result).toHaveLength(1);
      expect(result[0]!.type).toBe('bulletList');
      expect(result[0]!.content).toHaveLength(1);
      expect(result[0]!.content![0]!.content![0]!.content![0]).toMatchObject({
        type: 'text',
        text: 'Starred item',
      });
    });

    it('groups consecutive bullet items into ONE bulletList', () => {
      const result = markdownToTipTapJSON('- First\n- Second\n- Third');

      expect(result).toHaveLength(1);
      expect(result[0]!.type).toBe('bulletList');
      expect(result[0]!.content).toHaveLength(3);
      expect(result[0]!.content![0]!.content![0]!.content![0]).toMatchObject({
        text: 'First',
      });
      expect(result[0]!.content![1]!.content![0]!.content![0]).toMatchObject({
        text: 'Second',
      });
      expect(result[0]!.content![2]!.content![0]!.content![0]).toMatchObject({
        text: 'Third',
      });
    });
  });

  describe('ordered lists', () => {
    it('converts 1. item to orderedList with listItem child', () => {
      const result = markdownToTipTapJSON('1. First item');

      expect(result).toEqual([
        {
          type: 'orderedList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'First item' }],
                },
              ],
            },
          ],
        },
      ]);
    });

    it('groups consecutive ordered items into ONE orderedList', () => {
      const result = markdownToTipTapJSON('1. Alpha\n2. Beta\n3. Gamma');

      expect(result).toHaveLength(1);
      expect(result[0]!.type).toBe('orderedList');
      expect(result[0]!.content).toHaveLength(3);
    });

    it('handles arbitrary numbering', () => {
      const result = markdownToTipTapJSON('5. Item five\n10. Item ten');

      expect(result).toHaveLength(1);
      expect(result[0]!.type).toBe('orderedList');
      expect(result[0]!.content).toHaveLength(2);
    });
  });

  describe('blank lines flush list groups', () => {
    it('blank line between bullet items creates two separate bulletLists', () => {
      const result = markdownToTipTapJSON('- First\n\n- Second');

      expect(result).toHaveLength(2);
      expect(result[0]!.type).toBe('bulletList');
      expect(result[1]!.type).toBe('bulletList');
      expect(result[0]!.content).toHaveLength(1);
      expect(result[1]!.content).toHaveLength(1);
    });

    it('blank line between ordered items creates two separate orderedLists', () => {
      const result = markdownToTipTapJSON('1. First\n\n2. Second');

      expect(result).toHaveLength(2);
      expect(result[0]!.type).toBe('orderedList');
      expect(result[1]!.type).toBe('orderedList');
    });
  });

  describe('list type transitions', () => {
    it('switching from bullet to ordered creates separate lists', () => {
      const result = markdownToTipTapJSON('- Bullet\n1. Ordered');

      expect(result).toHaveLength(2);
      expect(result[0]!.type).toBe('bulletList');
      expect(result[1]!.type).toBe('orderedList');
    });

    it('switching from ordered to bullet creates separate lists', () => {
      const result = markdownToTipTapJSON('1. Ordered\n- Bullet');

      expect(result).toHaveLength(2);
      expect(result[0]!.type).toBe('orderedList');
      expect(result[1]!.type).toBe('bulletList');
    });
  });

  describe('mixed content', () => {
    it('heading + paragraph + bullets + paragraph', () => {
      const md = [
        '## Introduction',
        'Some introductory text.',
        '- Point one',
        '- Point two',
        'Conclusion paragraph.',
      ].join('\n');

      const result = markdownToTipTapJSON(md);

      expect(result).toHaveLength(4);
      expect(result[0]).toMatchObject({
        type: 'heading',
        attrs: { level: 2 },
      });
      expect(result[1]).toMatchObject({ type: 'paragraph' });
      expect(result[2]).toMatchObject({ type: 'bulletList' });
      expect(result[2]!.content).toHaveLength(2);
      expect(result[3]).toMatchObject({ type: 'paragraph' });
    });

    it('heading flushes an active list', () => {
      const md = [
        '- Item A',
        '- Item B',
        '## Next Section',
      ].join('\n');

      const result = markdownToTipTapJSON(md);

      expect(result).toHaveLength(2);
      expect(result[0]!.type).toBe('bulletList');
      expect(result[0]!.content).toHaveLength(2);
      expect(result[1]!.type).toBe('heading');
    });

    it('paragraph between lists flushes and creates separate lists', () => {
      const md = [
        '- First list item',
        'A paragraph in between.',
        '- Second list item',
      ].join('\n');

      const result = markdownToTipTapJSON(md);

      expect(result).toHaveLength(3);
      expect(result[0]!.type).toBe('bulletList');
      expect(result[1]!.type).toBe('paragraph');
      expect(result[2]!.type).toBe('bulletList');
    });
  });

  describe('edge cases', () => {
    it('empty input returns empty paragraph', () => {
      const result = markdownToTipTapJSON('');

      expect(result).toEqual([
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '' }],
        },
      ]);
    });

    it('whitespace-only input returns empty paragraph', () => {
      const result = markdownToTipTapJSON('   \n  \n   ');

      expect(result).toEqual([
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '' }],
        },
      ]);
    });

    it('trailing blank lines are ignored', () => {
      const result = markdownToTipTapJSON('Hello\n\n\n');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Hello' }],
      });
    });

    it('leading blank lines are ignored', () => {
      const result = markdownToTipTapJSON('\n\nHello');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Hello' }],
      });
    });

    it('unclosed list at end of input is flushed', () => {
      const result = markdownToTipTapJSON('- Alpha\n- Beta');

      expect(result).toHaveLength(1);
      expect(result[0]!.type).toBe('bulletList');
      expect(result[0]!.content).toHaveLength(2);
    });

    it('single bullet item produces a bulletList with one item', () => {
      const result = markdownToTipTapJSON('- Solo');

      expect(result).toHaveLength(1);
      expect(result[0]!.type).toBe('bulletList');
      expect(result[0]!.content).toHaveLength(1);
    });

    it('heading with no preceding blank line still produces heading', () => {
      const result = markdownToTipTapJSON('Some text\n## Heading');

      expect(result).toHaveLength(2);
      expect(result[0]!.type).toBe('paragraph');
      expect(result[1]!.type).toBe('heading');
    });
  });
});

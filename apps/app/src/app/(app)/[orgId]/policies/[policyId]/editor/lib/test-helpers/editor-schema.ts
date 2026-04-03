import { Schema } from '@tiptap/pm/model';

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
      parseDOM: [
        {
          tag: 'a',
          getAttrs: (dom) => ({
            href: (dom as HTMLElement).getAttribute('href'),
          }),
        },
      ],
      toDOM: (node) => ['a', { href: node.attrs.href }, 0] as const,
    },
  },
});

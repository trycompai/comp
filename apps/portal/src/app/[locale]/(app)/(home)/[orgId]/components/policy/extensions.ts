import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import StarterKit from '@tiptap/starter-kit';
import { cx } from 'class-variance-authority';
import { Markdown } from 'tiptap-markdown';

const starterKit = StarterKit.configure({
  bulletList: {
    HTMLAttributes: {
      class: cx('list-disc list-outside leading-3 -mt-2'),
    },
  },
  orderedList: {
    HTMLAttributes: {
      class: cx('list-decimal list-outside leading-3 -mt-2'),
    },
  },
  listItem: {
    HTMLAttributes: {
      class: cx('leading-normal -mb-2'),
    },
  },
  blockquote: {
    HTMLAttributes: {
      class: cx('border-l-4 border-primary'),
    },
  },
  codeBlock: {
    HTMLAttributes: {
      class: cx('rounded-xs bg-muted text-muted-foreground border p-5 font-mono font-medium'),
    },
  },
  code: {
    HTMLAttributes: {
      class: cx('rounded-xs bg-muted px-1.5 py-1 font-mono font-medium'),
      spellcheck: 'false',
    },
  },
  horizontalRule: {
    HTMLAttributes: {
      class: cx('mt-4 mb-6 border-t border-muted-foreground'),
    },
  },
  dropcursor: {
    color: '#DBEAFE',
    width: 4,
  },
  gapcursor: false,
});

const markdownExtension = Markdown.configure({
  html: true,
  tightLists: true,
  tightListClass: 'tight',
  bulletListMarker: '-',
  linkify: false,
  breaks: false,
  transformPastedText: false,
  transformCopiedText: false,
});

const table = Table.configure({
  resizable: true,
  HTMLAttributes: {
    class: cx('border-collapse border border-muted p-2'),
  },
});

const tableRow = TableRow.configure({
  HTMLAttributes: {
    class: cx('border-collapse border border-muted p-2'),
  },
});

const tableCell = TableCell.configure({
  HTMLAttributes: {
    class: cx('border-collapse border border-muted p-2'),
  },
});

const tableHeader = TableHeader.configure({
  HTMLAttributes: {
    class: cx('border-collapse border border-muted p-2'),
  },
});

export const defaultExtensions = [
  starterKit,
  markdownExtension,
  table,
  tableRow,
  tableCell,
  tableHeader,
];

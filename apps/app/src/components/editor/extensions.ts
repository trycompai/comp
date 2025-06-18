import CharacterCount from '@tiptap/extension-character-count';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import type { Extensions } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';
import { Markdown } from 'tiptap-markdown';

const placeholder = Placeholder.configure({
  placeholder: 'Start writing...',
});

const tiptapLink = Link.configure({
  HTMLAttributes: {
    class:
      'text-muted-foreground underline underline-offset-[3px] hover:text-primary transition-colors cursor-pointer',
  },
});

const tiptapImage = Image.configure({
  allowBase64: true,
  HTMLAttributes: {
    class: 'rounded-lg border border-muted',
  },
});

const taskList = TaskList.configure({
  HTMLAttributes: {
    class: 'not-prose pl-2',
  },
});

const taskItem = TaskItem.configure({
  HTMLAttributes: {
    class: 'flex gap-2 items-start my-4',
  },
  nested: true,
});

const horizontalRule = HorizontalRule.configure({
  HTMLAttributes: {
    class: 'mt-4 mb-6 border-t border-muted-foreground',
  },
});

const starterKit = StarterKit.configure({
  bulletList: {
    HTMLAttributes: {
      class: 'list-disc list-outside leading-3 -mt-2',
    },
  },
  orderedList: {
    HTMLAttributes: {
      class: 'list-decimal list-outside leading-3 -mt-2',
    },
  },
  listItem: {
    HTMLAttributes: {
      class: 'leading-normal -mb-2',
    },
  },
  blockquote: {
    HTMLAttributes: {
      class: 'border-l-4 border-primary',
    },
  },
  codeBlock: {
    HTMLAttributes: {
      class: 'rounded-xs bg-muted text-muted-foreground border p-5 font-mono font-medium',
    },
  },
  code: {
    HTMLAttributes: {
      class: 'rounded-xs bg-muted px-1.5 py-1 font-mono font-medium',
      spellcheck: 'false',
    },
  },
  horizontalRule: false,
  dropcursor: {
    color: '#DBEAFE',
    width: 4,
  },
  gapcursor: false,
});

const codeBlockLowlight = CodeBlockLowlight.configure({
  lowlight: createLowlight(common),
});

const characterCount = CharacterCount.configure();

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
    class: 'border-collapse border border-muted p-2',
  },
});

const tableRow = TableRow.configure({
  HTMLAttributes: {
    class: 'border-collapse border border-muted p-2',
  },
});

const tableCell = TableCell.configure({
  HTMLAttributes: {
    class: 'border-collapse border border-muted p-2',
  },
});

const tableHeader = TableHeader.configure({
  HTMLAttributes: {
    class: 'border-collapse border border-muted p-2',
  },
});

export const defaultExtensions: Extensions = [
  starterKit,
  placeholder,
  tiptapLink,
  tiptapImage,
  taskList,
  taskItem,
  horizontalRule,
  codeBlockLowlight,
  characterCount,
  Underline,
  markdownExtension,
  Highlight,
  TextStyle,
  Color,
  table,
  tableRow,
  tableCell,
  tableHeader,
];

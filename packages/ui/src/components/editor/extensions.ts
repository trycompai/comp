import CharacterCount from '@tiptap/extension-character-count';
import Highlight from '@tiptap/extension-highlight';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';

type DefaultExtensionsOptions = {
  placeholder?: string;
  openLinksOnClick?: boolean;
};

export const defaultExtensions = ({
  placeholder = 'Start writing...',
  openLinksOnClick = false,
}: DefaultExtensionsOptions = {}) => [
  StarterKit.configure({
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
  }),
  // Text styling
  Underline,
  Highlight.configure({ multicolor: true }),
  // Functionality
  CharacterCount,
  Placeholder.configure({
    placeholder,
  }),
  Typography,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  // Links and images
  Link.configure({
    // Make links clickable when viewing (readOnly). When editing, keep disabled.
    openOnClick: openLinksOnClick,
    autolink: true,
    linkOnPaste: true,
    HTMLAttributes: {
      class:
        'text-muted-foreground underline underline-offset-[3px] hover:text-primary transition-colors cursor-pointer',
      target: '_blank',
      rel: 'noopener noreferrer',
    },
  }),
  Image.configure({
    HTMLAttributes: {
      class: 'rounded-lg border border-muted',
    },
  }),
  // Lists
  TaskList.configure({
    HTMLAttributes: {
      class: 'not-prose pl-2',
    },
  }),
  TaskItem.configure({
    nested: true,
    HTMLAttributes: {
      class: 'flex gap-2 items-start my-4',
    },
  }),
  // Other
  HorizontalRule.configure({
    HTMLAttributes: {
      class: 'mt-4 mb-6 border-t border-muted-foreground',
    },
  }),
  // Tables
  Table.configure({
    resizable: true,
  }),
  TableCell,
  TableHeader,
  TableRow,
];

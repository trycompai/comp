import TiptapImage from '@tiptap/extension-image';
import TiptapLink from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import StarterKit from '@tiptap/starter-kit';
// Import Table extensions
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import { slashCommand } from './slash-command'; // Import the configured slash command

// Basic Tiptap extensions - Simplified
export const defaultExtensions = [
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
        class: 'rounded-xs bg-muted p-5 font-mono font-medium text-muted-foreground',
      },
    },
    code: {
      HTMLAttributes: {
        class: 'rounded-md bg-muted  px-1.5 py-1 font-mono font-medium text-muted-foreground',
        spellcheck: 'false',
      },
    },
    horizontalRule: false,
    dropcursor: {
      color: '#DBEAFE',
      width: 4,
    },
    gapcursor: false,
    history: false,
  }),
  // REMOVED InputRule from here for now to fix typing
  // new InputRule({
  //   find: /\/-\s$/,
  //   handler: ({ state, range }: { state: EditorState; range: { from: number; to: number }, match: RegExpMatchArray }) => {
  //     const { tr }: { tr: Transaction } = state;
  //     const emDashNode = state.schema.text('— ');
  //     tr.deleteRange(range.from, range.to).insert(range.from, emDashNode);
  //   },
  // }),

  TiptapLink.configure({
    HTMLAttributes: {
      class:
        'text-muted-foreground underline underline-offset-[3px] hover:text-primary transition-colors cursor-pointer',
    },
  }),

  TiptapImage.configure({
    HTMLAttributes: {
      class: 'rounded-lg border border-muted',
    },
  }),

  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === 'heading') {
        return `Heading ${node.attrs.level}`;
      }
      return 'Enter policy content...'; // Simplified placeholder
    },
    includeChildren: true,
  }),

  // Removed SlashCommand
  TaskList,
  TaskItem.configure({
    nested: true,
    HTMLAttributes: {
      class: 'flex items-start my-4',
    },
  }),

  // Removed Math Extensions

  // Add Table extensions
  Table.configure({
    resizable: true,
    HTMLAttributes: {
      class: 'table-fixed border-collapse border border-muted',
    },
  }),
  TableRow,
  TableHeader.configure({
    HTMLAttributes: {
      class: 'border border-muted bg-muted p-2 text-left font-medium',
    },
  }),
  TableCell.configure({
    HTMLAttributes: {
      class: 'border border-muted p-2 align-top',
    },
  }),

  // Add the configured slash command extension
  slashCommand,
];

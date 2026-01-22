import { Extension } from '@tiptap/core';
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
import { Plugin, PluginKey } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
export * from './extensions/file-attachment';
export * from './extensions/mention';

/**
 * Custom extension to preserve empty lines when pasting plain text.
 * TipTap's default behavior collapses consecutive newlines into a single paragraph break.
 */
const PreserveNewlines = Extension.create({
  name: 'preserveNewlines',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('preserveNewlines'),
        props: {
          handlePaste: (view, event) => {
            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;

            // Only handle plain text paste (not HTML)
            const html = clipboardData.getData('text/html');
            if (html) return false;

            const text = clipboardData.getData('text/plain');
            if (!text) return false;

            // Check if text has multiple consecutive newlines (empty lines)
            if (!text.includes('\n\n')) return false;

            // Split by double newlines to preserve empty paragraphs
            const paragraphs = text.split(/\n\n+/);
            const { schema } = view.state;

            // Ensure required node types exist
            const paragraphType = schema.nodes.paragraph;
            const docType = schema.nodes.doc;
            const hardBreakType = schema.nodes.hardBreak;
            if (!paragraphType || !docType) return false;

            const nodes = paragraphs.map((para) => {
              const lines = para.split('\n');
              const content: ReturnType<typeof schema.text>[] = [];

              lines.forEach((line, lineIndex) => {
                if (line) {
                  content.push(schema.text(line));
                }
                // Add hard break between lines (not after the last line)
                if (lineIndex < lines.length - 1 && hardBreakType) {
                  content.push(hardBreakType.create());
                }
              });

              // Create paragraph with content, or empty paragraph
              return paragraphType.create(null, content.length > 0 ? content : null);
            });

            const fragment = docType.create(null, nodes);
            const slice = fragment.slice(0, fragment.content.size);

            const tr = view.state.tr.replaceSelection(slice);
            view.dispatch(tr);

            return true;
          },
        },
      }),
    ];
  },
});

type DefaultExtensionsOptions = {
  placeholder?: string;
  openLinksOnClick?: boolean;
};

export const defaultExtensions = ({
  placeholder = 'Start writing...',
  openLinksOnClick = false,
}: DefaultExtensionsOptions = {}) => [
  PreserveNewlines,
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

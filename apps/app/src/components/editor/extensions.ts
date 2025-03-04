import Bold from "@tiptap/extension-bold";
import BulletList from "@tiptap/extension-bullet-list";
import Document from "@tiptap/extension-document";
import Heading from "@tiptap/extension-heading";
import Italic from "@tiptap/extension-italic";
import Link from "@tiptap/extension-link";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import Paragraph from "@tiptap/extension-paragraph";
import Strike from "@tiptap/extension-strike";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import Text from "@tiptap/extension-text";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Blockquote } from "@tiptap/extension-blockquote";
import { HardBreak } from "@tiptap/extension-hard-break";
import { HorizontalRule } from "@tiptap/extension-horizontal-rule";
import type { Extension } from "@tiptap/react";

/**
 * Default extensions for the rich text editor with basic functionality
 */
export const defaultExtensions = [
  Document,
  Paragraph,
  Text,
  Bold,
  Italic,
  Heading.configure({
    levels: [1, 2, 3, 4, 5, 6],
  }),
  BulletList,
  OrderedList,
  ListItem,
  Underline,
  Strike,
  Link.configure({
    openOnClick: false,
  }),
  Placeholder.configure({
    placeholder: "Start writing…",
  }),
  Blockquote,
  HardBreak,
  HorizontalRule,
  Table.configure({
    resizable: true,
    allowTableNodeSelection: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
];

/**
 * Extended extensions that include table support
 */
export const extendedExtensions = [
  ...defaultExtensions,
  Table.configure({
    resizable: true,
    allowTableNodeSelection: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
];

/**
 * A convenience extension set that uses StarterKit
 * Good for simpler editors
 */
export const starterExtensions = [
  StarterKit,
  Underline,
  Link.configure({
    openOnClick: false,
  }),
];

/**
 * Create a custom set of extensions by extending the default set
 */
export function createExtensions(customExtensions: Extension[] = []) {
  return [...defaultExtensions, ...customExtensions];
}

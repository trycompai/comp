import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { FileAttachmentView } from './file-attachment-view';

export interface FileAttachmentAttributes {
  id: string;
  name: string;
  size?: number;
  type?: string;
  downloadUrl?: string;
  uploadedAt?: string;
}

export const FileAttachment = Node.create({
  name: 'fileAttachment',

  addOptions() {
    return {
      HTMLAttributes: {},
      onUpload: null as ((file: File) => Promise<FileAttachmentAttributes | null>) | null,
      getDownloadUrl: null as ((attachmentId: string) => Promise<string | null>) | null,
      onDelete: null as ((attachmentId: string) => Promise<void> | void) | null,
    };
  },

  group: 'inline',

  inline: true,

  atom: true,

  selectable: false,

  draggable: false,

  addAttributes() {
    return {
      id: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-id') || '',
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }
          return {
            'data-id': attributes.id,
          };
        },
      },
      name: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-name') || '',
        renderHTML: (attributes) => {
          if (!attributes.name) {
            return {};
          }
          return {
            'data-name': attributes.name,
          };
        },
      },
      size: {
        default: 0,
        parseHTML: (element) => {
          const size = element.getAttribute('data-size');
          return size ? parseInt(size, 10) : 0;
        },
        renderHTML: (attributes) => {
          if (!attributes.size) {
            return {};
          }
          return {
            'data-size': attributes.size.toString(),
          };
        },
      },
      type: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-type') || '',
        renderHTML: (attributes) => {
          if (!attributes.type) {
            return {};
          }
          return {
            'data-type': attributes.type,
          };
        },
      },
      downloadUrl: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-download-url') || '',
        renderHTML: (attributes) => {
          if (!attributes.downloadUrl) {
            return {};
          }
          return {
            'data-download-url': attributes.downloadUrl,
          };
        },
      },
      uploadedAt: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-uploaded-at') || '',
        renderHTML: (attributes) => {
          if (!attributes.uploadedAt) {
            return {};
          }
          return {
            'data-uploaded-at': attributes.uploadedAt,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="file-attachment"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'file-attachment',
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileAttachmentView as any, {
      as: 'span',
    });
  },
});

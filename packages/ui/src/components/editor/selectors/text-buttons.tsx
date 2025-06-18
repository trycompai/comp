import type { Editor } from '@tiptap/react';
import { Bold, Code, Italic, Strikethrough, Underline } from 'lucide-react';

import { cn } from '../../../utils/cn';
import { Button } from '../../button';

interface TextButtonsProps {
  editor: Editor;
}

export const TextButtons = ({ editor }: TextButtonsProps) => {
  if (!editor) return null;

  return (
    <div className="flex space-x-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn('rounded-sm', {
          'bg-accent': editor.isActive('bold'),
        })}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn('rounded-sm', {
          'bg-accent': editor.isActive('italic'),
        })}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={cn('rounded-sm', {
          'bg-accent': editor.isActive('underline'),
        })}
      >
        <Underline className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={cn('rounded-sm', {
          'bg-accent': editor.isActive('strike'),
        })}
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={cn('rounded-sm', {
          'bg-accent': editor.isActive('code'),
        })}
      >
        <Code className="h-4 w-4" />
      </Button>
    </div>
  );
};

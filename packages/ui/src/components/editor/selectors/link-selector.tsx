import type { Editor } from '@tiptap/react';
import { Check, Link, Trash } from 'lucide-react';
import { useState } from 'react';

import { cn } from '../../../utils/cn';
import { Button } from '../../button';
import { Input } from '../../input';
import { Popover, PopoverContent, PopoverTrigger } from '../../popover';

export function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (_e) {
    return false;
  }
}
export function getUrlFromString(str: string) {
  if (isValidUrl(str)) return str;
  try {
    if (str.includes('.') && !str.includes(' ')) {
      return new URL(`https://${str}`).toString();
    }
  } catch (_e) {
    return null;
  }
}

interface LinkSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor;
}

export const LinkSelector = ({ open, onOpenChange, editor }: LinkSelectorProps) => {
  const [value, setValue] = useState('');

  if (!editor) return null;

  const isActive = editor.isActive('link');

  return (
    <Popover modal={true} open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className={cn('hover:bg-accent gap-2', {
            'text-blue-500': isActive,
          })}
        >
          <Link className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-0" sideOffset={10}>
        <div className="p-2">
          <Input
            placeholder="Enter link"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="rounded-xs"
          />
        </div>
        {value && (
          <div className="p-1">
            <Button
              onClick={() => {
                if (value) {
                  editor.chain().focus().extendMarkRange('link').setLink({ href: value }).run();
                  onOpenChange(false);
                  setValue('');
                }
              }}
              size="sm"
              className="hover:bg-accent rounded-sm px-2 py-1 text-xs w-full justify-start"
              variant="ghost"
            >
              <Check className="mr-2 h-3 w-3" />
              Apply
            </Button>
          </div>
        )}
        {isActive && (
          <div className="p-1">
            <Button
              onClick={() => {
                editor.chain().focus().unsetLink().run();
                onOpenChange(false);
              }}
              size="sm"
              className="hover:bg-accent rounded-sm px-2 py-1 text-xs w-full justify-start"
              variant="ghost"
            >
              <Trash className="mr-2 h-3 w-3" />
              Remove link
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

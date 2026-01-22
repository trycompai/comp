'use client';

import React, { useState } from 'react';

import { Check, Copy } from 'lucide-react';
import { cn } from '../utils';
import { Button } from './button';

export const CopyButton = ({
  value,
  className,
  ...props
}: {
  value: string;
  className?: string;
} & React.ComponentProps<'button'>) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!value) return;
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      data-state={copied ? 'copied' : 'not-copied'}
      {...props}
      className={cn('transition-opacity relative flex-shrink-0', className)}
      onClick={handleCopy}
    >
      <span className="sr-only">Copy</span>
      <Check
        className={cn(
          'w-4 h-4 absolute inset-0 m-auto transition-all duration-200',
          copied ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-sm scale-75',
        )}
        aria-label="Copied"
      />
      <Copy
        className={cn(
          'w-4 h-4 absolute inset-0 m-auto transition-all duration-200',
          !copied ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-sm scale-75',
        )}
        aria-label="Copy"
      />
    </Button>
  );
};

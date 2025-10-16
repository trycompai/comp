'use client';

import { cn } from '@/lib/utils';
import { Button } from '@comp/ui/button';
import { Code2, Eye } from 'lucide-react';

interface Props {
  value: 'visual' | 'code';
  onChange: (value: 'visual' | 'code') => void;
}

export function ViewModeSwitch({ value, onChange }: Props) {
  return (
    <div className="bg-background rounded-sm border border-border">
      <Button
        variant={value === 'visual' ? 'default' : 'ghost'}
        onClick={() => onChange('visual')}
        className={cn(
          'h-7 w-7 p-0',
          value === 'visual' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        )}
        aria-label="Visual view"
        title="Visual view"
      >
        <Eye className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={value === 'code' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('code')}
        className={cn(
          'h-7 w-7 p-0',
          value === 'code' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        )}
        aria-label="Code view"
        title="Code view"
      >
        <Code2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

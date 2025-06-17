'use client';

import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comp/ui/tooltip';
import type { Table } from '@tanstack/react-table';
import { Loader } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

interface DataTableActionBarProps<TData> extends React.ComponentProps<typeof motion.div> {
  table: Table<TData>;
  visible?: boolean;
  container?: Element | DocumentFragment | null;
}

function DataTableActionBar<TData>({
  table,
  visible: visibleProp,
  container: containerProp,
  children,
  className,
  ...props
}: DataTableActionBarProps<TData>) {
  const [mounted, setMounted] = React.useState(false);

  React.useLayoutEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        table.toggleAllRowsSelected(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [table]);

  const container = containerProp ?? (mounted ? globalThis.document?.body : null);

  if (!container) return null;

  const visible = visibleProp ?? table.getFilteredSelectedRowModel().rows.length > 0;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          role="toolbar"
          aria-orientation="horizontal"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className={cn(
            'bg-background text-foreground fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit flex-wrap items-center justify-center gap-2 border p-2 shadow-xs',
            className,
          )}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    container,
  );
}

interface DataTableActionBarActionProps extends React.ComponentProps<typeof Button> {
  tooltip?: string;
  isPending?: boolean;
}

function DataTableActionBarAction({
  size = 'sm',
  tooltip,
  isPending,
  disabled,
  className,
  children,
  ...props
}: DataTableActionBarActionProps) {
  const trigger = (
    <Button
      variant="secondary"
      size={size}
      className={cn(
        'border-secondary bg-secondary/50 hover:bg-secondary/70 gap-1.5 border [&>svg]:size-3.5',
        size === 'icon' ? 'size-7' : 'h-7',
        className,
      )}
      disabled={disabled || isPending}
      {...props}
    >
      {isPending ? <Loader className="animate-spin" /> : children}
    </Button>
  );

  if (!tooltip) return trigger;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent
        sideOffset={6}
        className="bg-accent text-foreground border font-semibold dark:bg-zinc-900 [&>span]:hidden"
      >
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export { DataTableActionBar, DataTableActionBarAction };

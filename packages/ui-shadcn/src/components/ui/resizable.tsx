'use client';

import * as ResizablePrimitive from 'react-resizable-panels';

type ResizablePanelGroupProps = Omit<ResizablePrimitive.GroupProps, 'className'>;

function ResizablePanelGroup({ orientation = 'horizontal', ...props }: ResizablePanelGroupProps) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      data-orientation={orientation}
      orientation={orientation}
      className="flex h-full w-full data-[orientation=vertical]:flex-col"
      {...props}
    />
  );
}

type ResizablePanelProps = Omit<ResizablePrimitive.PanelProps, 'className'>;

function ResizablePanel({ ...props }: ResizablePanelProps) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

type ResizableHandleProps = Omit<ResizablePrimitive.SeparatorProps, 'className'> & {
  withHandle?: boolean;
};

function ResizableHandle({ withHandle, ...props }: ResizableHandleProps) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className="bg-border hover:bg-muted-foreground/20 focus-visible:ring-ring relative flex w-px items-center justify-center transition-colors after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden [&[data-orientation=vertical]]:h-px [&[data-orientation=vertical]]:w-full [&[data-orientation=vertical]]:after:left-0 [&[data-orientation=vertical]]:after:h-1 [&[data-orientation=vertical]]:after:w-full [&[data-orientation=vertical]]:after:translate-x-0 [&[data-orientation=vertical]]:after:-translate-y-1/2 [&[data-orientation=vertical]>div]:rotate-90"
      {...props}
    >
      {withHandle && <div className="bg-border z-10 flex h-4 w-1 shrink-0 rounded-full" />}
    </ResizablePrimitive.Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };

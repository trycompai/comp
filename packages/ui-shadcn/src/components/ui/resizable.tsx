'use client';

import * as ResizablePrimitive from 'react-resizable-panels';

type ResizablePanelGroupProps = Omit<ResizablePrimitive.GroupProps, 'className'>;

function ResizablePanelGroup({ ...props }: ResizablePanelGroupProps) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
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
      className="bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=horizontal]:after:inset-x-0 data-[orientation=horizontal]:after:inset-y-auto data-[orientation=horizontal]:after:top-1/2 data-[orientation=horizontal]:after:h-1 data-[orientation=horizontal]:after:w-full data-[orientation=horizontal]:after:translate-x-0 data-[orientation=horizontal]:after:-translate-y-1/2 data-[orientation=horizontal]:[&>div]:rotate-90"
      {...props}
    >
      {withHandle && <div className="bg-border h-6 w-1 rounded-lg z-10 flex shrink-0" />}
    </ResizablePrimitive.Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };

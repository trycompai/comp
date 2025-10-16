'use client';

import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { VERTICAL_COOKIE } from './sizing';

interface HProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultLayout?: number[]; // Now optional since we're not using it
}

export function Horizontal({ defaultLayout, left, right }: HProps) {
  return (
    <div className="h-full w-full flex">
      <div className="w-1/2 h-full flex-shrink-0">{left}</div>
      <div className="w-1/2 h-full flex-shrink-0">{right}</div>
    </div>
  );
}

interface VProps {
  defaultLayout: number[];
  top: React.ReactNode;
  middle: React.ReactNode;
  bottom: React.ReactNode;
}

export function Vertical({ defaultLayout, top, middle, bottom }: VProps) {
  const onLayout = (sizes: number[]) => {
    document.cookie = `${VERTICAL_COOKIE}=${JSON.stringify(sizes)}`;
  };
  return (
    <PanelGroup direction="vertical" onLayout={onLayout} className="h-full">
      <Panel defaultSize={defaultLayout[0]}>{top}</Panel>
      <PanelResizeHandle className="h-2" />
      <Panel defaultSize={defaultLayout[1]}>{middle}</Panel>
      <PanelResizeHandle className="h-2" />
      <Panel defaultSize={defaultLayout[2]}>{bottom}</Panel>
    </PanelGroup>
  );
}

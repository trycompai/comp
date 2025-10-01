'use client';

import { FileExplorer as FileExplorerComponent } from './components/file-explorer/file-explorer';
import { useSandboxStore } from './state';

interface Props {
  className: string;
  initialSelectedPath?: string;
  orgId: string;
  taskId: string;
}

export function FileExplorer({ className, initialSelectedPath, orgId, taskId }: Props) {
  const { sandboxId, status, paths } = useSandboxStore();
  return (
    <FileExplorerComponent
      className={className}
      disabled={status === 'stopped'}
      sandboxId={sandboxId}
      paths={paths}
      initialSelectedPath={initialSelectedPath}
      orgId={orgId}
      taskId={taskId}
    />
  );
}

'use client';

import { cn } from '@/lib/utils';
import { ChevronDownIcon, ChevronRightIcon, FileIcon, FolderIcon } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { PulseLoader } from 'react-spinners';
import { toast } from 'sonner';
import { FileContent } from '../../components/file-explorer/file-content';
import { Panel, PanelHeader } from '../../components/panels/panels';
import { Button } from '../../components/ui/button';
import { ScrollArea, ScrollBar } from '../../components/ui/scroll-area';
import { useSandboxStore } from '../../state';
import { buildFileTree, type FileNode } from './build-file-tree';
import { CodeWritingOverlay } from './code-writing-overlay';

interface Props {
  className: string;
  disabled?: boolean;
  paths: string[];
  sandboxId?: string;
  initialSelectedPath?: string;
  orgId: string;
  taskId: string;
}

export const FileExplorer = memo(function FileExplorer({
  className,
  disabled,
  paths,
  sandboxId,
  initialSelectedPath,
  orgId,
  taskId,
}: Props) {
  const fileTree = useMemo(() => buildFileTree(paths), [paths]);
  const [selected, setSelected] = useState<FileNode | null>(null);
  const [fs, setFs] = useState<FileNode[]>(fileTree);
  const isLoading = !disabled && (!paths || paths.length === 0);
  const [isWriting, setIsWriting] = useState(false);
  const [writingTarget, setWritingTarget] = useState<string | null>(null);
  const [augmented, setAugmented] = useState(false);

  useEffect(() => {
    setFs(fileTree);
    setAugmented(false);
  }, [fileTree]);

  // Auto-select a file when an initial path is provided and present in the tree
  useEffect(() => {
    if (!initialSelectedPath || selected) return;
    const findNode = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.path === initialSelectedPath) return node;
        if (node.children) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    const node = findNode(fileTree);
    if (node) setSelected(node);
  }, [initialSelectedPath, fileTree, selected]);

  const toggleFolder = useCallback((path: string) => {
    setFs((prev) => {
      const updateNode = (nodes: FileNode[]): FileNode[] =>
        nodes.map((node) => {
          if (node.path === path && node.type === 'folder') {
            return { ...node, expanded: !node.expanded };
          } else if (node.children) {
            return { ...node, children: updateNode(node.children) };
          } else {
            return node;
          }
        });
      return updateNode(prev);
    });
  }, []);

  const selectFile = useCallback((node: FileNode) => {
    if (node.type === 'file') {
      setSelected(node);
    }
  }, []);

  const renderFileTree = useCallback(
    (nodes: FileNode[], depth = 0) => {
      return nodes.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          depth={depth}
          selected={selected}
          onToggleFolder={toggleFolder}
          onSelectFile={selectFile}
          renderFileTree={renderFileTree}
        />
      ));
    },
    [selected, toggleFolder, selectFile],
  );

  const [isTesting, setIsTesting] = useState(false);
  const { upsertCommand } = useSandboxStore();

  // Determine if the selected file is a Lambda script
  const isLambdaScript = selected?.name.endsWith('.js');

  // Listen for global write events from chat tool
  useEffect(() => {
    let depth = 0;
    const start = (e: Event) => {
      const detail = (e as CustomEvent).detail as { path?: string };
      depth += 1;
      setIsWriting(true);
      setWritingTarget(detail?.path || null);
    };
    const finish = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) {
        setTimeout(() => {
          setIsWriting(false);
          setWritingTarget(null);
        }, 300);
      }
    };
    window.addEventListener('sandbox:files-start', start as EventListener);
    window.addEventListener('sandbox:files-finish', finish as EventListener);
    return () => {
      window.removeEventListener('sandbox:files-start', start as EventListener);
      window.removeEventListener('sandbox:files-finish', finish as EventListener);
    };
  }, []);

  return (
    <Panel className={className}>
      <PanelHeader>
        <FileIcon className="w-4 mr-2" />
        <span className="font-mono uppercase font-semibold">Remote Filesystem</span>
        {selected && !disabled && (
          <span className="ml-auto text-muted-foreground">{selected.path}</span>
        )}
        {selected && !disabled && sandboxId && isLambdaScript && (
          <div className="ml-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isTesting}
              onClick={async () => {
                if (!sandboxId || !selected) return;
                setIsTesting(true);
                setIsWriting(true);
                const dismiss = toast.loading('Uploading to S3 and invoking Lambda…');
                try {
                  const path = selected.path.substring(1);

                  // Get content from sandbox
                  const contentRes = await fetch(
                    `/api/tasks-automations/sandboxes/${encodeURIComponent(sandboxId)}/files?path=${encodeURIComponent(path)}`,
                  );
                  const content = await contentRes.text();

                  // Upload to S3
                  const uploadRes = await fetch('/api/tasks-automations/lambda/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      orgId,
                      taskId,
                      content,
                    }),
                  });

                  if (!uploadRes.ok) {
                    throw new Error('Failed to upload to S3');
                  }

                  // Invoke Lambda and stream output to sandbox logs
                  const runRes = await fetch('/api/tasks-automations/lambda/invoke-with-logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      orgId,
                      taskId,
                      sandboxId, // Pass sandboxId to create logs
                    }),
                  });

                  const runJson = await runRes.json();
                  toast.dismiss(dismiss);

                  if (runRes.ok && runJson?.cmdId) {
                    // Seed the command so logs component picks it up
                    upsertCommand({
                      sandboxId,
                      cmdId: runJson.cmdId,
                      command: runJson.command || 'node',
                      args: runJson.args || ['lambda-output.js'],
                      background: true,
                    });

                    toast.success('Lambda executed successfully', {
                      description: `Output available in logs`,
                    });
                  } else {
                    throw new Error(runJson?.error || 'Failed to invoke Lambda');
                  }
                } catch (e) {
                  toast.error('Failed to invoke Lambda', {
                    description: (e as Error)?.message || 'Unknown error',
                  });
                } finally {
                  toast.dismiss(dismiss);
                  setIsTesting(false);
                  setTimeout(() => setIsWriting(false), 1200);
                }
              }}
            >
              {isTesting ? 'Running…' : 'Test in Lambda'}
            </Button>
          </div>
        )}
      </PanelHeader>

      <div className="flex text-sm h-[calc(100%-2rem-1px)] relative">
        {isWriting && (
          <div className="absolute inset-0 z-20">
            <CodeWritingOverlay filename={writingTarget || selected?.path.substring(1)} />
          </div>
        )}
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <PulseLoader size={8} className="opacity-70" />
              <span className="text-xs">Loading filesystem…</span>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'flex w-full',
              isWriting && 'opacity-40 pointer-events-none transition-opacity duration-200',
            )}
          >
            <ScrollArea className="w-1/4 border-r border-primary/18 flex-shrink-0 bg-muted/5">
              <div>{renderFileTree(fs)}</div>
            </ScrollArea>
            {selected && sandboxId && !disabled && (
              <ScrollArea className="w-3/4 flex-shrink-0">
                <FileContent sandboxId={sandboxId} path={selected.path.substring(1)} />
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
});

// Memoized file tree node component
const FileTreeNode = memo(function FileTreeNode({
  node,
  depth,
  selected,
  onToggleFolder,
  onSelectFile,
  renderFileTree,
}: {
  node: FileNode;
  depth: number;
  selected: FileNode | null;
  onToggleFolder: (path: string) => void;
  onSelectFile: (node: FileNode) => void;
  renderFileTree: (nodes: FileNode[], depth: number) => React.ReactNode;
}) {
  const isFolder = node.type === 'folder';
  const fileColor = (name: string) => {
    const lower = name.toLowerCase();
    if (/(\.ts|\.tsx|\.js|\.jsx)$/.test(lower)) return 'text-emerald-600 dark:text-emerald-400';
    if (/(\.json|\.yml|\.yaml)$/.test(lower)) return 'text-amber-600 dark:text-amber-400';
    if (/(\.md|\.mdx)$/.test(lower)) return 'text-violet-600 dark:text-violet-400';
    if (/(\.css|\.scss|\.sass)$/.test(lower)) return 'text-pink-600 dark:text-pink-400';
    return 'text-muted-foreground';
  };
  const colorClass = isFolder ? 'text-sky-600 dark:text-sky-400' : fileColor(node.name);

  const handleClick = useCallback(() => {
    if (node.type === 'folder') {
      onToggleFolder(node.path);
    } else {
      onSelectFile(node);
    }
  }, [node, onToggleFolder, onSelectFile]);

  return (
    <div>
      <div
        className={cn(`flex items-center py-0.5 px-1 hover:bg-muted/50 cursor-pointer rounded-xs`, {
          'bg-muted/70 border-l-2 border-primary': selected?.path === node.path,
        })}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === 'folder' ? (
          <>
            {node.expanded ? (
              <ChevronDownIcon className="w-4 mr-1 ${colorClass}" />
            ) : (
              <ChevronRightIcon className="w-4 mr-1 ${colorClass}" />
            )}
            <FolderIcon className={`w-4 mr-2 ${colorClass}`} />
          </>
        ) : (
          <>
            <div className="w-4 mr-1" />
            <FileIcon className={`w-4 mr-2 ${colorClass}`} />
          </>
        )}
        <span className={colorClass}>{node.name}</span>
      </div>

      {node.type === 'folder' && node.expanded && node.children && (
        <div>{renderFileTree(node.children, depth + 1)}</div>
      )}
    </div>
  );
});

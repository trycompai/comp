'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@trycompai/design-system';
import { Edit, Save, Close, Locked, Unlocked, Add } from '@trycompai/design-system/icons';
import { useApi } from '@/hooks/use-api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { OrgChartNode, type OrgChartNodeData } from './OrgChartNode';
import { PeopleSidebar } from './PeopleSidebar';

interface Member {
  id: string;
  user: {
    name: string;
    email: string;
  };
  role: string;
  jobTitle?: string | null;
}

interface OrgChartEditorProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  members: Member[];
  updatedAt: string | null;
}

export function OrgChartEditor({
  initialNodes,
  initialEdges,
  members,
  updatedAt,
}: OrgChartEditorProps) {
  const api = useApi();
  const router = useRouter();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [isLocked, setIsLocked] = useState(initialNodes.length > 0);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(updatedAt);
  const [showSidebar, setShowSidebar] = useState(false);

  // Store the last saved state for cancel/revert
  const savedStateRef = useRef({ nodes: initialNodes, edges: initialEdges });

  const nodeTypes = useMemo(() => ({ orgChartNode: OrgChartNode }), []);

  // Compute which member IDs are already on the chart
  const placedMemberIds = useMemo(() => {
    const ids = new Set<string>();
    for (const node of nodes) {
      const data = node.data as OrgChartNodeData | undefined;
      if (data?.memberId) {
        ids.add(data.memberId);
      }
    }
    return ids;
  }, [nodes]);

  // Inject isLocked and onTitleChange into every node's data for rendering
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...(node.data ?? {}),
        isLocked,
        onTitleChange: (newTitle: string) => {
          handleTitleChange(node.id, newTitle, (node.data as OrgChartNodeData | undefined)?.memberId);
        },
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, isLocked]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (isLocked) return;
      setEdges((eds) => addEdge({ ...params, type: 'smoothstep' }, eds));
    },
    [isLocked, setEdges],
  );

  /**
   * Serialize nodes/edges to plain JSON-safe objects before saving.
   * React Flow nodes may carry internal/non-serializable properties;
   * we strip everything except the fields we actually need.
   */
  const serializeForSave = () => {
    const cleanNodes = nodes.map((n) => {
      const data = (n.data ?? {}) as Record<string, unknown>;
      return {
        id: n.id,
        type: n.type,
        position: { x: n.position.x, y: n.position.y },
        data: {
          name: data.name ?? '',
          title: data.title ?? '',
          memberId: data.memberId ?? undefined,
        },
      };
    });

    const cleanEdges = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type ?? 'smoothstep',
    }));

    return { nodes: cleanNodes, edges: cleanEdges };
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = serializeForSave();
      const response = await api.put<{ updatedAt: string }>('/v1/org-chart', payload);

      if (response.error) {
        toast.error('Failed to save org chart');
        return;
      }

      savedStateRef.current = { nodes: [...nodes], edges: [...edges] };
      setIsLocked(true);
      setShowSidebar(false);
      if (response.data?.updatedAt) {
        setLastSavedAt(response.data.updatedAt);
      } else {
        setLastSavedAt(new Date().toISOString());
      }
      toast.success('Org chart saved');
      router.refresh();
    } catch {
      toast.error('Failed to save org chart');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNodes(savedStateRef.current.nodes);
    setEdges(savedStateRef.current.edges);
    setIsLocked(true);
    setShowSidebar(false);
  };

  const handleUnlock = () => {
    setIsLocked(false);
  };

  const handleAddPerson = (person: {
    name: string;
    title: string;
    memberId?: string;
  }) => {
    const position = reactFlowInstance
      ? reactFlowInstance.screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 3,
        })
      : { x: 250 + Math.random() * 200, y: 100 + Math.random() * 200 };

    const newNode: Node<OrgChartNodeData> = {
      id: `node-${Date.now()}`,
      type: 'orgChartNode',
      position,
      data: {
        name: person.name,
        title: person.title,
        memberId: person.memberId,
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const handleTitleChange = (nodeId: string, newTitle: string, memberId?: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, title: newTitle } } : n,
      ),
    );

    if (memberId) {
      api.patch(`/v1/people/${memberId}`, { jobTitle: newTitle }).catch(() => {
        // Silently fail - the chart save will persist the title in node data regardless
      });
    }
  };

  const handleDeleteSelected = () => {
    const selectedNodeIds = nodes.filter((n) => n.selected).map((n) => n.id);
    setNodes((nds) => nds.filter((node) => !node.selected));
    setEdges((eds) =>
      eds.filter(
        (edge) =>
          !edge.selected &&
          !selectedNodeIds.includes(edge.source) &&
          !selectedNodeIds.includes(edge.target),
      ),
    );
  };

  const hasSelectedElements =
    nodes.some((n) => n.selected) || edges.some((e) => e.selected);

  const formattedLastSaved = lastSavedAt
    ? `Saved ${formatDistanceToNow(new Date(lastSavedAt), { addSuffix: true })}`
    : 'Not yet saved';

  return (
    <div className="relative flex h-[600px] flex-col rounded-lg border border-border bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 overflow-hidden">
          {isLocked ? (
            <Locked size={14} className="shrink-0 text-muted-foreground" />
          ) : (
            <Unlocked size={14} className="shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-xs text-muted-foreground">{formattedLastSaved}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isLocked ? (
            <Button
              variant="outline"
              size="sm"
              iconLeft={<Edit size={16} />}
              onClick={handleUnlock}
            >
              Edit Chart
            </Button>
          ) : (
            <>
              {/* Mobile: toggle people sidebar */}
              <div className="md:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  iconLeft={<Add size={16} />}
                  onClick={() => setShowSidebar(!showSidebar)}
                >
                  People
                </Button>
              </div>
              {hasSelectedElements && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                >
                  Delete
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                iconLeft={<Close size={16} />}
                onClick={handleCancel}
              >
                <span className="hidden sm:inline">Cancel</span>
              </Button>
              <Button
                size="sm"
                iconLeft={<Save size={16} />}
                onClick={handleSave}
                loading={isSaving}
              >
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Canvas area with optional sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop: always show sidebar when unlocked */}
        {!isLocked && (
          <div className="hidden md:block">
            <PeopleSidebar
              members={members}
              onAddMember={handleAddPerson}
              placedMemberIds={placedMemberIds}
            />
          </div>
        )}

        {/* Mobile: overlay sidebar when toggled */}
        {!isLocked && showSidebar && (
          <div className="absolute inset-y-[41px] left-0 z-40 md:hidden">
            <PeopleSidebar
              members={members}
              onAddMember={(person) => {
                handleAddPerson(person);
                setShowSidebar(false);
              }}
              placedMemberIds={placedMemberIds}
            />
          </div>
        )}

        <div ref={reactFlowWrapper} className="relative flex-1">
          <ReactFlow
            nodes={nodesWithCallbacks}
            edges={edges}
            onNodesChange={isLocked ? undefined : onNodesChange}
            onEdgesChange={isLocked ? undefined : onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            nodesDraggable={!isLocked}
            nodesConnectable={!isLocked}
            elementsSelectable={!isLocked}
            defaultEdgeOptions={{ type: 'smoothstep' }}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Controls showInteractive={false} />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

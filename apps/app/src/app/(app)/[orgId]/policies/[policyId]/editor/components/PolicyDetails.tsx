'use client';

import { PolicyEditor } from '@/components/editor/policy-editor';
import '@/styles/editor.css';
import { useChat } from '@ai-sdk/react';
import { Badge } from '@comp/ui/badge';
import { DiffViewer } from '@comp/ui/diff-viewer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { validateAndFixTipTapContent } from '@comp/ui/editor';
import type { Member, PolicyDisplayFormat, PolicyVersion, User } from '@db';
import type { JSONContent } from '@tiptap/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  HStack,
  Section,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@trycompai/design-system';
import { Checkmark, Close, MagicWand } from '@trycompai/design-system/icons';
import { DefaultChatTransport } from 'ai';
import { format } from 'date-fns';
import { structuredPatch } from 'diff';
import { ArrowDownUp, ChevronDown, ChevronLeft, ChevronRight, FileText, Trash2, Upload } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { deleteVersionAction } from '@/actions/policies/delete-version';
import { updateVersionContentAction } from '@/actions/policies/update-version-content';
import { switchPolicyDisplayFormatAction } from '../../actions/switch-policy-display-format';
import { PdfViewer } from '../../components/PdfViewer';
import { PublishVersionDialog } from '../../components/PublishVersionDialog';
import type { PolicyChatUIMessage } from '../types';
import { markdownToTipTapJSON } from './ai/markdown-utils';
import { PolicyAiAssistant } from './ai/policy-ai-assistant';

type PolicyVersionWithPublisher = PolicyVersion & {
  publishedBy: (Member & { user: User }) | null;
};

function mapChatErrorToMessage(error: unknown): string {
  const e = error as { status?: number };
  const status = e?.status;

  if (status === 401 || status === 403) {
    return "You don't have access to this policy's AI assistant.";
  }
  if (status === 404) {
    return 'This policy could not be found. It may have been removed.';
  }
  if (status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  return 'The AI assistant is currently unavailable. Please try again.';
}

interface LatestProposal {
  key: string;
  content: string;
  summary: string;
  title: string;
  detail: string;
  reviewHint: string;
}

function getLatestProposedPolicy(messages: PolicyChatUIMessage[]): LatestProposal | null {
  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
  if (!lastAssistantMessage?.parts) return null;

  let latest: LatestProposal | null = null;

  lastAssistantMessage.parts.forEach((part, index) => {
    if (part.type !== 'tool-proposePolicy') return;
    if (part.state === 'input-streaming' || part.state === 'output-error') return;
    const input = part.input;
    if (!input?.content) return;

    latest = {
      key: `${lastAssistantMessage.id}:${index}`,
      content: input.content,
      summary: input.summary ?? 'Proposing policy changes',
      title: input.title ?? input.summary ?? 'Policy updates ready for your review',
      detail:
        input.detail ??
        'I have prepared an updated version of this policy based on your instructions.',
      reviewHint: input.reviewHint ?? 'Review the proposed changes below before applying them.',
    };
  });

  return latest;
}

interface PolicyContentManagerProps {
  policyId: string;
  policyContent: JSONContent | JSONContent[];
  isPendingApproval: boolean;
  displayFormat?: PolicyDisplayFormat;
  pdfUrl?: string | null;
  /** Whether the AI assistant feature is enabled (behind feature flag) */
  aiAssistantEnabled?: boolean;
  /** Whether there are unpublished draft changes */
  hasUnpublishedChanges?: boolean;
  /** The current active version number (if any) */
  currentVersionNumber?: number | null;
  /** The current active version ID (published) */
  currentVersionId?: string | null;
  /** The pending version ID (awaiting approval) */
  pendingVersionId?: string | null;
  /** All versions for this policy */
  versions?: PolicyVersionWithPublisher[];
  onMutate?: () => void;
}

export function PolicyContentManager({
  policyId,
  policyContent,
  isPendingApproval,
  displayFormat = 'EDITOR',
  pdfUrl,
  aiAssistantEnabled = false,
  hasUnpublishedChanges = false,
  currentVersionNumber,
  currentVersionId,
  pendingVersionId,
  versions = [],
  onMutate,
}: PolicyContentManagerProps) {
  const router = useRouter();
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [activeTab, setActiveTab] = useState<string>(displayFormat);
  const previousTabRef = useRef<string>(displayFormat);
  const [currentContent, setCurrentContent] = useState<Array<JSONContent>>(() => {
    const formattedContent = Array.isArray(policyContent)
      ? policyContent
      : [policyContent as JSONContent];
    return formattedContent;
  });

  const [dismissedProposalKey, setDismissedProposalKey] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [chatErrorMessage, setChatErrorMessage] = useState<string | null>(null);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [localHasChanges, setLocalHasChanges] = useState(hasUnpublishedChanges);

  // Version viewing state: version ID (defaults to latest/active version)
  const [viewingVersion, setViewingVersion] = useState<string>(() => {
    // Default to active version if exists, otherwise first version
    if (currentVersionId) return currentVersionId;
    if (versions.length > 0) return versions[0].id;
    return '';
  });
  // Track if we're editing from a version (for publish button visibility)
  const [editingFromVersion, setEditingFromVersion] = useState<number | null>(null);

  // Sync viewingVersion when versions change (e.g., after regeneration)
  useEffect(() => {
    // If the currently viewed version no longer exists, switch to current version
    const viewedVersionExists = versions.some((v) => v.id === viewingVersion);
    if (!viewedVersionExists) {
      const newViewingVersion = currentVersionId ?? versions[0]?.id ?? '';
      setViewingVersion(newViewingVersion);
      // Also update content if we switched versions
      if (newViewingVersion) {
        const version = versions.find((v) => v.id === newViewingVersion);
        if (version) {
          const versionContent = version.content as JSONContent[];
          const content = Array.isArray(versionContent) ? versionContent : [versionContent];
          setCurrentContent(content);
          setEditorKey((prev) => prev + 1);
        }
      }
    }
  }, [versions, currentVersionId, viewingVersion]);
  
  // Version list state
  const [versionPage, setVersionPage] = useState(0);
  const [versionSortAsc, setVersionSortAsc] = useState(false);
  const [deleteVersionDialogOpen, setDeleteVersionDialogOpen] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<PolicyVersionWithPublisher | null>(null);
  const [isDeletingVersion, setIsDeletingVersion] = useState(false);
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);
  
  const VERSIONS_PER_PAGE = 5;

  const pinnedVersionIds = useMemo(
    () =>
      new Set(
        [currentVersionId, pendingVersionId].filter(Boolean) as string[]
      ),
    [currentVersionId, pendingVersionId]
  );
  
  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => 
      versionSortAsc ? a.version - b.version : b.version - a.version
    );
  }, [versions, versionSortAsc]);

  const unpinnedVersions = useMemo(() => {
    if (pinnedVersionIds.size === 0) {
      return sortedVersions;
    }
    return sortedVersions.filter((version) => !pinnedVersionIds.has(version.id));
  }, [sortedVersions, pinnedVersionIds]);
  
  const paginatedVersions = useMemo(() => {
    const start = versionPage * VERSIONS_PER_PAGE;
    return unpinnedVersions.slice(start, start + VERSIONS_PER_PAGE);
  }, [unpinnedVersions, versionPage]);
  
  const totalVersionPages = Math.ceil(unpinnedVersions.length / VERSIONS_PER_PAGE);

  // Get the version being viewed
  const selectedVersion = versions.find((v) => v.id === viewingVersion) ?? versions[0] ?? null;
  // Check if viewing the active version
  const isViewingActiveVersion = selectedVersion?.id === currentVersionId;
  // Check if viewing the pending version (awaiting approval)
  const isViewingPendingVersion = selectedVersion?.id === pendingVersionId;
  
  // Determine if the version is editable:
  // - Published version = read-only
  // - Pending version = read-only (awaiting approval)
  // - Draft versions = editable
  const isVersionReadOnly = isViewingActiveVersion || isViewingPendingVersion;

  // Handle version selection - load version content into editor
  const handleVersionSelect = (versionId: string) => {
    setIsVersionDropdownOpen(false);
    setViewingVersion(versionId);
    if (versionId !== 'draft') {
      const version = versions.find((v) => v.id === versionId);
      if (version) {
        const versionContent = version.content as JSONContent[];
        const content = Array.isArray(versionContent) ? versionContent : [versionContent];
        setCurrentContent(content);
        setEditingFromVersion(version.version);
        setEditorKey((prev) => prev + 1);
      }
    } else {
      // When switching back to draft, we keep the current content (which may have been modified)
      setEditingFromVersion(null);
    }
  };

  const handleDeleteVersion = async () => {
    if (!versionToDelete) return;
    
    setIsDeletingVersion(true);
    try {
      const result = await deleteVersionAction({
        versionId: versionToDelete.id,
        policyId,
      });
      
      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to delete version');
      }
      
      toast.success(`Version ${versionToDelete.version} deleted`);
      
      // If we deleted the selected version, switch to another one
      if (viewingVersion === versionToDelete.id) {
        const remainingVersions = versions.filter(v => v.id !== versionToDelete.id);
        setViewingVersion(currentVersionId ?? remainingVersions[0]?.id ?? '');
      }
      
      setDeleteVersionDialogOpen(false);
      setVersionToDelete(null);
      onMutate?.();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete version');
    } finally {
      setIsDeletingVersion(false);
    }
  };

  // Content to display is always currentContent (editable)
  const displayContent = useMemo(() => {
    return currentContent;
  }, [currentContent]);


  const {
    messages,
    status,
    sendMessage: baseSendMessage,
  } = useChat<PolicyChatUIMessage>({
    transport: new DefaultChatTransport({
      api: `/api/policies/${policyId}/chat`,
    }),
    onError(error) {
      console.error('Policy AI chat error:', error);
      setChatErrorMessage(mapChatErrorToMessage(error));
    },
  });

  const sendMessage = (payload: { text: string }) => {
    setChatErrorMessage(null);
    baseSendMessage(payload);
  };

  const latestProposal = useMemo(() => getLatestProposedPolicy(messages), [messages]);

  const activeProposal =
    latestProposal && latestProposal.key !== dismissedProposalKey ? latestProposal : null;

  const proposedPolicyMarkdown = activeProposal?.content ?? null;

  const hasPendingProposal = useMemo(
    () =>
      messages.some(
        (m) =>
          m.role === 'assistant' &&
          m.parts?.some(
            (part) =>
              part.type === 'tool-proposePolicy' &&
              (part.state === 'input-streaming' || part.state === 'input-available'),
          ),
      ),
    [messages],
  );

  const switchFormat = useAction(switchPolicyDisplayFormatAction, {
    onSuccess: () => {
      // Server action succeeded, update ref for next operation
      previousTabRef.current = activeTab;
    },
    onError: () => {
      toast.error('Failed to switch view.');
      // Roll back to the previous tab state on error
      setActiveTab(previousTabRef.current);
      // Also restore AI assistant visibility if we were switching from EDITOR
      if (previousTabRef.current === 'EDITOR' && aiAssistantEnabled) {
        setShowAiAssistant(true);
      }
    },
  });

  const currentPolicyMarkdown = useMemo(
    () => convertContentToMarkdown(currentContent),
    [currentContent],
  );

  const diffPatch = useMemo(() => {
    if (!proposedPolicyMarkdown) return null;
    return createGitPatch('Proposed Changes', currentPolicyMarkdown, proposedPolicyMarkdown);
  }, [currentPolicyMarkdown, proposedPolicyMarkdown]);

  async function applyProposedChanges() {
    if (!activeProposal || !viewingVersion) return;

    // Don't allow applying changes to read-only versions
    if (isVersionReadOnly) {
      toast.error('Cannot modify a published or pending version. Create a new version first.');
      return;
    }

    const { content, key } = activeProposal;

    setIsApplying(true);
    try {
      const jsonContent = markdownToTipTapJSON(content);
      const result = await updateVersionContentAction({
        policyId,
        versionId: viewingVersion,
        content: jsonContent,
        entityId: policyId,
      });
      
      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to apply changes');
      }
      
      setCurrentContent(jsonContent);
      setEditorKey((prev) => prev + 1);
      setDismissedProposalKey(key);
      toast.success('Policy updated with AI suggestions');
    } catch (err) {
      console.error('Failed to apply changes:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to apply changes');
    } finally {
      setIsApplying(false);
    }
  }

  // Track local changes made in editor (after save)
  const handleContentSaved = (content: Array<JSONContent>) => {
    setCurrentContent(content);
    setLocalHasChanges(true);
  };


  return (
    <Stack gap="md">
      {/* Version Selector */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Viewing:</span>
          <DropdownMenu open={isVersionDropdownOpen} onOpenChange={setIsVersionDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <FileText className="h-4 w-4" />
                {selectedVersion ? (
                  <>
                    <span className="font-medium">v{selectedVersion.version}</span>
                    {selectedVersion.id === currentVersionId && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Published
                      </Badge>
                    )}
                  </>
                ) : versions.length > 0 ? (
                  <>
                    <span className="font-medium">v{versions[0].version}</span>
                    {versions[0].id === currentVersionId && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Published
                      </Badge>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">No versions yet</span>
                )}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px] max-h-[400px] overflow-y-auto">
              {versions.length > 0 && (
                <>
                  {/* Pinned versions - Published and Pending */}
                  {(currentVersionId || pendingVersionId) && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        Pinned
                      </div>
                      {(() => {
                        const publishedVersion = versions.find(v => v.id === currentVersionId);
                        const pendingVersion = versions.find(v => v.id === pendingVersionId);
                        const pinnedVersions = [publishedVersion, pendingVersion].filter(Boolean) as PolicyVersionWithPublisher[];
                        return pinnedVersions.map((version) => {
                          const isActive = version.id === currentVersionId;
                          const isPending = version.id === pendingVersionId;
                          const isSelected = version.id === viewingVersion;
                          return (
                            <div
                              key={`pinned-${version.id}`}
                              className={`px-2 py-1.5 hover:bg-muted/50 rounded-sm cursor-pointer border-l-2 ${isActive ? 'border-l-primary' : 'border-l-amber-500'} ${isSelected ? 'bg-muted' : ''}`}
                              onClick={() => handleVersionSelect(version.id)}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-4 w-4 shrink-0" />
                                <span className="flex-1 flex items-center gap-1">
                                  v{version.version}
                                  {isActive && (
                                    <Badge variant="secondary" className="text-[10px] px-1 py-0">Published</Badge>
                                  )}
                                  {isPending && (
                                    <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500 text-amber-600">Pending</Badge>
                                  )}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(version.createdAt), 'MMM d')}
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* All versions with pagination */}
                  <div className="px-2 py-1.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      All Versions ({versions.length})
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVersionSortAsc(!versionSortAsc);
                        setVersionPage(0);
                      }}
                      className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                      title={versionSortAsc ? 'Sorted oldest first' : 'Sorted newest first'}
                    >
                      <ArrowDownUp className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {paginatedVersions.map((version) => {
                    const isActive = version.id === currentVersionId;
                    const isPending = version.id === pendingVersionId;
                    const isSelected = version.id === viewingVersion;
                    const canDelete = !isActive && !isPending;
                    return (
                      <div
                        key={version.id}
                        className={`group px-2 py-1.5 hover:bg-muted/50 rounded-sm cursor-pointer flex items-center justify-between ${isSelected ? 'bg-muted' : ''}`}
                        onClick={() => handleVersionSelect(version.id)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="flex-1 flex items-center gap-1">
                            v{version.version}
                            {isActive && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                Published
                              </Badge>
                            )}
                            {isPending && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500 text-amber-600">
                                Pending
                              </Badge>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(version.createdAt), 'MMM d')}
                          </span>
                        </div>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              // Close dropdown first, then open dialog
                              setIsVersionDropdownOpen(false);
                              setVersionToDelete(version);
                              setTimeout(() => {
                                setDeleteVersionDialogOpen(true);
                              }, 100);
                            }}
                            className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                            title="Delete version"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {/* Pagination */}
                  {totalVersionPages > 1 && (
                    <div className="flex items-center justify-between px-2 py-2 border-t mt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVersionPage(Math.max(0, versionPage - 1));
                        }}
                        disabled={versionPage === 0}
                        className="p-1 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {versionPage + 1} / {totalVersionPages}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVersionPage(Math.min(totalVersionPages - 1, versionPage + 1));
                        }}
                        disabled={versionPage >= totalVersionPages - 1}
                        className="p-1 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <DropdownMenuSeparator />
                </>
              )}
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                Edit any draft version directly. Published versions are read-only.
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          {/* For read-only versions (published/pending), show button to create new version */}
          {isVersionReadOnly && !isPendingApproval && (
            <Button
              size="sm"
              onClick={() => setIsPublishDialogOpen(true)}
              iconLeft={<Upload size={14} />}
            >
              Create new version
            </Button>
          )}
        </div>
      </div>


      <Tabs
        defaultValue={displayFormat}
        value={activeTab}
        onValueChange={(format) => {
          previousTabRef.current = activeTab;
          setActiveTab(format);
          if (format === 'PDF') {
            setShowAiAssistant(false);
          }
          switchFormat.execute({ policyId, format: format as 'EDITOR' | 'PDF' });
        }}
      >
        <Stack gap="md">
          <HStack justify="between" align="center">
            <div className="max-w-md">
              <TabsList>
                <TabsTrigger value="EDITOR" disabled={isPendingApproval}>
                  Editor View
                </TabsTrigger>
                <TabsTrigger value="PDF" disabled={isPendingApproval}>
                  PDF View
                </TabsTrigger>
              </TabsList>
            </div>
            {!isPendingApproval && aiAssistantEnabled && activeTab === 'EDITOR' && (
              <Button
                variant={showAiAssistant ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowAiAssistant((prev) => !prev)}
                iconLeft={<MagicWand size={16} />}
              >
                AI Assistant
              </Button>
            )}
          </HStack>

          <div
            className={
              showAiAssistant && aiAssistantEnabled ? 'flex flex-col lg:flex-row gap-6' : ''
            }
          >
            <div className={showAiAssistant && aiAssistantEnabled ? 'flex-[7] min-w-0' : 'w-full'}>
              <Stack gap="sm">
                <TabsContent value="EDITOR">
                  <PolicyEditorWrapper
                    key={`${editorKey}-${viewingVersion}`}
                    policyId={policyId}
                    versionId={viewingVersion}
                    policyContent={displayContent}
                    isPendingApproval={isPendingApproval}
                    isVersionReadOnly={isVersionReadOnly}
                    isViewingActiveVersion={isViewingActiveVersion}
                    isViewingPendingVersion={isViewingPendingVersion}
                    onContentChange={handleContentSaved}
                  />
                </TabsContent>
                <TabsContent value="PDF">
                  <PdfViewer
                    key={viewingVersion}
                    policyId={policyId}
                    versionId={viewingVersion}
                    pdfUrl={selectedVersion?.pdfUrl}
                    isPendingApproval={isPendingApproval}
                    isVersionReadOnly={isVersionReadOnly}
                    onMutate={onMutate}
                  />
                </TabsContent>
              </Stack>
            </div>

            {aiAssistantEnabled && showAiAssistant && activeTab === 'EDITOR' && (
              <div className="flex-[3] min-w-0 self-stretch">
                <PolicyAiAssistant
                  messages={messages}
                  status={status}
                  errorMessage={chatErrorMessage}
                  sendMessage={sendMessage}
                  close={() => setShowAiAssistant(false)}
                  hasActiveProposal={!!activeProposal && !hasPendingProposal}
                />
              </div>
            )}
          </div>
        </Stack>
      </Tabs>

      {proposedPolicyMarkdown && diffPatch && activeProposal && !hasPendingProposal && (
        <Section
          title="Proposed Changes"
          description="The AI has proposed updates to this policy. Review the changes above and click 'Apply Changes' to accept them."
          actions={
            <HStack gap="sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDismissedProposalKey(activeProposal.key)}
                iconLeft={<Close size={12} />}
              >
                Dismiss
              </Button>
              <Button
                size="sm"
                onClick={applyProposedChanges}
                disabled={isApplying}
                loading={isApplying}
                iconLeft={!isApplying ? <Checkmark size={12} /> : undefined}
              >
                Apply Changes
              </Button>
            </HStack>
          }
        >
          <DiffViewer patch={diffPatch} />
        </Section>
      )}

      {/* Create Version Dialog */}
      <PublishVersionDialog
        policyId={policyId}
        currentVersionNumber={versions.find((v) => v.id === currentVersionId)?.version}
        isOpen={isPublishDialogOpen}
        onClose={() => setIsPublishDialogOpen(false)}
        onSuccess={(newVersionId) => {
          // Switch to the newly created version
          setViewingVersion(newVersionId);
          setLocalHasChanges(false);
          onMutate?.();
          router.refresh();
        }}
      />

      {/* Delete Version Dialog */}
      <AlertDialog open={deleteVersionDialogOpen} onOpenChange={setDeleteVersionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Version?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete version {versionToDelete?.version}? This action cannot be undone.
              {versionToDelete?.pdfUrl && ' The associated PDF file will also be deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setVersionToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVersion}
              variant="destructive"
              loading={isDeletingVersion}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Stack>
  );
}

function createGitPatch(fileName: string, oldStr: string, newStr: string): string {
  const patch = structuredPatch(fileName, fileName, oldStr, newStr, '', '', { context: 1 });
  const lines: string[] = [
    `diff --git a/${fileName} b/${fileName}`,
    `--- a/${fileName}`,
    `+++ b/${fileName}`,
  ];

  for (const hunk of patch.hunks) {
    lines.push(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`);
    for (const line of hunk.lines) {
      lines.push(line);
    }
  }

  return lines.join('\n');
}

function convertContentToMarkdown(content: Array<JSONContent>): string {
  function extractText(node: JSONContent): string {
    if (node.type === 'text' && typeof node.text === 'string') {
      return node.text;
    }

    if (Array.isArray(node.content)) {
      const texts = node.content.map(extractText).filter(Boolean);

      switch (node.type) {
        case 'heading': {
          const level = (node.attrs as Record<string, unknown>)?.level || 1;
          return '\n' + '#'.repeat(Number(level)) + ' ' + texts.join('') + '\n';
        }
        case 'paragraph':
          return texts.join('') + '\n';
        case 'bulletList':
        case 'orderedList':
          return '\n' + texts.join('');
        case 'listItem':
          return '- ' + texts.join('') + '\n';
        case 'blockquote':
          return '\n> ' + texts.join('\n> ') + '\n';
        default:
          return texts.join('');
      }
    }

    return '';
  }

  return content.map(extractText).join('\n').trim();
}

function PolicyEditorWrapper({
  policyId,
  versionId,
  policyContent,
  isPendingApproval,
  isVersionReadOnly,
  isViewingActiveVersion,
  isViewingPendingVersion,
  onContentChange,
}: {
  policyId: string;
  versionId: string;
  policyContent: JSONContent | Array<JSONContent>;
  isPendingApproval: boolean;
  isVersionReadOnly: boolean;
  isViewingActiveVersion: boolean;
  isViewingPendingVersion: boolean;
  onContentChange?: (content: Array<JSONContent>) => void;
}) {
  const formattedContent = Array.isArray(policyContent)
    ? policyContent
    : [policyContent as JSONContent];
  const sanitizedContent = formattedContent.map((node) => {
    if (node.marks) node.marks = node.marks.filter((mark) => mark.type !== 'textStyle');
    if (node.content) node.content = node.content.map((child) => child);
    return node;
  });
  const validatedDoc = validateAndFixTipTapContent(sanitizedContent);
  const normalizedContent = (validatedDoc.content || []) as Array<JSONContent>;

  async function savePolicy(content: Array<JSONContent>): Promise<void> {
    if (!versionId) return;

    try {
      // Save to the specific version's content
      const result = await updateVersionContentAction({
        policyId,
        versionId,
        content,
        entityId: policyId,
      });
      
      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to save');
      }
      
      onContentChange?.(content);
    } catch (error) {
      console.error('Error saving policy version:', error);
      throw error;
    }
  }

  // Determine if editor should be read-only
  const isReadOnly = isPendingApproval || isVersionReadOnly;

  // Get the reason for read-only mode
  const getReadOnlyMessage = () => {
    if (isPendingApproval) {
      return 'This policy is pending approval and cannot be edited.';
    }
    if (isViewingActiveVersion) {
      return 'This version is published. Create a new version to make changes.';
    }
    if (isViewingPendingVersion) {
      return 'This version is pending approval and cannot be edited.';
    }
    return null;
  };

  const readOnlyMessage = getReadOnlyMessage();

  return (
    <Section>
      <Stack gap="sm">
        {isReadOnly && readOnlyMessage && (
          <div className="flex items-center gap-4 rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground">
            <span>{readOnlyMessage}</span>
          </div>
        )}
        <PolicyEditor content={normalizedContent} onSave={savePolicy} readOnly={isReadOnly} />
      </Stack>
    </Section>
  );
}

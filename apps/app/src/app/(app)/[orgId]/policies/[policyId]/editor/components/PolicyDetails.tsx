'use client';

import { SelectAssignee } from '@/components/SelectAssignee';
import { PolicyEditor } from '@/components/editor/policy-editor';
import { useChat } from '@ai-sdk/react';
import { Badge } from '@trycompai/ui/badge';
import { useMediaQuery } from '@trycompai/ui/hooks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@trycompai/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@trycompai/ui/dropdown-menu';
import { validateAndFixTipTapContent, SuggestionsExtension } from '@trycompai/ui/editor';
import { PolicyStatus, type Member, type PolicyDisplayFormat, type PolicyVersion, type User } from '@db';
import type { JSONContent, Editor as TipTapEditor } from '@tiptap/react';
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
  Label,
  Section,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@trycompai/design-system';
import { Close, MagicWand } from '@trycompai/design-system/icons';
import { DefaultChatTransport } from 'ai';
import { format } from 'date-fns';
import { ArrowDownUp, ChevronDown, ChevronLeft, ChevronRight, FileText, Trash2, Upload } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { usePolicy } from '../../hooks/usePolicy';
import { usePolicyVersions } from '../../hooks/usePolicyVersions';
import { usePermissions } from '@/hooks/use-permissions';
import { PdfViewer } from '../../components/PdfViewer';
import { PublishVersionDialog } from '../../components/PublishVersionDialog';
import type { PolicyChatUIMessage } from '../types';
import { PolicyAiAssistant } from './ai/policy-ai-assistant';
import { useSuggestions } from '../hooks/use-suggestions';
import { buildPositionMap } from '../lib/build-position-map';
import { InlineEditBubble } from './ai/inline-edit-bubble';
import { markdownToTipTapJSON } from './ai/markdown-utils';

import { SuggestionsTopBar } from './ai/suggestions-top-bar';

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

/**
 * Scan ALL assistant messages for the latest completed proposePolicy tool call.
 * This ensures the card stays visible even when a new streaming response starts
 * (the previous completed proposal lives on an earlier message).
 */
function getLatestCompletedProposal(messages: PolicyChatUIMessage[]): LatestProposal | null {
  let latest: LatestProposal | null = null;

  for (const msg of messages) {
    if (msg.role !== 'assistant' || !msg.parts) continue;
    for (let index = 0; index < msg.parts.length; index++) {
      const part = msg.parts[index];
      if (!part || part.type !== 'tool-proposePolicy') continue;
      if (part.state === 'input-streaming' || part.state === 'output-error') continue;
      const input = part.input;
      if (!input?.content) continue;

      latest = {
        key: `${msg.id}:${index}`,
        content: input.content,
        summary: input.summary ?? 'Proposing policy changes',
        title: input.title ?? input.summary ?? 'Policy updates ready for your review',
        detail:
          input.detail ??
          'I have prepared an updated version of this policy based on your instructions.',
        reviewHint: input.reviewHint ?? 'Review the proposed changes below before applying them.',
      };
    }
  }

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
  /** The current policy status (draft, published, needs_review) */
  policyStatus?: string;
  /** When the policy was last published (null if never published) */
  lastPublishedAt?: Date | null;
  /** Assignees for approval selection */
  assignees?: (Member & { user: User })[];
  /** Initial version ID to view (from URL param) */
  initialVersionId?: string;
  onMutate?: () => void;
  /** Callback to update version content in the cache (optimistic update) */
  onVersionContentChange?: (versionId: string, content: JSONContent[]) => void;
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
  policyStatus,
  lastPublishedAt,
  assignees = [],
  initialVersionId,
  onMutate,
  onVersionContentChange,
}: PolicyContentManagerProps) {
  const { orgId } = useParams<{ orgId: string }>();

  const { updatePolicy } = usePolicy({
    policyId,
    organizationId: orgId,
  });

  const { deleteVersion, submitForApproval, updateVersionContent } = usePolicyVersions({
    policyId,
    organizationId: orgId,
  });

  const { hasPermission } = usePermissions();
  const canUpdatePolicy = hasPermission('policy', 'update');
  const canPublishPolicy = hasPermission('policy', 'update');
  const canDeletePolicy = hasPermission('policy', 'delete');

  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const isWideDesktop = useMediaQuery('(min-width: 1280px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
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
  const [editorInstance, setEditorInstance] = useState<TipTapEditor | null>(null);
  const [chatErrorMessage, setChatErrorMessage] = useState<string | null>(null);

  // Stable callback refs so the extension doesn't need to be recreated
  // when suggestion handlers change
  const suggestionCallbacksRef = useRef<{
    onAccept: (id: string) => void;
    onReject: (id: string) => void;
    onEditClick: (id: string) => void;
    onFeedbackSubmit: (id: string, feedback: string) => void;
    onFeedbackCancel: () => void;
  }>({
    onAccept: () => {},
    onReject: () => {},
    onEditClick: () => {},
    onFeedbackSubmit: () => {},
    onFeedbackCancel: () => {},
  });

  const suggestionsExtension = useMemo(
    () =>
      SuggestionsExtension.configure({
        onAccept: (id: string) => suggestionCallbacksRef.current.onAccept(id),
        onReject: (id: string) => suggestionCallbacksRef.current.onReject(id),
        onEditClick: (id: string) => suggestionCallbacksRef.current.onEditClick(id),
        onFeedbackSubmit: (id: string, feedback: string) => suggestionCallbacksRef.current.onFeedbackSubmit(id, feedback),
        onFeedbackCancel: () => suggestionCallbacksRef.current.onFeedbackCancel(),
        markdownToJSON: markdownToTipTapJSON,
      }),
    [],
  );

  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [localHasChanges, setLocalHasChanges] = useState(hasUnpublishedChanges);

  // Publish approval state
  const [isPublishApprovalDialogOpen, setIsPublishApprovalDialogOpen] = useState(false);
  const [publishApproverId, setPublishApproverId] = useState<string | null>(null);
  const [isSubmittingForApproval, setIsSubmittingForApproval] = useState(false);

  // Version viewing state: version ID (defaults to latest/active version)
  const [viewingVersion, setViewingVersion] = useState<string>(() => {
    // Use initialVersionId from URL if provided
    if (initialVersionId && versions.some((v) => v.id === initialVersionId)) {
      return initialVersionId;
    }
    // Default to active version if exists, otherwise first version
    if (currentVersionId) return currentVersionId;
    if (versions.length > 0) return versions[0].id;
    return '';
  });
  // Track if we're editing from a version (for publish button visibility)
  const [editingFromVersion, setEditingFromVersion] = useState<number | null>(null);
  // Track pending version to switch to (set when creating new version, before data is refetched)
  const [pendingVersionSwitch, setPendingVersionSwitch] = useState<string | null>(null);
  // Track previous initialVersionId to detect actual changes (not just data refreshes)
  const prevInitialVersionIdRef = useRef<string | undefined>(initialVersionId);

  // Sync viewingVersion when initialVersionId changes (e.g., navigating from Versions tab)
  // Only runs when initialVersionId actually changes, not on versions data refresh
  useEffect(() => {
    // Skip if initialVersionId hasn't actually changed
    if (prevInitialVersionIdRef.current === initialVersionId) {
      return;
    }
    prevInitialVersionIdRef.current = initialVersionId;

    if (initialVersionId && versions.some((v) => v.id === initialVersionId)) {
      setViewingVersion(initialVersionId);
      const version = versions.find((v) => v.id === initialVersionId);
      if (version) {
        const versionContent = version.content as JSONContent[];
        const content = Array.isArray(versionContent) ? versionContent : [versionContent];
        setCurrentContent(content);
        setEditorKey((prev) => prev + 1);
      }
    }
  }, [initialVersionId, versions]);

  // Switch to pending version when it becomes available in versions array
  useEffect(() => {
    if (pendingVersionSwitch) {
      const pendingVersion = versions.find((v) => v.id === pendingVersionSwitch);
      if (pendingVersion) {
        setViewingVersion(pendingVersionSwitch);
        const versionContent = pendingVersion.content as JSONContent[];
        const content = Array.isArray(versionContent) ? versionContent : [versionContent];
        setCurrentContent(content);
        setEditorKey((prev) => prev + 1);
        setPendingVersionSwitch(null);
      }
    }
  }, [versions, pendingVersionSwitch]);

  // Sync viewingVersion when versions change (e.g., after regeneration)
  useEffect(() => {
    // Don't reset if we're waiting for a pending version switch
    if (pendingVersionSwitch) return;
    
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
  }, [versions, currentVersionId, viewingVersion, pendingVersionSwitch]);

  // Version list state
  const [versionPage, setVersionPage] = useState(0);
  const [versionSortAsc, setVersionSortAsc] = useState(false);
  const [deleteVersionDialogOpen, setDeleteVersionDialogOpen] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<PolicyVersionWithPublisher | null>(null);
  const [isDeletingVersion, setIsDeletingVersion] = useState(false);
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);

  const VERSIONS_PER_PAGE = 5;

  const pinnedVersionIds = useMemo(
    () => new Set([currentVersionId, pendingVersionId].filter(Boolean) as string[]),
    [currentVersionId, pendingVersionId],
  );

  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) =>
      versionSortAsc ? a.version - b.version : b.version - a.version,
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
  // - Published policy's active version = read-only
  // - Pending version = read-only (awaiting approval)
  // - Draft/needs_review policy = editable
  const isPublishedPolicy = policyStatus === PolicyStatus.published;
  const isVersionReadOnly =
    (isViewingActiveVersion && isPublishedPolicy) || isViewingPendingVersion;

  // For badge display: use lastPublishedAt to determine if the current version was ever published
  // This correctly shows "Published" for the current version even when policy is in needs_review status
  const wasEverPublished = !!lastPublishedAt;

  // Handle version selection - load version content into editor
  const handleVersionSelect = (versionId: string) => {
    setIsVersionDropdownOpen(false);
    setViewingVersion(versionId);
    const version = versions.find((v) => v.id === versionId);
    if (version) {
      const versionContent = version.content as JSONContent[];
      const content = Array.isArray(versionContent) ? versionContent : [versionContent];
      setCurrentContent(content);
      setEditingFromVersion(version.version);
      setEditorKey((prev) => prev + 1);
    }
  };

  const handleDeleteVersion = async () => {
    if (!versionToDelete) return;

    setIsDeletingVersion(true);
    try {
      await deleteVersion(versionToDelete.id);
      toast.success(`Version ${versionToDelete.version} deleted`);

      // If we deleted the selected version, switch to another one
      if (viewingVersion === versionToDelete.id) {
        const remainingVersions = versions.filter(v => v.id !== versionToDelete.id);
        setViewingVersion(currentVersionId ?? remainingVersions[0]?.id ?? '');
      }

      setDeleteVersionDialogOpen(false);
      setVersionToDelete(null);
      onMutate?.();
    } catch {
      toast.error('Failed to delete version');
    } finally {
      setIsDeletingVersion(false);
    }
  };

  // Handle submit for approval
  const handleSubmitForApproval = async () => {
    if (!viewingVersion || !publishApproverId) {
      toast.error('Please select an approver');
      return;
    }

    const versionToPublish = versions.find((v) => v.id === viewingVersion);
    if (!versionToPublish) {
      toast.error('Version not found');
      return;
    }

    setIsSubmittingForApproval(true);
    try {
      await submitForApproval(viewingVersion, publishApproverId);
      toast.success(`Version ${versionToPublish.version} submitted for approval`);
      setIsPublishApprovalDialogOpen(false);
      setPublishApproverId(null);
      onMutate?.();
    } catch {
      toast.error('Failed to submit version for approval');
    } finally {
      setIsSubmittingForApproval(false);
    }
  };

  // Determine if we can publish the current version
  // Can publish if:
  // 1. Not currently pending approval
  // 2. Viewing a version that's not the published one (for published policies)
  // 3. OR policy is draft/needs_review
  const canPublishCurrentVersion = useMemo(() => {
    if (!canPublishPolicy) return false;
    if (isPendingApproval) return false;
    if (isViewingPendingVersion) return false;

    // For published policies, can only publish if viewing a different version
    if (policyStatus === PolicyStatus.published) {
      return !isViewingActiveVersion;
    }

    // For draft/needs_review, can publish the current version
    return policyStatus === PolicyStatus.draft || policyStatus === PolicyStatus.needs_review;
  }, [canPublishPolicy, isPendingApproval, isViewingPendingVersion, policyStatus, isViewingActiveVersion]);

  // Content to display is always currentContent (editable)
  const displayContent = useMemo(() => {
    return currentContent;
  }, [currentContent]);

  const {
    messages,
    status,
    sendMessage: baseSendMessage,
    stop: stopChat,
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
    // Send current editor content so the AI sees the latest state,
    // not stale DB content (e.g. after accepting changes)
    const currentContent = editorInstance
      ? buildPositionMap(editorInstance.state.doc).markdown
      : '';
    baseSendMessage(payload, { body: { currentContent } });
  };

  // ── Proposal state management ──────────────────────────────────────
  // Scan ALL assistant messages for the latest completed proposePolicy tool call.
  // Unlike before, this doesn't only check the last assistant message — it finds
  // the most recent completed proposal across the entire conversation so that
  // starting a new streaming response doesn't cause the card to vanish.

  const latestCompletedProposal = useMemo(
    () => getLatestCompletedProposal(messages),
    [messages],
  );

  // The last fully-completed, non-dismissed proposal the user can act on.
  // Clear dismissedProposalKey when a new proposal arrives so it's not blocked.
  const activeProposal = useMemo(() => {
    if (!latestCompletedProposal) return null;
    if (latestCompletedProposal.key === dismissedProposalKey) return null;
    return latestCompletedProposal;
  }, [latestCompletedProposal, dismissedProposalKey]);

  const proposedPolicyMarkdown = activeProposal?.content ?? null;

  const handleSwitchFormat = async (format: string) => {
    previousTabRef.current = activeTab;
    // Only persist the preference if the user can update the policy
    if (canUpdatePolicy) {
      try {
        await updatePolicy({ displayFormat: format });
      } catch {
        toast.error('Failed to switch view.');
        setActiveTab(previousTabRef.current);
        if (previousTabRef.current === 'EDITOR' && aiAssistantEnabled) {
          setShowAiAssistant(true);
        }
      }
    }
  };

  const suggestions = useSuggestions({
    editor: editorInstance,
    proposedMarkdown: proposedPolicyMarkdown,
  });

  // Auto-dismiss proposal when ranges transition from active → inactive
  const wasActiveRef = useRef(false);
  useEffect(() => {
    if (suggestions.isActive) {
      wasActiveRef.current = true;
    } else if (wasActiveRef.current && activeProposal) {
      // Was active, now inactive — all ranges resolved
      wasActiveRef.current = false;
      setDismissedProposalKey(activeProposal.key);
    }
  }, [suggestions.isActive, activeProposal]);

  // Reset loading state when AI finishes responding or errors
  useEffect(() => {
    if (status === 'ready' || status === 'error') {
      suggestions.resetLoading();
    }
  }, [status, suggestions.resetLoading]);

  // Wire suggestion callbacks via refs (avoids recreating the extension)
  suggestionCallbacksRef.current = {
    onAccept: suggestions.accept,
    onReject: suggestions.reject,
    onEditClick: suggestions.startEditing,
    onFeedbackSubmit: suggestions.giveFeedback,
    onFeedbackCancel: suggestions.cancelEditing,
  };

  // Filter out per-hunk feedback messages (and their AI responses) from chat display
  // Track local changes made in editor (after save)
  const handleContentSaved = (content: Array<JSONContent>) => {
    setCurrentContent(content);
    setLocalHasChanges(true);
  };

  return (
    <Stack gap="md">
      <Tabs
        defaultValue={displayFormat}
        value={activeTab}
        onValueChange={(format) => {
          previousTabRef.current = activeTab;
          setActiveTab(format);
          if (format === 'PDF') {
            setShowAiAssistant(false);
          }
          handleSwitchFormat(format);
        }}
      >
        <Stack gap="md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Left side: Tabs */}
            <div>
              <TabsList variant="default">
                <TabsTrigger value="EDITOR" disabled={isPendingApproval}>
                  Editor View
                </TabsTrigger>
                <TabsTrigger value="PDF" disabled={isPendingApproval}>
                  PDF View
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Right side: Version selector + Action buttons */}
            <div className="flex items-center gap-2">
              {/* Version Selector */}
              <DropdownMenu open={isVersionDropdownOpen} onOpenChange={setIsVersionDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-8 w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {selectedVersion ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">v{selectedVersion.version}</span>
                          {selectedVersion.id === currentVersionId && wasEverPublished && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary hover:bg-primary/10"
                            >
                              Published
                            </Badge>
                          )}
                          {selectedVersion.id === currentVersionId && !wasEverPublished && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 border-warning/30 bg-warning/10 text-warning hover:bg-warning/10"
                            >
                              Draft
                            </Badge>
                          )}
                          {selectedVersion.id === pendingVersionId && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 border-amber-500 text-amber-600"
                            >
                              Pending
                            </Badge>
                          )}
                        </div>
                      ) : versions.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">v{versions[0].version}</span>
                          {versions[0].id === currentVersionId && wasEverPublished && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary hover:bg-primary/10"
                            >
                              Published
                            </Badge>
                          )}
                          {versions[0].id === currentVersionId && !wasEverPublished && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 border-warning/30 bg-warning/10 text-warning hover:bg-warning/10"
                            >
                              Draft
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No versions yet</span>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[200px] max-h-[400px] overflow-y-auto"
                >
                  {versions.length > 0 && (
                    <>
                      {/* Pinned versions - Published and Pending */}
                      {(currentVersionId || pendingVersionId) && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                            Pinned
                          </div>
                          {(() => {
                            const publishedVersion = versions.find(
                              (v) => v.id === currentVersionId,
                            );
                            const pendingVersion = versions.find((v) => v.id === pendingVersionId);
                            // Deduplicate: if currentVersionId === pendingVersionId, only include once
                            const pinnedVersions = [
                              publishedVersion,
                              // Only add pending if it's different from published
                              pendingVersion && pendingVersion.id !== publishedVersion?.id ? pendingVersion : null,
                            ].filter(Boolean) as PolicyVersionWithPublisher[];
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
                                    <span className="flex-1 flex items-center gap-1.5">
                                      <span className="text-xs">v{version.version}</span>
                                      {isActive && wasEverPublished && (
                                        <Badge
                                          variant="secondary"
                                          className="text-[10px] px-1 py-0 bg-primary/10 text-primary hover:bg-primary/10"
                                        >
                                          Published
                                        </Badge>
                                      )}
                                      {isActive && !wasEverPublished && !isPending && (
                                        <Badge
                                          variant="secondary"
                                          className="text-[10px] px-1 py-0 border-warning/30 bg-warning/10 text-warning hover:bg-warning/10"
                                        >
                                          Draft
                                        </Badge>
                                      )}
                                      {isPending && (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] px-1 py-0 border-amber-500 text-amber-600"
                                        >
                                          Pending
                                        </Badge>
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
                          Other versions ({unpinnedVersions.length})
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
                        const canDelete = canDeletePolicy && !isActive && !isPending;
                        return (
                          <div
                            key={version.id}
                            className={`group px-2 py-1.5 hover:bg-muted/50 rounded-sm cursor-pointer flex items-center justify-between ${isSelected ? 'bg-muted' : ''}`}
                            onClick={() => handleVersionSelect(version.id)}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 shrink-0" />
                              <span className="flex-1 flex items-center gap-1.5">
                                <span className="text-xs">v{version.version}</span>
                                {isActive && wasEverPublished && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1 py-0 bg-primary/10 text-primary hover:bg-primary/10"
                                  >
                                    Published
                                  </Badge>
                                )}
                                {isActive && !wasEverPublished && !isPending && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1 py-0 border-warning/30 bg-warning/10 text-warning hover:bg-warning/10"
                                  >
                                    Draft
                                  </Badge>
                                )}
                                {isPending && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1 py-0 border-amber-500 text-amber-600"
                                  >
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

              {/* For draft versions, show Publish button */}
              {canPublishCurrentVersion && (
                <Button
                  size="default"
                  onClick={() => setIsPublishApprovalDialogOpen(true)}
                  iconLeft={<Upload size={14} />}
                >
                  Publish
                </Button>
              )}
              {/* For read-only versions (published/pending), show button to create new version */}
              {isVersionReadOnly && !isViewingPendingVersion && canUpdatePolicy && (
                <Button
                  size="default"
                  onClick={() => setIsPublishDialogOpen(true)}
                  iconLeft={<Upload size={14} />}
                >
                  Create new version
                </Button>
              )}
              {!isVersionReadOnly && canUpdatePolicy && aiAssistantEnabled && activeTab === 'EDITOR' && (
                <Button
                  variant={showAiAssistant ? 'default' : 'outline'}
                  size="default"
                  onClick={() => setShowAiAssistant((prev) => !prev)}
                  iconLeft={<MagicWand size={16} />}
                >
                  AI Assistant
                </Button>
              )}
            </div>
          </div>

          {/* Mobile/tablet and medium desktop: AI assistant above the editor */}
          {aiAssistantEnabled && showAiAssistant && !isVersionReadOnly && activeTab === 'EDITOR' && !isWideDesktop && (
            <div className="h-[400px]">
              <PolicyAiAssistant
                messages={messages}
                status={status}
                errorMessage={chatErrorMessage}
                sendMessage={sendMessage}
                stop={stopChat}
                close={() => setShowAiAssistant(false)}
              />
            </div>
          )}

          <div
            className={
              showAiAssistant && aiAssistantEnabled && isWideDesktop ? 'flex flex-row items-start gap-6' : ''
            }
          >
            <div className={showAiAssistant && aiAssistantEnabled && isWideDesktop ? 'flex-[7] min-w-0 max-h-[calc(100dvh-24rem)] overflow-y-auto' : 'w-full'}>
              <Stack gap="sm">
                <TabsContent value="EDITOR">
                  {suggestions.isActive && (
                    <SuggestionsTopBar
                      activeCount={suggestions.activeCount}
                      totalCount={suggestions.totalCount}
                      currentIndex={suggestions.currentIndex}
                      onAcceptAll={suggestions.acceptAll}
                      onRejectAll={suggestions.rejectAll}
                      onPrev={suggestions.goToPrev}
                      onNext={suggestions.goToNext}
                      onDismiss={() => {
                        suggestions.dismissAll();
                        if (activeProposal) setDismissedProposalKey(activeProposal.key);
                      }}
                    />
                  )}
                  {editorInstance && !isVersionReadOnly && canUpdatePolicy && (
                    <InlineEditBubble
                      editor={editorInstance}
                      policyId={policyId}
                      disabled={suggestions.isActive}
                    />
                  )}
                  <PolicyEditorWrapper
                    key={`${editorKey}-${viewingVersion}`}
                    policyId={policyId}
                    versionId={viewingVersion}
                    policyContent={displayContent}
                    isPendingApproval={isPendingApproval}
                    isVersionReadOnly={isVersionReadOnly}
                    isViewingActiveVersion={isViewingActiveVersion}
                    isViewingPendingVersion={isViewingPendingVersion}
                    policyStatus={policyStatus}
                    onContentChange={handleContentSaved}
                    onVersionContentChange={onVersionContentChange}
                    saveVersionContent={updateVersionContent}
                    onEditorReady={setEditorInstance}
                    additionalExtensions={[suggestionsExtension]}
                    suggestionsActive={suggestions.isActive}
                  />
                </TabsContent>
                <TabsContent value="PDF">
                  <PdfViewer
                    key={viewingVersion}
                    policyId={policyId}
                    versionId={viewingVersion}
                    pdfUrl={selectedVersion?.pdfUrl}
                    isPendingApproval={isPendingApproval}
                    isVersionReadOnly={isVersionReadOnly || !canUpdatePolicy}
                    isViewingActiveVersion={isViewingActiveVersion}
                    isViewingPendingVersion={isViewingPendingVersion}
                    onMutate={onMutate}
                  />
                </TabsContent>
              </Stack>
            </div>

            {/* Wide desktop (1536px+): AI assistant side panel */}
            {aiAssistantEnabled && showAiAssistant && !isVersionReadOnly && activeTab === 'EDITOR' && isWideDesktop && (
              <div className="flex-[3] min-w-[320px] sticky top-0 h-[calc(100dvh-24rem)]">
                <PolicyAiAssistant
                  messages={messages}
                  status={status}
                  errorMessage={chatErrorMessage}
                  sendMessage={sendMessage}
                  stop={stopChat}
                  close={() => setShowAiAssistant(false)}
                />
              </div>
            )}
          </div>

        </Stack>
      </Tabs>

      {/* Create Version Dialog */}
      <PublishVersionDialog
        policyId={policyId}
        currentVersionNumber={versions.find((v) => v.id === currentVersionId)?.version}
        isOpen={isPublishDialogOpen}
        onClose={() => setIsPublishDialogOpen(false)}
        onSuccess={(newVersionId) => {
          // Set pending version switch - will switch when data is refetched
          setPendingVersionSwitch(newVersionId);
          setLocalHasChanges(false);
          onMutate?.();
        }}
      />

      {/* Delete Version Dialog */}
      <AlertDialog open={deleteVersionDialogOpen} onOpenChange={setDeleteVersionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Version?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete version {versionToDelete?.version}? This action cannot
              be undone.
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

      {/* Publish Version Approval Dialog */}
      <Dialog
        open={isPublishApprovalDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsPublishApprovalDialogOpen(false);
            setPublishApproverId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Publish Version {versions.find((v) => v.id === viewingVersion)?.version}
            </DialogTitle>
            <DialogDescription>
              Select an approver to review and publish this version. Once approved, this version
              will become the active published version.
            </DialogDescription>
          </DialogHeader>
          <Stack gap="md">
            <Stack gap="sm">
              <Label htmlFor="version-approver">Approver</Label>
              <SelectAssignee
                assignees={assignees}
                onAssigneeChange={(id) => setPublishApproverId(id)}
                assigneeId={publishApproverId || ''}
                withTitle={false}
              />
            </Stack>
          </Stack>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPublishApprovalDialogOpen(false);
                setPublishApproverId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitForApproval}
              disabled={isSubmittingForApproval || !publishApproverId}
              loading={isSubmittingForApproval}
            >
              Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}

function PolicyEditorWrapper({
  policyId,
  versionId,
  policyContent,
  isPendingApproval,
  isVersionReadOnly,
  isViewingActiveVersion,
  isViewingPendingVersion,
  policyStatus,
  onContentChange,
  onVersionContentChange,
  saveVersionContent,
  onEditorReady,
  additionalExtensions,
  suggestionsActive = false,
}: {
  policyId: string;
  versionId: string;
  policyContent: JSONContent | Array<JSONContent>;
  isPendingApproval: boolean;
  isVersionReadOnly: boolean;
  isViewingActiveVersion: boolean;
  isViewingPendingVersion: boolean;
  policyStatus?: string;
  onContentChange?: (content: Array<JSONContent>) => void;
  onVersionContentChange?: (versionId: string, content: JSONContent[]) => void;
  saveVersionContent: (versionId: string, content: JSONContent[]) => Promise<unknown>;
  onEditorReady?: (editor: TipTapEditor) => void;
  additionalExtensions?: import('@tiptap/core').Extension[];
  suggestionsActive?: boolean;
}) {
  const { hasPermission } = usePermissions();
  const canUpdatePolicy = hasPermission('policy', 'update');

  const formattedContent = Array.isArray(policyContent)
    ? policyContent
    : [policyContent as JSONContent];
  const validatedDoc = validateAndFixTipTapContent(formattedContent);
  const normalizedContent = (validatedDoc.content || []) as Array<JSONContent>;

  async function savePolicy(content: Array<JSONContent>): Promise<void> {
    if (!versionId) return;

    await saveVersionContent(versionId, content);

    onContentChange?.(content);
    // Update the versions cache so switching versions shows the latest content
    onVersionContentChange?.(versionId, content);
  }

  // Determine if editor should be read-only
  // isVersionReadOnly already covers the pending version case (isViewingPendingVersion)
  const isReadOnly = isVersionReadOnly || !canUpdatePolicy;

  // Get status message and styling for all states
  const getStatusInfo = (): {
    message: string;
    className: string;
  } | null => {
    // Read-only states (higher priority)
    if (isPendingApproval) {
      return {
        message: 'This policy is pending approval and cannot be edited.',
        className: 'border-warning/30 bg-warning/10',
      };
    }
    if (isViewingPendingVersion) {
      return {
        message: 'This version is pending approval and cannot be edited.',
        className: 'border-warning/30 bg-warning/10',
      };
    }

    // Status-based messages
    // Only show "published" banner when viewing the current version of a published policy
    if (isViewingActiveVersion && policyStatus === PolicyStatus.published) {
      return {
        message: 'This version is published. Create a new version to make changes.',
        className: 'border-primary/20 bg-primary/10',
      };
    }
    if (policyStatus === PolicyStatus.draft) {
      return {
        message: 'This policy is a draft.',
        className: 'border-muted-foreground/20 bg-muted/50',
      };
    }
    if (policyStatus === PolicyStatus.needs_review) {
      return {
        message: 'This policy needs review. Update the content and submit for approval.',
        className: 'border-blue-500/30 bg-blue-500/10',
      };
    }

    return null;
  };

  const statusInfo = getStatusInfo();

  return (
    <Section>
      <Stack gap="sm">
        {statusInfo && !suggestionsActive && (
          <div
            className={`flex items-center gap-4 rounded-lg border px-4 py-3 text-sm text-foreground ${statusInfo.className}`}
          >
            <span>{statusInfo.message}</span>
          </div>
        )}
        <div className="pb-6 rounded-b-xl shadow-[0_8px_16px_-10px_hsl(0_0%_0%/0.1)]">
          <PolicyEditor
            content={normalizedContent}
            onSave={savePolicy}
            readOnly={isReadOnly}
            onEditorReady={onEditorReady}
            additionalExtensions={additionalExtensions}
            showToolbar={!suggestionsActive}
          />
        </div>
      </Stack>
    </Section>
  );
}

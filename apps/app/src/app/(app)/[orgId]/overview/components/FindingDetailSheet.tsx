'use client';

import {
  FINDING_SEVERITY_CONFIG,
  FINDING_STATUS_CONFIG,
  useFindingActions,
  useFindingHistory,
  type Finding,
  type FindingHistoryEntry,
} from '@/hooks/use-findings-api';

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
import { usePermissions } from '@/hooks/use-permissions';
import { useSession } from '@/utils/auth-client';
import { FindingSeverity, FindingStatus } from '@db';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  HStack,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Stack,
  Text,
  Textarea,
} from '@trycompai/design-system';
import { Copy } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface FindingDetailSheetProps {
  finding: Finding | null;
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  onDeleted?: () => void;
}

/**
 * Mirror of the API's status-transition rules in
 * `findings.service.ts#update`. Showing options the backend forbids leads to
 * predictable 403s on save, so filter to what the current user can actually
 * set. The current status is always preserved so the dropdown can render its
 * own value even if the user can no longer set it.
 */
function allowedStatusOptions({
  current,
  isAuditor,
  isPlatformAdmin,
}: {
  current: FindingStatus;
  isAuditor: boolean;
  isPlatformAdmin: boolean;
}): FindingStatus[] {
  const canSetRestricted = isAuditor || isPlatformAdmin;
  const canSetReadyForReview = !isAuditor || isPlatformAdmin;
  const options: FindingStatus[] = [FindingStatus.open];
  if (canSetReadyForReview) options.push(FindingStatus.ready_for_review);
  if (canSetRestricted) {
    options.push(FindingStatus.needs_revision, FindingStatus.closed);
  }
  if (!options.includes(current)) options.push(current);
  return options;
}

const SEVERITY_OPTIONS: FindingSeverity[] = [
  FindingSeverity.low,
  FindingSeverity.medium,
  FindingSeverity.high,
  FindingSeverity.critical,
];

function targetHref(f: Finding, orgId: string): string | null {
  if (f.taskId) return `/${orgId}/tasks/${f.taskId}`;
  if (f.policyId) return `/${orgId}/policies/${f.policyId}`;
  if (f.vendorId) return `/${orgId}/vendors/${f.vendorId}`;
  if (f.riskId) return `/${orgId}/risk/${f.riskId}`;
  if (f.memberId) return `/${orgId}/people/${f.memberId}`;
  if (f.deviceId) return `/${orgId}/people?tab=devices&device=${f.deviceId}`;
  if (f.evidenceSubmission) return `/${orgId}/documents/${f.evidenceSubmission.formType}`;
  if (f.evidenceFormType) return `/${orgId}/documents/${f.evidenceFormType}`;
  if (f.area === 'people') return `/${orgId}/people`;
  if (f.area === 'documents') return `/${orgId}/documents`;
  if (f.area === 'risks') return `/${orgId}/risk`;
  if (f.area === 'vendors') return `/${orgId}/vendors`;
  if (f.area === 'policies') return `/${orgId}/policies`;
  return null;
}

const LEGACY_SCOPE_LABELS: Record<string, string> = {
  people: 'People › Directory',
  people_tasks: 'People › Tasks',
  people_devices: 'People › Devices',
  people_chart: 'People › Org chart',
};

/**
 * Rows that pre-date the unified-findings migration have their original
 * `FindingScope` value preserved on the creation AuditLog entry. Surface it
 * so owners/admins can see where the finding was originally filed — otherwise
 * legacy people-scope findings all look identical under `area='people'`.
 */
function legacyScopeLabelFromHistory(
  history: FindingHistoryEntry[] | undefined,
): string | null {
  if (!history || history.length === 0) return null;
  // History comes back newest-first; the creation entry is the oldest one.
  const createdEntry = [...history]
    .reverse()
    .find((e) => e.data?.action === 'created');
  const scope = createdEntry?.data?.findingScope;
  if (!scope) return null;
  return LEGACY_SCOPE_LABELS[scope] ?? scope;
}

function targetLabel(f: Finding): string {
  if (f.task) return `Task: ${f.task.title}`;
  if (f.policy) return `Policy: ${f.policy.name}`;
  if (f.vendor) return `Vendor: ${f.vendor.name}`;
  if (f.risk) return `Risk: ${f.risk.title}`;
  if (f.member) return `Person: ${f.member.user.name ?? f.member.user.email}`;
  if (f.device) return `Device: ${f.device.name || f.device.hostname}`;
  if (f.evidenceSubmission) return `Document: ${f.evidenceSubmission.formType}`;
  if (f.evidenceFormType) return `Document: ${f.evidenceFormType}`;
  if (f.area === 'risks') return 'Risks (general)';
  if (f.area === 'vendors') return 'Vendors (general)';
  if (f.area === 'policies') return 'Policies (general)';
  if (f.area) return `Area: ${f.area}`;
  return 'Finding';
}

export function FindingDetailSheet({
  finding,
  organizationId,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: FindingDetailSheetProps) {
  const { hasPermission, roles } = usePermissions();
  const { data: session } = useSession();
  const canUpdate = hasPermission('finding', 'update');
  const canDelete = hasPermission('finding', 'delete');
  // Match the API's literal role check (`userRoles.includes('auditor')` in
  // findings.service.ts). A custom role granting `finding:create` does NOT
  // count as auditor on the server, so we can't proxy via permissions here.
  const isAuditor = roles.includes('auditor');
  const isPlatformAdmin = session?.user?.role === 'admin';
  // Only auditors can rewrite a finding's content; owners/admins can still
  // move the status forward but the audit narrative belongs to the auditor.
  const canEditContent = canUpdate && isAuditor;
  const { updateFinding, deleteFinding } = useFindingActions();
  const { data: historyData } = useFindingHistory(finding?.id ?? null);

  const [content, setContent] = useState('');
  const [status, setStatus] = useState<FindingStatus>(FindingStatus.open);
  const [severity, setSeverity] = useState<FindingSeverity>(FindingSeverity.medium);
  const [revisionNote, setRevisionNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (finding) {
      setContent(finding.content);
      setStatus(finding.status);
      setSeverity(finding.severity);
      setRevisionNote(finding.revisionNote ?? '');
    }
  }, [finding]);

  if (!finding) return null;

  const href = targetHref(finding, organizationId);
  const history: FindingHistoryEntry[] = Array.isArray(historyData?.data)
    ? historyData.data
    : [];
  const legacyScopeLabel = legacyScopeLabelFromHistory(history);

  const contentChanged = canEditContent && content !== finding.content;
  const isDirty =
    contentChanged ||
    status !== finding.status ||
    severity !== finding.severity ||
    (status === FindingStatus.needs_revision &&
      revisionNote !== (finding.revisionNote ?? ''));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateFinding(finding.id, {
        content: contentChanged ? content : undefined,
        status: status !== finding.status ? status : undefined,
        severity: severity !== finding.severity ? severity : undefined,
        revisionNote:
          status === FindingStatus.needs_revision
            ? revisionNote || null
            : undefined,
      });
      toast.success('Finding updated');
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update finding',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteFinding(finding.id);
      toast.success('Finding deleted');
      setConfirmDeleteOpen(false);
      onDeleted?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete finding',
      );
    } finally {
      setDeleting(false);
    }
  };

  const statusCfg = FINDING_STATUS_CONFIG[finding.status];
  const severityCfg = FINDING_SEVERITY_CONFIG[finding.severity];

  const handleCopyShareLink = async () => {
    if (typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}/${organizationId}/overview/findings?open=${finding.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied — share it with your team');
    } catch {
      toast.error('Could not copy link to clipboard');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Finding details</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <Stack gap="lg">
            <Stack gap="xs">
              <HStack justify="between" align="center">
                <HStack gap="xs" align="center">
                  <Badge variant="secondary">{severityCfg.label}</Badge>
                  <Badge variant="outline">{statusCfg.label}</Badge>
                </HStack>
                <Button
                  variant="ghost"
                  size="sm"
                  iconLeft={<Copy size={14} />}
                  onClick={handleCopyShareLink}
                >
                  Copy link
                </Button>
              </HStack>
              <Text size="sm" weight="medium">
                {targetLabel(finding)}
              </Text>
              {legacyScopeLabel && (
                <p className="text-xs text-muted-foreground">
                  Originally logged against{' '}
                  <span className="font-medium text-foreground">
                    {legacyScopeLabel}
                  </span>
                </p>
              )}
              {href && (
                <Link
                  href={href}
                  className="text-xs text-primary underline-offset-2 hover:underline"
                >
                  Open linked item →
                </Link>
              )}
            </Stack>

            <Stack gap="xs">
              <label className="text-sm font-medium">Content</label>
              {canEditContent ? (
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                />
              ) : (
                <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-sm text-balance">
                  {finding.content}
                </p>
              )}
            </Stack>

            <HStack gap="sm">
              <div className="flex-1"><Stack gap="xs">
                <label className="text-sm font-medium">Severity</label>
                <Select
                  value={severity}
                  onValueChange={(v) =>
                    v && setSeverity(v as FindingSeverity)
                  }
                  disabled={!canUpdate}
                >
                  <SelectTrigger>
                    {FINDING_SEVERITY_CONFIG[severity].label}
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {capitalize(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Stack></div>
              <div className="flex-1"><Stack gap="xs">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={status}
                  onValueChange={(v) => v && setStatus(v as FindingStatus)}
                  disabled={!canUpdate}
                >
                  <SelectTrigger>
                    {FINDING_STATUS_CONFIG[status].label}
                  </SelectTrigger>
                  <SelectContent>
                    {allowedStatusOptions({
                      current: status,
                      isAuditor,
                      isPlatformAdmin,
                    }).map((s) => (
                      <SelectItem key={s} value={s}>
                        {FINDING_STATUS_CONFIG[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Stack></div>
            </HStack>

            {status === FindingStatus.needs_revision && (
              <Stack gap="xs">
                <label className="text-sm font-medium">Revision note</label>
                <Textarea
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  rows={3}
                  placeholder="What needs to change?"
                  disabled={!canUpdate}
                />
              </Stack>
            )}

            <HStack justify="between">
              {canDelete ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={deleting}
                >
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <HStack gap="xs">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!canUpdate || !isDirty || saving}
                  loading={saving}
                  onClick={handleSave}
                >
                  Save
                </Button>
              </HStack>
            </HStack>

            <Stack gap="xs">
              <Text size="sm" weight="medium">
                Activity
              </Text>
              {history.length === 0 ? (
                <Text size="xs" variant="muted">
                  No activity recorded yet.
                </Text>
              ) : (
                <div className="divide-y divide-border rounded-md border border-border bg-muted/30">
                  {history.map((entry) => (
                    <div key={entry.id} className="p-3">
                      <p className="text-xs text-balance">
                        <strong>
                          {entry.user?.name || entry.user?.email || 'Someone'}
                        </strong>{' '}
                        {entry.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Stack>
          </Stack>
        </SheetBody>
      </SheetContent>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete finding?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the finding and its activity history.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}

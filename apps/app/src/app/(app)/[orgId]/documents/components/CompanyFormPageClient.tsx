'use client';

import { conciseFormDescriptions } from '@/app/(app)/[orgId]/documents/form-descriptions';
import {
  evidenceFormDefinitions,
  meetingSubTypeValues,
  meetingSubTypes,
  type EvidenceFormType,
  type MeetingSubType,
} from '@/app/(app)/[orgId]/documents/forms';
import { api } from '@/lib/api-client';
import { useActiveMember } from '@/utils/auth-client';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Field,
  FieldLabel,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  PageHeader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@trycompai/design-system';
import {
  Add,
  Catalog,
  Download,
  OverflowMenuVertical,
  Search,
  TrashCan,
  Upload,
} from '@trycompai/design-system/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@trycompai/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@trycompai/ui/select';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import useSWR, { useSWRConfig } from 'swr';
import { StatusBadge, formatSubmissionDate } from './submission-utils';

// ─── Types ───────────────────────────────────────────────────

type EvidenceSubmissionRow = {
  id: string;
  submittedAt: string;
  status: string;
  formType?: string;
  data: Record<string, unknown>;
  submittedBy?: {
    name: string | null;
    email: string;
  } | null;
};

type EvidenceFormResponse = {
  form: (typeof evidenceFormDefinitions)[EvidenceFormType];
  submissions: EvidenceSubmissionRow[];
  total: number;
};

const MEETING_SUB_TYPES = meetingSubTypeValues;

const MEETING_TYPE_LABELS: Record<string, string> = {
  'board-meeting': 'Board',
  'it-leadership-meeting': 'IT Leadership',
  'risk-committee-meeting': 'Risk Committee',
};

const submissionDateColumnWidth = 128;
const submittedByColumnWidth = 128;
const statusColumnWidth = 176;
const meetingTypeColumnWidth = 140;
const summaryColumnWidth = 280;
const actionsColumnWidth = 80;

// ─── Helpers ─────────────────────────────────────────────────

function truncate(str: string, max: number) {
  if (str.length <= max) return str;
  return `${str.slice(0, max)}…`;
}

function getMatrixRowCount(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value.filter((row) => row && typeof row === 'object').length;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function evidenceFormFetcher([endpoint, orgId]: readonly [
  string,
  string,
]): Promise<EvidenceFormResponse> {
  const response = await api.get<EvidenceFormResponse>(endpoint);
  if (response.error || !response.data) {
    throw new Error(response.error ?? 'Failed to load submissions');
  }
  return response.data;
}

// ─── Main Component ──────────────────────────────────────────

export function CompanyFormPageClient({
  organizationId,
  formType,
  isPlatformAdmin = false,
}: {
  organizationId: string;
  formType: EvidenceFormType;
  isPlatformAdmin?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'submissions';
  const { mutate: globalMutate } = useSWRConfig();
  const [search, setSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMeetingType, setSelectedMeetingType] = useState<MeetingSubType>('board-meeting');
  const [uploadSelectPortalRoot, setUploadSelectPortalRoot] = useState<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<EvidenceSubmissionRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: activeMember } = useActiveMember();
  const memberRoles = activeMember?.role?.split(',').map((role: string) => role.trim()) || [];
  const isAuditor = memberRoles.includes('auditor');
  const isAdminOrOwner = memberRoles.includes('admin') || memberRoles.includes('owner');

  const isMeeting = formType === 'meeting';
  const formDefinition = evidenceFormDefinitions[formType];
  const summaryField = formDefinition.fields.find((field) => field.type === 'textarea');
  const matrixSummaryField = formDefinition.fields.find((field) => field.type === 'matrix');
  const hasMatrixSummary = Boolean(matrixSummaryField);
  const showSummaryColumn = Boolean(summaryField) || hasMatrixSummary;

  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';

  const meetingSwrKeys = useMemo(
    () =>
      isMeeting
        ? MEETING_SUB_TYPES.map(
            (subType) => [`/v1/evidence-forms/${subType}${query}`, organizationId] as const,
          )
        : [],
    [isMeeting, query, organizationId],
  );

  const swrKey: readonly [string, string] | null = isMeeting
    ? null
    : [`/v1/evidence-forms/${formType}${query}`, organizationId];

  const { data: singleData, isLoading: singleLoading } = useSWR<EvidenceFormResponse>(
    swrKey,
    evidenceFormFetcher,
  );

  const { data: meetingData0, isLoading: ml0 } = useSWR<EvidenceFormResponse>(
    meetingSwrKeys[0] ?? null,
    evidenceFormFetcher,
  );
  const { data: meetingData1, isLoading: ml1 } = useSWR<EvidenceFormResponse>(
    meetingSwrKeys[1] ?? null,
    evidenceFormFetcher,
  );
  const { data: meetingData2, isLoading: ml2 } = useSWR<EvidenceFormResponse>(
    meetingSwrKeys[2] ?? null,
    evidenceFormFetcher,
  );

  const mergedMeetingSubmissions = useMemo(() => {
    if (!isMeeting) return [];
    const all: EvidenceSubmissionRow[] = [];
    const sources = [
      { data: meetingData0, subType: MEETING_SUB_TYPES[0] },
      { data: meetingData1, subType: MEETING_SUB_TYPES[1] },
      { data: meetingData2, subType: MEETING_SUB_TYPES[2] },
    ];
    for (const { data: d, subType } of sources) {
      if (!d) continue;
      for (const sub of d.submissions) {
        all.push({ ...sub, formType: subType });
      }
    }
    all.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return all;
  }, [isMeeting, meetingData0, meetingData1, meetingData2]);

  const data = isMeeting
    ? mergedMeetingSubmissions.length > 0 || meetingData0 || meetingData1 || meetingData2
      ? {
          form: formDefinition,
          submissions: mergedMeetingSubmissions,
          total: mergedMeetingSubmissions.length,
        }
      : undefined
    : singleData;

  const isLoading = isMeeting ? ml0 || ml1 || ml2 : singleLoading;

  const handleExportCsv = async () => {
    if (!data || data.total === 0) {
      toast.error('No submissions available to export');
      return;
    }

    setIsExporting(true);
    try {
      const exportTypes = isMeeting ? MEETING_SUB_TYPES : [formType];
      const results: { blob: Blob; exportType: string }[] = [];

      for (const exportType of exportTypes) {
        const response = await api.raw(
          `/v1/evidence-forms/${exportType}/export.csv`,
          { method: 'GET', organizationId },
        );

        if (response.status === 400) {
          continue;
        }

        if (!response.ok) {
          throw new Error(await response.text());
        }

        results.push({ blob: await response.blob(), exportType });
      }

      if (results.length === 0) {
        toast.error('No submissions available to export');
        return;
      }

      for (const { blob, exportType } of results) {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${exportType}-submissions.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'CSV export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleUploadEvidence = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const fileData = await fileToBase64(selectedFile);
      const submitFormType = isMeeting ? selectedMeetingType : formType;

      const response = await api.post(
        `/v1/evidence-forms/${submitFormType}/upload-submission`,
        {
          fileName: selectedFile.name,
          fileType: selectedFile.type || 'application/octet-stream',
          fileData,
        },
      );

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success('Evidence uploaded');
      setIsUploadOpen(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (isMeeting) {
        for (const subType of MEETING_SUB_TYPES) {
          globalMutate([`/v1/evidence-forms/${subType}${query}`, organizationId]);
        }
      } else {
        globalMutate([`/v1/evidence-forms/${formType}${query}`, organizationId]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, selectedMeetingType, isMeeting, formType, organizationId, query, globalMutate]);

  const handleConfirmDelete = useCallback(async () => {
    if (!submissionToDelete) return;

    const submissionFormType = (submissionToDelete.formType ?? formType) as EvidenceFormType;
    setIsDeleting(true);
    try {
      const response = await api.delete<{ success: boolean; id: string }>(
        `/v1/evidence-forms/${submissionFormType}/submissions/${submissionToDelete.id}`,
        organizationId,
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error ?? 'Failed to delete submission');
      }

      toast.success('Submission deleted');
      setDeleteDialogOpen(false);
      setSubmissionToDelete(null);

      if (isMeeting) {
        for (const subType of MEETING_SUB_TYPES) {
          globalMutate([`/v1/evidence-forms/${subType}${query}`, organizationId]);
        }
        for (const subType of MEETING_SUB_TYPES) {
          globalMutate([`/v1/findings?evidenceFormType=${subType}`, organizationId]);
        }
        globalMutate([`/v1/findings?evidenceFormType=meeting`, organizationId]);
      } else {
        globalMutate([`/v1/evidence-forms/${formType}${query}`, organizationId]);
        globalMutate([`/v1/findings?evidenceFormType=${formType}`, organizationId]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete submission');
    } finally {
      setIsDeleting(false);
    }
  }, [submissionToDelete, formType, isMeeting, organizationId, query, globalMutate]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={formDefinition.title}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/${organizationId}/documents/${formType}/new`}>
              <Button iconLeft={<Add size={16} />}>New Submission</Button>
            </Link>
            <Button
              type="button"
              variant="secondary"
              iconLeft={<Upload size={16} />}
              onClick={() => setIsUploadOpen(true)}
            >
              Upload Evidence
            </Button>
            <Button
              type="button"
              variant="secondary"
              iconLeft={<Download size={16} />}
              onClick={handleExportCsv}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        }
      />
      <div className="line-clamp-1">
        <Text variant="muted">
          {conciseFormDescriptions[formType] ?? formDefinition.description}
        </Text>
      </div>

      <Tabs defaultValue={defaultTab}>
        <Stack gap="lg">
          <TabsList variant="underline">
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
          </TabsList>

          <TabsContent value="submissions">
          <div className="space-y-3">
            <div className="w-full md:max-w-[300px]">
              <InputGroup>
                <InputGroupAddon>
                  <Search size={16} />
                </InputGroupAddon>
                <InputGroupInput
                  placeholder="Search submissions..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </InputGroup>
            </div>

            {!data || data.submissions.length === 0 ? (
              <Empty>
                <EmptyMedia variant="icon">
                  <Catalog />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No submissions yet</EmptyTitle>
                  <EmptyDescription>
                    Start by creating a new submission, click the New Submission button above.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table variant="bordered" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: submissionDateColumnWidth }} />
                  {isMeeting && <col style={{ width: meetingTypeColumnWidth }} />}
                  <col style={{ width: submittedByColumnWidth }} />
                  {formType === 'access-request' && <col style={{ width: statusColumnWidth }} />}
                  {showSummaryColumn && <col style={{ width: summaryColumnWidth }} />}
                  {isAdminOrOwner && <col style={{ width: actionsColumnWidth }} />}
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="whitespace-nowrap">Submission Date</div>
                    </TableHead>
                    {isMeeting && (
                      <TableHead>
                        <div className="whitespace-nowrap">Meeting Type</div>
                      </TableHead>
                    )}
                    <TableHead>
                      <div className="whitespace-nowrap">Submitted By</div>
                    </TableHead>
                    {formType === 'access-request' && (
                      <TableHead>
                        <div className="whitespace-nowrap">Status</div>
                      </TableHead>
                    )}
                    {showSummaryColumn && <TableHead>Summary</TableHead>}
                    {isAdminOrOwner && (
                      <TableHead>
                        <div className="whitespace-nowrap">Actions</div>
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.submissions.map((submission) => {
                    const summaryValue = summaryField
                      ? String(submission.data[summaryField.key] ?? '')
                      : '';
                    const matrixSummary = matrixSummaryField
                      ? `${getMatrixRowCount(submission.data[matrixSummaryField.key])} row(s)`
                      : '';
                    const rowSummary = summaryField ? truncate(summaryValue, 80) : matrixSummary;

                    const submissionFormType = submission.formType ?? formType;

                    return (
                      <TableRow
                        key={submission.id}
                        onClick={() =>
                          router.push(
                            `/${organizationId}/documents/${submissionFormType}/submissions/${submission.id}`,
                          )
                        }
                        style={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <div className="whitespace-nowrap">
                            {formatSubmissionDate(
                              submission.data.submissionDate,
                              submission.submittedAt,
                            )}
                          </div>
                        </TableCell>
                        {isMeeting && (
                          <TableCell>
                            <Badge variant="secondary">
                              {MEETING_TYPE_LABELS[submissionFormType] ?? submissionFormType}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell>
                          <span className="block truncate">
                            {submission.submittedBy?.name ?? submission.submittedBy?.email ?? 'Unknown'}
                          </span>
                        </TableCell>
                        {formType === 'access-request' && (
                          <TableCell>
                            <div>
                              <StatusBadge status={submission.status} />
                            </div>
                          </TableCell>
                        )}
                        {showSummaryColumn && (
                          <TableCell>
                            <span className="block truncate text-muted-foreground">
                              {rowSummary || '—'}
                            </span>
                          </TableCell>
                        )}
                        {isAdminOrOwner && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  variant="ellipsis"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <OverflowMenuVertical />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSubmissionToDelete(submission);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <TrashCan size={16} />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
          </TabsContent>

        </Stack>
      </Tabs>

      <Dialog
        open={isUploadOpen}
        onOpenChange={(open) => {
          setIsUploadOpen(open);
          if (!open) {
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Evidence</DialogTitle>
            <DialogDescription>
              Upload a PDF or image as evidence for this document.
            </DialogDescription>
          </DialogHeader>
          <div ref={setUploadSelectPortalRoot} className="min-w-0 space-y-4 overflow-visible">
            {isMeeting && (
              <Field>
                <div className="flex flex-row items-center gap-4">
                  <div className="shrink-0">
                    <FieldLabel htmlFor="upload-meeting-type">Meeting type</FieldLabel>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Select
                      value={selectedMeetingType}
                      onValueChange={(value) => setSelectedMeetingType(value as MeetingSubType)}
                    >
                      <SelectTrigger id="upload-meeting-type">
                        <SelectValue placeholder="Select meeting type">
                          {meetingSubTypes.find((m) => m.value === selectedMeetingType)?.label ??
                            'Select meeting type'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent container={uploadSelectPortalRoot}>
                        {meetingSubTypes.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Field>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-muted file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/80 file:cursor-pointer cursor-pointer"
            />
            {selectedFile && (
              <Text size="sm" variant="muted">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </Text>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsUploadOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUploadEvidence}
              disabled={!selectedFile || isUploading}
              loading={isUploading}
            >
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setSubmissionToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this submission? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              loading={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

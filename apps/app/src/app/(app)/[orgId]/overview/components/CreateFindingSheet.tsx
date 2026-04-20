'use client';

import { useApiSWR } from '@/hooks/use-api-swr';
import {
  DEFAULT_FINDING_TEMPLATES,
  FINDING_CATEGORY_LABELS,
  FINDING_TYPE_FRAMEWORK_OPTIONS,
  FINDING_TYPE_LABELS,
  useFindingActions,
  useFindingTemplates,
  type CreateFindingData,
  type FindingTemplate,
} from '@/hooks/use-findings-api';
import { usePermissions } from '@/hooks/use-permissions';
import { FindingArea, FindingSeverity, FindingType } from '@db';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@trycompai/ui/form';
import { useMediaQuery } from '@trycompai/ui/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  Input,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@trycompai/design-system';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type TargetKind =
  | 'task'
  | 'policy'
  | 'vendor'
  | 'risk'
  | 'member'
  | 'device'
  | 'evidenceFormType'
  | 'evidenceSubmission'
  | 'area';

const TARGET_OPTIONS: { value: TargetKind; label: string }[] = [
  { value: 'task', label: 'Task' },
  { value: 'policy', label: 'Policy' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'risk', label: 'Risk' },
  { value: 'member', label: 'Person' },
  { value: 'device', label: 'Device' },
  { value: 'evidenceFormType', label: 'Document type' },
  { value: 'evidenceSubmission', label: 'Evidence submission' },
  { value: 'area', label: 'Area' },
];

const AREA_OPTIONS: { value: FindingArea; label: string }[] = [
  { value: FindingArea.people, label: 'People' },
  { value: FindingArea.documents, label: 'Documents' },
  { value: FindingArea.compliance, label: 'Compliance' },
  { value: FindingArea.risks, label: 'Risks (general)' },
  { value: FindingArea.vendors, label: 'Vendors (general)' },
  { value: FindingArea.policies, label: 'Policies (general)' },
];

const createFindingSchema = z.object({
  targetKind: z.custom<TargetKind>(),
  targetId: z.string().optional(),
  type: z.nativeEnum(FindingType),
  severity: z.nativeEnum(FindingSeverity),
  templateId: z.string().nullable().optional(),
  content: z.string().min(1, 'Finding content is required'),
});

type FormValues = z.infer<typeof createFindingSchema>;

function capitalizeSeverity(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

interface CreateFindingSheetProps {
  organizationId: string;
  /** Pre-select a target (e.g. when opening from a specific page). */
  defaultTarget?: { kind: TargetKind; id?: string };
  /** Optional submit override (admin uses this to post to the admin org-scoped endpoint). */
  createFn?: (payload: CreateFindingData) => Promise<void>;
  /**
   * Optional override of the picker data endpoints. Used by the platform-admin
   * surface so the pickers fetch from `/v1/admin/organizations/<orgId>/...`
   * instead of the current session's org. A `null` override disables the
   * picker for that kind (e.g. when no admin endpoint exists).
   */
  endpointOverrides?: Partial<Record<TargetKind, string | null>>;
  /**
   * Target kinds to hide from the dropdown entirely. Used by the admin surface
   * to disable target types that have no admin-scoped data endpoint.
   */
  disabledTargetKinds?: TargetKind[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateFindingSheet({
  defaultTarget,
  createFn,
  endpointOverrides,
  disabledTargetKinds,
  open,
  onOpenChange,
  onSuccess,
}: CreateFindingSheetProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { hasPermission } = usePermissions();
  const canCreateFinding = hasPermission('finding', 'create');

  const { data: templatesData } = useFindingTemplates();
  const { createFinding } = useFindingActions();

  // Detect which frameworks the org has enabled so we can auto-select the
  // Framework dropdown when there's only one (common case: org has adopted
  // SOC 2 only).
  const { data: frameworksData } = useApiSWR<unknown>(
    '/v1/frameworks?includeScores=false',
    { refreshInterval: 0 },
  );
  const orgFrameworkTypes = useMemo<FindingType[]>(() => {
    const payload = (frameworksData as { data?: unknown })?.data;
    const list = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { data?: unknown })?.data)
        ? ((payload as { data: unknown[] }).data)
        : [];
    const types = new Set<FindingType>();
    for (const raw of list) {
      const item = raw as Record<string, unknown>;
      const fw = (item.framework ?? item) as { name?: unknown } | undefined;
      const name = typeof fw?.name === 'string' ? fw.name.toLowerCase() : '';
      if (name.includes('soc 2') || name.includes('soc2')) {
        types.add(FindingType.soc2);
      } else if (name.includes('27001') || name.includes('iso 27001')) {
        types.add(FindingType.iso27001);
      }
    }
    return Array.from(types);
  }, [frameworksData]);

  const form = useForm<FormValues>({
    resolver: zodResolver(createFindingSchema),
    defaultValues: {
      targetKind: defaultTarget?.kind ?? 'task',
      targetId: defaultTarget?.id ?? '',
      type: FindingType.soc2,
      severity: FindingSeverity.medium,
      templateId: null,
      content: '',
    },
  });

  // When the org has exactly one supported framework, default the Framework
  // dropdown to it so the auditor doesn't have to pick.
  useEffect(() => {
    if (orgFrameworkTypes.length === 1) {
      const only = orgFrameworkTypes[0]!;
      if (form.getValues('type') !== only) form.setValue('type', only);
    }
  }, [orgFrameworkTypes, form]);

  const targetKind = form.watch('targetKind');
  const selectedTemplateId = form.watch('templateId');

  const availableTargetOptions = useMemo(
    () =>
      disabledTargetKinds && disabledTargetKinds.length > 0
        ? TARGET_OPTIONS.filter((o) => !disabledTargetKinds.includes(o.value))
        : TARGET_OPTIONS,
    [disabledTargetKinds],
  );

  const apiTemplates: FindingTemplate[] = templatesData?.data || [];
  const templates: FindingTemplate[] =
    apiTemplates.length > 0 ? apiTemplates : DEFAULT_FINDING_TEMPLATES;

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return templates.find((t) => t.id === selectedTemplateId) ?? null;
  }, [selectedTemplateId, templates]);

  useEffect(() => {
    if (selectedTemplate) form.setValue('content', selectedTemplate.content);
  }, [selectedTemplate, form]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      setIsSubmitting(true);
      try {
        const payload: CreateFindingData = {
          type: values.type,
          severity: values.severity,
          content: values.content,
          templateId: values.templateId?.startsWith('default_')
            ? undefined
            : values.templateId ?? undefined,
        };

        const targetId = values.targetId?.trim();
        if (values.targetKind === 'area') {
          payload.area = (targetId as FindingArea) || FindingArea.people;
        } else if (values.targetKind === 'evidenceFormType') {
          payload.evidenceFormType = targetId as CreateFindingData['evidenceFormType'];
        } else if (values.targetKind === 'task' && targetId) payload.taskId = targetId;
        else if (values.targetKind === 'policy' && targetId) payload.policyId = targetId;
        else if (values.targetKind === 'vendor' && targetId) payload.vendorId = targetId;
        else if (values.targetKind === 'risk' && targetId) payload.riskId = targetId;
        else if (values.targetKind === 'member' && targetId) payload.memberId = targetId;
        else if (values.targetKind === 'device' && targetId) payload.deviceId = targetId;
        else if (values.targetKind === 'evidenceSubmission' && targetId)
          payload.evidenceSubmissionId = targetId;

        const hasTarget =
          payload.taskId ||
          payload.policyId ||
          payload.vendorId ||
          payload.riskId ||
          payload.memberId ||
          payload.deviceId ||
          payload.evidenceSubmissionId ||
          payload.evidenceFormType ||
          payload.area;

        if (!hasTarget) {
          toast.error('Please select a target for the finding');
          return;
        }

        if (createFn) {
          await createFn(payload);
        } else {
          await createFinding(payload);
        }
        toast.success('Finding created successfully');
        onOpenChange(false);
        form.reset();
        onSuccess?.();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to create finding',
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [createFinding, createFn, form, onOpenChange, onSuccess],
  );

  const groupedTemplates = useMemo<Record<string, FindingTemplate[]>>(() => {
    return templates.reduce<Record<string, FindingTemplate[]>>((acc, template) => {
      if (!acc[template.category]) acc[template.category] = [];
      acc[template.category].push(template);
      return acc;
    }, {});
  }, [templates]);

  const findingForm = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full max-w-none">
        <FormField
          control={form.control}
          name="targetKind"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Link this finding to</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value as TargetKind);
                  form.setValue('targetId', '');
                }}
              >
                <SelectTrigger>
                  {availableTargetOptions.find((o) => o.value === field.value)?.label}
                </SelectTrigger>
                <SelectContent>
                  {availableTargetOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <TargetPicker
          kind={targetKind}
          value={form.watch('targetId') ?? ''}
          onChange={(v) => form.setValue('targetId', v)}
          endpointOverrides={endpointOverrides}
        />

        <FormField
          control={form.control}
          name="severity"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Severity</FormLabel>
              <Select
                value={field.value}
                onValueChange={(v) => field.onChange(v as FindingSeverity)}
              >
                <SelectTrigger>
                  {capitalizeSeverity(field.value)}
                </SelectTrigger>
                <SelectContent>
                  {(['low', 'medium', 'high', 'critical'] as FindingSeverity[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {capitalizeSeverity(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Framework</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>{FINDING_TYPE_LABELS[field.value as FindingType]}</SelectTrigger>
                <SelectContent>
                  {FINDING_TYPE_FRAMEWORK_OPTIONS.map(({ value, label }) => (
                    <SelectItem
                      key={value}
                      value={value}
                      disabled={!(value in FINDING_TYPE_LABELS)}
                    >
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="templateId"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Finding Template (Optional)</FormLabel>
              <Select
                value={field.value || 'none'}
                onValueChange={(value) => {
                  if (!value || value === 'none') {
                    field.onChange(null);
                    form.setValue('content', '');
                  } else {
                    field.onChange(value);
                  }
                }}
              >
                <SelectTrigger>
                  <span className="block max-w-full truncate text-left">
                    {selectedTemplate ? selectedTemplate.title : 'Select a template...'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template — custom finding</SelectItem>
                  {Object.entries(groupedTemplates).map(([category, tpls]) => (
                    <SelectGroup key={category}>
                      <SelectLabel>
                        {FINDING_CATEGORY_LABELS[category] || category}
                      </SelectLabel>
                      {tpls.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.title}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Finding Details</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Describe the finding in detail..." rows={6} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting || !canCreateFinding} loading={isSubmitting}>
            Create Finding
          </Button>
        </div>
      </form>
    </Form>
  );

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create Finding</SheetTitle>
          </SheetHeader>
          <SheetBody>{findingForm}</SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Create Finding</DrawerTitle>
        </DrawerHeader>
        <div className="p-4">{findingForm}</div>
      </DrawerContent>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Target pickers — one per kind. Lightweight free-text + type-ahead via SWR.
// ---------------------------------------------------------------------------

type Option = { id: string; label: string };

function TargetPicker({
  kind,
  value,
  onChange,
  endpointOverrides,
}: {
  kind: TargetKind;
  value: string;
  onChange: (value: string) => void;
  endpointOverrides?: Partial<Record<TargetKind, string | null>>;
}) {
  if (kind === 'area') {
    return (
      <div className="w-full">
        <label className="text-sm font-medium">Area</label>
        <Select
          value={value || FindingArea.people}
          onValueChange={(v) => onChange(v ?? '')}
        >
          <SelectTrigger>
            {AREA_OPTIONS.find((a) => a.value === (value || FindingArea.people))?.label}
          </SelectTrigger>
          <SelectContent>
            {AREA_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <EntityPicker
      kind={kind}
      value={value}
      onChange={onChange}
      endpointOverrides={endpointOverrides}
    />
  );
}

function EntityPicker({
  kind,
  value,
  onChange,
  endpointOverrides,
}: {
  kind: Exclude<TargetKind, 'area'>;
  value: string;
  onChange: (value: string) => void;
  endpointOverrides?: Partial<Record<TargetKind, string | null>>;
}) {
  const endpoint = useMemo(() => {
    if (kind === 'evidenceSubmission') return null;
    // An explicit override (including `null`) wins over the default. `null`
    // means "no admin endpoint exists for this kind", so skip fetching.
    if (endpointOverrides && kind in endpointOverrides) {
      return endpointOverrides[kind] ?? null;
    }
    return endpointForKind(kind);
  }, [kind, endpointOverrides]);
  const { data } = useApiSWR<unknown>(endpoint, { refreshInterval: 0 });
  const options = useMemo<Option[]>(
    () => extractOptions(kind, data),
    [kind, data],
  );

  if (kind === 'evidenceSubmission') {
    return (
      <div className="w-full">
        <label className="text-sm font-medium">Evidence submission ID</label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="evs_..."
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <label className="text-sm font-medium">Select {labelForKind(kind)}</label>
      <Select value={value} onValueChange={(v) => onChange(v ?? '')}>
        <SelectTrigger>
          <span className="block max-w-full truncate text-left">
            {options.find((o) => o.id === value)?.label ?? `Select…`}
          </span>
        </SelectTrigger>
        <SelectContent>
          {options.length === 0 && <SelectItem value="__none" disabled>No options</SelectItem>}
          {options.map((opt) => (
            <SelectItem key={opt.id} value={opt.id}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function endpointForKind(kind: Exclude<TargetKind, 'area' | 'evidenceSubmission'>): string | null {
  switch (kind) {
    case 'task':
      return '/v1/tasks';
    case 'policy':
      return '/v1/policies';
    case 'vendor':
      return '/v1/vendors';
    case 'risk':
      return '/v1/risks';
    case 'member':
      return '/v1/people';
    case 'device':
      return '/v1/devices';
    case 'evidenceFormType':
      return '/v1/evidence-forms';
    default:
      return null;
  }
}

function extractOptions(
  kind: Exclude<TargetKind, 'area'>,
  data: unknown,
): Option[] {
  if (!data) return [];
  // `useApiSWR` wraps responses as { data: T }. Different endpoints return
  // T as either an array, a { data: [...] } envelope, or a { data: { data: [...] } }
  // double-envelope. Normalise all three here.
  const payload = (data as { data?: unknown }).data;
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown })?.data)
      ? ((payload as { data: unknown[] }).data)
      : Array.isArray(
            ((payload as { data?: { data?: unknown } })?.data as { data?: unknown })?.data,
          )
        ? (
            (payload as { data: { data: unknown[] } }).data.data
          )
        : [];

  return list
    .map((raw): Option | null => {
      const item = raw as Record<string, unknown>;

      // Document types use `type` as the ID (matches Finding.evidenceFormType).
      if (kind === 'evidenceFormType') {
        const type = typeof item.type === 'string' ? item.type : null;
        if (!type) return null;
        const title =
          (typeof item.title === 'string' && item.title) || type;
        return { id: type, label: title };
      }

      const id = typeof item.id === 'string' ? item.id : null;
      if (!id) return null;

      if (kind === 'member') {
        const user = item.user as
          | { name?: string; email?: string }
          | undefined;
        return { id, label: user?.name || user?.email || id };
      }

      const label =
        (typeof item.name === 'string' && item.name) ||
        (typeof item.title === 'string' && item.title) ||
        (typeof item.hostname === 'string' && item.hostname) ||
        id;
      return { id, label: String(label) };
    })
    .filter((x): x is Option => x !== null);
}

function labelForKind(kind: Exclude<TargetKind, 'area' | 'evidenceSubmission'>): string {
  switch (kind) {
    case 'task':
      return 'task';
    case 'policy':
      return 'policy';
    case 'vendor':
      return 'vendor';
    case 'risk':
      return 'risk';
    case 'member':
      return 'person';
    case 'device':
      return 'device';
    case 'evidenceFormType':
      return 'document type';
  }
}

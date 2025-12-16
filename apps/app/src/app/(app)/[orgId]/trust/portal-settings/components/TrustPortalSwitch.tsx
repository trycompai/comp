'use client';

import { api } from '@/lib/api-client';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@comp/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comp/ui/tooltip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Switch } from '@comp/ui/switch';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink, FileText, Upload, Download, Eye, FileCheck2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { isFriendlyAvailable } from '../actions/is-friendly-available';
import { trustPortalSwitchAction } from '../actions/trust-portal-switch';
import { updateTrustPortalFrameworks } from '../actions/update-trust-portal-frameworks';
import {
  GDPR,
  HIPAA,
  ISO27001,
  ISO42001,
  ISO9001,
  NEN7510,
  PCIDSS,
  SOC2Type1,
  SOC2Type2,
} from './logos';

// Client-side form schema (includes all fields for form state)
const trustPortalSwitchSchema = z.object({
  enabled: z.boolean(),
  contactEmail: z.string().email().or(z.literal('')).optional(),
  primaryColor: z.string().optional(),
  friendlyUrl: z.string().optional(),
  soc2type1: z.boolean(),
  soc2type2: z.boolean(),
  iso27001: z.boolean(),
  iso42001: z.boolean(),
  gdpr: z.boolean(),
  hipaa: z.boolean(),
  pcidss: z.boolean(),
  nen7510: z.boolean(),
  iso9001: z.boolean(),
  soc2type1Status: z.enum(['started', 'in_progress', 'compliant']),
  soc2type2Status: z.enum(['started', 'in_progress', 'compliant']),
  iso27001Status: z.enum(['started', 'in_progress', 'compliant']),
  iso42001Status: z.enum(['started', 'in_progress', 'compliant']),
  gdprStatus: z.enum(['started', 'in_progress', 'compliant']),
  hipaaStatus: z.enum(['started', 'in_progress', 'compliant']),
  pcidssStatus: z.enum(['started', 'in_progress', 'compliant']),
  nen7510Status: z.enum(['started', 'in_progress', 'compliant']),
  iso9001Status: z.enum(['started', 'in_progress', 'compliant']),
});

// Server action input schema (only fields that the server accepts)
type TrustPortalSwitchActionInput = {
  enabled: boolean;
  contactEmail?: string | '';
  primaryColor?: string;
  friendlyUrl?: string;
};

const FRAMEWORK_KEY_TO_API_SLUG: Record<string, string> = {
  iso27001: 'iso_27001',
  iso42001: 'iso_42001',
  gdpr: 'gdpr',
  hipaa: 'hipaa',
  soc2type1: 'soc2_type1',
  soc2type2: 'soc2_type2',
  pcidss: 'pci_dss',
  nen7510: 'nen_7510',
  iso9001: 'iso_9001',
};

interface ComplianceResourceResponse {
  framework: string;
  fileName: string;
  fileSize: number;
  updatedAt: string;
}

interface ComplianceResourceUrlResponse {
  signedUrl: string;
  fileName: string;
  fileSize: number;
}

export function TrustPortalSwitch({
  enabled,
  slug,
  domainVerified,
  domain,
  contactEmail,
  primaryColor,
  orgId,
  soc2type1,
  soc2type2,
  iso27001,
  iso42001,
  gdpr,
  hipaa,
  pcidss,
  soc2type1Status,
  soc2type2Status,
  iso27001Status,
  iso42001Status,
  gdprStatus,
  hipaaStatus,
  pcidssStatus,
  nen7510,
  nen7510Status,
  iso9001,
  iso9001Status,
  friendlyUrl,
  // File props - will be passed from page.tsx later
  iso27001FileName,
  iso42001FileName,
  gdprFileName,
  hipaaFileName,
  soc2type1FileName,
  soc2type2FileName,
  pcidssFileName,
  nen7510FileName,
  iso9001FileName,
}: {
  enabled: boolean;
  slug: string;
  domainVerified: boolean;
  domain: string;
  contactEmail: string | null;
  primaryColor: string | null;
  orgId: string;
  soc2type1: boolean;
  soc2type2: boolean;
  iso27001: boolean;
  iso42001: boolean;
  gdpr: boolean;
  hipaa: boolean;
  pcidss: boolean;
  nen7510: boolean;
  soc2type1Status: 'started' | 'in_progress' | 'compliant';
  soc2type2Status: 'started' | 'in_progress' | 'compliant';
  iso27001Status: 'started' | 'in_progress' | 'compliant';
  iso42001Status: 'started' | 'in_progress' | 'compliant';
  gdprStatus: 'started' | 'in_progress' | 'compliant';
  hipaaStatus: 'started' | 'in_progress' | 'compliant';
  pcidssStatus: 'started' | 'in_progress' | 'compliant';
  nen7510Status: 'started' | 'in_progress' | 'compliant';
  iso9001: boolean;
  iso9001Status: 'started' | 'in_progress' | 'compliant';
  friendlyUrl: string | null;
  iso27001FileName?: string | null;
  iso42001FileName?: string | null;
  gdprFileName?: string | null;
  hipaaFileName?: string | null;
  soc2type1FileName?: string | null;
  soc2type2FileName?: string | null;
  pcidssFileName?: string | null;
  nen7510FileName?: string | null;
  iso9001FileName?: string | null;
}) {
  const [certificateFiles, setCertificateFiles] = useState<Record<string, string | null>>({
    iso27001: iso27001FileName ?? null,
    iso42001: iso42001FileName ?? null,
    gdpr: gdprFileName ?? null,
    hipaa: hipaaFileName ?? null,
    soc2type1: soc2type1FileName ?? null,
    soc2type2: soc2type2FileName ?? null,
    pcidss: pcidssFileName ?? null,
    nen7510: nen7510FileName ?? null,
    iso9001: iso9001FileName ?? null,
  });

  useEffect(() => {
    setCertificateFiles({
      iso27001: iso27001FileName ?? null,
      iso42001: iso42001FileName ?? null,
      gdpr: gdprFileName ?? null,
      hipaa: hipaaFileName ?? null,
      soc2type1: soc2type1FileName ?? null,
      soc2type2: soc2type2FileName ?? null,
      pcidss: pcidssFileName ?? null,
      nen7510: nen7510FileName ?? null,
      iso9001: iso9001FileName ?? null,
    });
  }, [
    iso27001FileName,
    iso42001FileName,
    gdprFileName,
    hipaaFileName,
    soc2type1FileName,
    soc2type2FileName,
    pcidssFileName,
    nen7510FileName,
    iso9001FileName,
  ]);

  const convertFileToBase64 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };

  const handleFileUpload = async (file: File, frameworkKey: string) => {
    const apiFramework = FRAMEWORK_KEY_TO_API_SLUG[frameworkKey];
    if (!apiFramework) {
      throw new Error('Unsupported framework');
    }

    const fileData = await convertFileToBase64(file);
    const response = await api.post<ComplianceResourceResponse>(
      '/v1/trust-portal/compliance-resources/upload',
      {
        organizationId: orgId,
        framework: apiFramework,
        fileName: file.name,
        fileType: file.type || 'application/pdf',
        fileData,
      },
      orgId,
    );

    if (response.error) {
      throw new Error(response.error);
    }

    const payload = response.data;
    if (!payload) {
      throw new Error('Unexpected API response');
    }

    setCertificateFiles((prev) => ({
      ...prev,
      [frameworkKey]: payload.fileName,
    }));
  };

  const handleFilePreview = async (frameworkKey: string) => {
    const apiFramework = FRAMEWORK_KEY_TO_API_SLUG[frameworkKey];
    if (!apiFramework) {
      throw new Error('Unsupported framework');
    }
    if (!certificateFiles[frameworkKey]) {
      throw new Error('No certificate uploaded yet');
    }

    const response = await api.post<ComplianceResourceUrlResponse>(
      '/v1/trust-portal/compliance-resources/signed-url',
      {
        organizationId: orgId,
        framework: apiFramework,
      },
      orgId,
    );

    if (response.error) {
      throw new Error(response.error);
    }

    const payload = response.data;
    if (!payload?.signedUrl) {
      throw new Error('Preview link unavailable');
    }

    window.open(payload.signedUrl, '_blank', 'noopener,noreferrer');
  };
  const trustPortalSwitch = useAction(trustPortalSwitchAction, {
    onSuccess: () => {
      toast.success('Trust portal status updated');
    },
    onError: () => {
      toast.error('Failed to update trust portal status');
    },
  });

  // Use ref to store latest trustPortalSwitch to avoid stale closures
  const trustPortalSwitchRef = useRef(trustPortalSwitch);
  trustPortalSwitchRef.current = trustPortalSwitch;

  const checkFriendlyUrl = useAction(isFriendlyAvailable);

  const form = useForm<z.infer<typeof trustPortalSwitchSchema>>({
    resolver: zodResolver(trustPortalSwitchSchema),
    defaultValues: {
      enabled: enabled,
      contactEmail: contactEmail ?? undefined,
      primaryColor: primaryColor ?? undefined,
      soc2type1: soc2type1 ?? false,
      soc2type2: soc2type2 ?? false,
      iso27001: iso27001 ?? false,
      iso42001: iso42001 ?? false,
      gdpr: gdpr ?? false,
      hipaa: hipaa ?? false,
      pcidss: pcidss ?? false,
      nen7510: nen7510 ?? false,
      iso9001: iso9001 ?? false,
      soc2type1Status: soc2type1Status ?? 'started',
      soc2type2Status: soc2type2Status ?? 'started',
      iso27001Status: iso27001Status ?? 'started',
      iso42001Status: iso42001Status ?? 'started',
      gdprStatus: gdprStatus ?? 'started',
      hipaaStatus: hipaaStatus ?? 'started',
      pcidssStatus: pcidssStatus ?? 'started',
      nen7510Status: nen7510Status ?? 'started',
      iso9001Status: iso9001Status ?? 'started',
      friendlyUrl: friendlyUrl ?? undefined,
    },
  });

  const onSubmit = useCallback(
    async (data: TrustPortalSwitchActionInput) => {
      await trustPortalSwitchRef.current.execute(data);
    },
    [], // Safe to use empty array because we use ref
  );

  const portalUrl = domainVerified ? `https://${domain}` : `https://trust.inc/${slug}`;

  const lastSaved = useRef<{ [key: string]: string | boolean | null }>({
    contactEmail: contactEmail ?? '',
    friendlyUrl: friendlyUrl ?? '',
    enabled: enabled,
    primaryColor: primaryColor ?? null,
  });

  const savingRef = useRef<{ [key: string]: boolean }>({
    contactEmail: false,
    friendlyUrl: false,
    enabled: false,
    primaryColor: false,
  });

  const autoSave = useCallback(
    async (field: string, value: any) => {
      // Prevent concurrent saves for the same field
      if (savingRef.current[field]) {
        return;
      }

      const current = form.getValues();
      if (lastSaved.current[field] !== value) {
        savingRef.current[field] = true;
        try {
          // Only send fields that trustPortalSwitchAction accepts
          // Server schema accepts: enabled, contactEmail, friendlyUrl, primaryColor
          const data: TrustPortalSwitchActionInput = {
            enabled: field === 'enabled' ? value : current.enabled,
            contactEmail: field === 'contactEmail' ? value : current.contactEmail ?? '',
            friendlyUrl: field === 'friendlyUrl' ? value : current.friendlyUrl ?? undefined,
            primaryColor: field === 'primaryColor' ? value : current.primaryColor ?? undefined,
          };
          await onSubmit(data);
          lastSaved.current[field] = value;
        } finally {
          savingRef.current[field] = false;
        }
      }
    },
    [form, onSubmit],
  );

  const [contactEmailValue, setContactEmailValue] = useState(form.getValues('contactEmail') || '');
  const debouncedContactEmail = useDebounce(contactEmailValue, 800);

  const [primaryColorValue, setPrimaryColorValue] = useState(form.getValues('primaryColor') || '');
  const debouncedPrimaryColor = useDebounce(primaryColorValue, 800);

  useEffect(() => {
    if (
      debouncedContactEmail !== undefined &&
      debouncedContactEmail !== lastSaved.current.contactEmail &&
      !savingRef.current.contactEmail
    ) {
      form.setValue('contactEmail', debouncedContactEmail);
      void autoSave('contactEmail', debouncedContactEmail);
    }
  }, [debouncedContactEmail, autoSave, form]);

  useEffect(() => {
    if (
      debouncedPrimaryColor !== undefined &&
      debouncedPrimaryColor !== lastSaved.current.primaryColor &&
      !savingRef.current.primaryColor
    ) {
      form.setValue('primaryColor', debouncedPrimaryColor || undefined);
      void autoSave('primaryColor', debouncedPrimaryColor || null);
    }
  }, [debouncedPrimaryColor, autoSave, form]);

  const handleContactEmailBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const value = e.target.value;
      form.setValue('contactEmail', value);
      autoSave('contactEmail', value);
    },
    [form, autoSave],
  );

  const handlePrimaryColorBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value) {
        form.setValue('primaryColor', value);
      }
      void autoSave('primaryColor', value || null);
    },
    [form, autoSave],
  );

  const [friendlyUrlValue, setFriendlyUrlValue] = useState(form.getValues('friendlyUrl') || '');
  const debouncedFriendlyUrl = useDebounce(friendlyUrlValue, 700);
  const [friendlyUrlStatus, setFriendlyUrlStatus] = useState<
    'idle' | 'checking' | 'available' | 'unavailable'
  >('idle');
  const lastCheckedUrlRef = useRef<string>('');
  const processingResultRef = useRef<string>('');

  useEffect(() => {
    if (!debouncedFriendlyUrl || debouncedFriendlyUrl === (friendlyUrl ?? '')) {
      setFriendlyUrlStatus('idle');
      lastCheckedUrlRef.current = '';
      processingResultRef.current = '';
      return;
    }
    
    // Only check if we haven't already checked this exact value
    if (lastCheckedUrlRef.current === debouncedFriendlyUrl) {
      return;
    }
    
    lastCheckedUrlRef.current = debouncedFriendlyUrl;
    processingResultRef.current = '';
    setFriendlyUrlStatus('checking');
    checkFriendlyUrl.execute({ friendlyUrl: debouncedFriendlyUrl, orgId });
  }, [debouncedFriendlyUrl, orgId, friendlyUrl]);
  
  useEffect(() => {
    if (checkFriendlyUrl.status === 'executing') return;
    
    const result = checkFriendlyUrl.result?.data;
    const checkedUrl = lastCheckedUrlRef.current;
    
    // Only process if this result matches the currently checked URL
    if (checkedUrl !== debouncedFriendlyUrl || !checkedUrl) {
      return;
    }
    
    // Prevent processing the same result multiple times
    if (processingResultRef.current === checkedUrl) {
      return;
    }
    
    if (result?.isAvailable === true) {
      setFriendlyUrlStatus('available');
      processingResultRef.current = checkedUrl;

      if (
        debouncedFriendlyUrl !== lastSaved.current.friendlyUrl &&
        !savingRef.current.friendlyUrl
      ) {
        form.setValue('friendlyUrl', debouncedFriendlyUrl);
        void autoSave('friendlyUrl', debouncedFriendlyUrl);
      }
    } else if (result?.isAvailable === false) {
      setFriendlyUrlStatus('unavailable');
      processingResultRef.current = checkedUrl;
    }
  }, [checkFriendlyUrl.status, checkFriendlyUrl.result, debouncedFriendlyUrl, form, autoSave]);

  const handleFriendlyUrlBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (friendlyUrlStatus === 'available' && value !== lastSaved.current.friendlyUrl) {
        form.setValue('friendlyUrl', value);
        autoSave('friendlyUrl', value);
      }
    },
    [form, autoSave, friendlyUrlStatus],
  );

  const handleEnabledChange = useCallback(
    (val: boolean) => {
      form.setValue('enabled', val);
      autoSave('enabled', val);
    },
    [form, autoSave],
  );

  return (
    <Form {...form}>
      <form className="space-y-4">
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4">
            <div className="space-y-1">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <Link
                  href={portalUrl}
                  target="_blank"
                  className="text-primary hover:underline flex items-center gap-2"
                >
                  Trust Portal
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </h2>
              <p className="text-muted-foreground text-sm">
                Create a public trust portal for your organization.
              </p>
            </div>
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center space-y-0 space-x-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={handleEnabledChange}
                      disabled={trustPortalSwitch.status === 'executing'}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-6">
            {form.watch('enabled') && (
              <div className="pt-2">
                <h3 className="mb-4 text-sm font-medium">Trust Portal Settings</h3>
                <div className="grid grid-cols-1 gap-x-4 lg:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="friendlyUrl"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Custom URL</FormLabel>
                        <FormControl>
                          <div>
                            <div className="relative flex w-full items-center">
                              <Input
                                {...field}
                                value={friendlyUrlValue}
                                onChange={(e) => {
                                  field.onChange(e);
                                  setFriendlyUrlValue(e.target.value);
                                }}
                                onBlur={handleFriendlyUrlBlur}
                                placeholder="my-org"
                                autoComplete="off"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck="false"
                                prefix="trust.inc/"
                              />
                            </div>
                            {friendlyUrlValue && (
                              <div className="mt-1 min-h-[18px] text-xs">
                                {friendlyUrlStatus === 'checking' && 'Checking availability...'}
                                {friendlyUrlStatus === 'available' && (
                                  <span className="text-green-600">{'This URL is available!'}</span>
                                )}
                                {friendlyUrlStatus === 'unavailable' && (
                                  <span className="text-red-600">
                                    {'This URL is already taken.'}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={contactEmailValue}
                            onChange={(e) => {
                              field.onChange(e);
                              setContactEmailValue(e.target.value);
                            }}
                            onBlur={handleContactEmailBlur}
                            placeholder="contact@example.com"
                            className="w-auto"
                            autoComplete="off"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck="false"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                    <FormField
                      control={form.control}
                      name="primaryColor"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel>Brand Color</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <div className="flex items-center gap-2">
                                {/* Color Swatch */}
                                <div className="relative">
                                  <input
                                    {...field}
                                    value={primaryColorValue ?? '#000000'}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      setPrimaryColorValue(e.target.value);
                                    }}
                                    onBlur={handlePrimaryColorBlur}
                                    type="color"
                                    className="sr-only"
                                    id="color-picker"
                                  />
                                  <label
                                    htmlFor="color-picker"
                                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-2 border-border shadow-sm transition-all hover:scale-105 hover:shadow-md"
                                    style={{ backgroundColor: primaryColorValue || '#000000' }}
                                  >
                                    <span className="sr-only">Pick a color</span>
                                  </label>
                                </div>
                                {/* Hex Input */}
                                <div className="flex-1">
                                  <Input
                                    value={primaryColorValue?.toUpperCase() || '#000000'}
                                    onChange={(e) => {
                                      let value = e.target.value;
                                      if (!value.startsWith('#')) {
                                        value = '#' + value;
                                      }
                                      field.onChange(value);
                                      setPrimaryColorValue(value);
                                    }}
                                    onBlur={handlePrimaryColorBlur}
                                    placeholder="#000000"
                                    className="font-mono text-sm"
                                    maxLength={7}
                                  />
                                </div>
                              </div>
                              <p className="mt-1.5 text-xs text-muted-foreground">
                                Used for branding across your trust portal
                              </p>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                </div>
              </div>
            )}
            {form.watch('enabled') && (
              <div className="">
                {/* Compliance Frameworks Section */}
                <div>
                  <h3 className="mb-2 text-sm font-medium">Compliance Frameworks</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Share the frameworks your organization is compliant with or working towards.
                  </p>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {/* ISO 27001 */}
                    <ComplianceFramework
                      title="ISO 27001"
                      description="An international standard for managing information security systems."
                      isEnabled={iso27001}
                      status={iso27001Status}
                      onStatusChange={async (value) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            iso27001Status: value as 'started' | 'in_progress' | 'compliant',
                          });
                          toast.success('ISO 27001 status updated');
                        } catch (error) {
                          toast.error('Failed to update ISO 27001 status');
                        }
                      }}
                      onToggle={async (checked) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            iso27001: checked,
                          });
                          toast.success('ISO 27001 status updated');
                        } catch (error) {
                          toast.error('Failed to update ISO 27001 status');
                        }
                      }}
                      fileName={certificateFiles.iso27001}
                      onFileUpload={handleFileUpload}
                      onFilePreview={handleFilePreview}
                      frameworkKey="iso27001"
                      orgId={orgId}
                    />
                    {/* ISO 42001 */}
                    <ComplianceFramework
                      title="ISO 42001"
                      description="An international standard for an Artificial Intelligence Management System."
                      isEnabled={iso42001}
                      status={iso42001Status}
                      onStatusChange={async (value) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            iso42001Status: value as 'started' | 'in_progress' | 'compliant',
                          });
                          toast.success('ISO 42001 status updated');
                        } catch (error) {
                          toast.error('Failed to update ISO 42001 status');
                        }
                      }}
                      onToggle={async (checked) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            iso42001: checked,
                          });
                          toast.success('ISO 42001 status updated');
                        } catch (error) {
                          toast.error('Failed to update ISO 42001 status');
                        }
                      }}
                      fileName={certificateFiles.iso42001}
                      onFileUpload={handleFileUpload}
                      onFilePreview={handleFilePreview}
                      frameworkKey="iso42001"
                      orgId={orgId}
                    />
                    {/* GDPR */}
                    <ComplianceFramework
                      title="GDPR"
                      description="A European regulation that governs personal data protection and user privacy."
                      isEnabled={gdpr}
                      status={gdprStatus}
                      onStatusChange={async (value) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            gdprStatus: value as 'started' | 'in_progress' | 'compliant',
                          });
                          toast.success('GDPR status updated');
                        } catch (error) {
                          toast.error('Failed to update GDPR status');
                        }
                      }}
                      onToggle={async (checked) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            gdpr: checked,
                          });
                          toast.success('GDPR status updated');
                        } catch (error) {
                          toast.error('Failed to update GDPR status');
                        }
                      }}
                      fileName={certificateFiles.gdpr}
                      onFileUpload={handleFileUpload}
                      onFilePreview={handleFilePreview}
                      frameworkKey="gdpr"
                      orgId={orgId}
                    />
                    {/* HIPAA */}
                    <ComplianceFramework
                      title="HIPAA"
                      description="A US regulation that protects sensitive patient health information and medical data."
                      isEnabled={hipaa}
                      status={hipaaStatus}
                      onStatusChange={async (value) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            hipaaStatus: value as 'started' | 'in_progress' | 'compliant',
                          });
                          toast.success('HIPAA status updated');
                        } catch (error) {
                          toast.error('Failed to update HIPAA status');
                        }
                      }}
                      onToggle={async (checked) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            hipaa: checked,
                          });
                          toast.success('HIPAA status updated');
                        } catch (error) {
                          toast.error('Failed to update HIPAA status');
                        }
                      }}
                      fileName={certificateFiles.hipaa}
                      onFileUpload={handleFileUpload}
                      onFilePreview={handleFilePreview}
                      frameworkKey="hipaa"
                      orgId={orgId}
                    />
                    {/* SOC 2 Type 1*/}
                    <ComplianceFramework
                      title="SOC 2 Type 1"
                      description="A compliance framework focused on data security, availability, and confidentiality."
                      isEnabled={soc2type1}
                      status={soc2type1Status}
                      onStatusChange={async (value) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            soc2type1Status: value as 'started' | 'in_progress' | 'compliant',
                          });
                          toast.success('SOC 2 Type 1 status updated');
                        } catch (error) {
                          toast.error('Failed to update SOC 2 Type 1 status');
                        }
                      }}
                      onToggle={async (checked) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            soc2type1: checked,
                          });
                          toast.success('SOC 2 Type 1 status updated');
                        } catch (error) {
                          toast.error('Failed to update SOC 2 Type 1 status');
                        }
                      }}
                      fileName={certificateFiles.soc2type1}
                      onFileUpload={handleFileUpload}
                      onFilePreview={handleFilePreview}
                      frameworkKey="soc2type1"
                      orgId={orgId}
                    />
                    {/* SOC 2 Type 2*/}
                    <ComplianceFramework
                      title="SOC 2 Type 2"
                      description="A compliance framework focused on data security, availability, and confidentiality."
                      isEnabled={soc2type2}
                      status={soc2type2Status}
                      onStatusChange={async (value) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            soc2type2Status: value as 'started' | 'in_progress' | 'compliant',
                          });
                          toast.success('SOC 2 Type 2 status updated');
                        } catch (error) {
                          toast.error('Failed to update SOC 2 Type 2 status');
                        }
                      }}
                      onToggle={async (checked) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            soc2type2: checked,
                          });
                          toast.success('SOC 2 Type 2 status updated');
                        } catch (error) {
                          toast.error('Failed to update SOC 2 Type 2 status');
                        }
                      }}
                      fileName={certificateFiles.soc2type2}
                      onFileUpload={handleFileUpload}
                      onFilePreview={handleFilePreview}
                      frameworkKey="soc2type2"
                      orgId={orgId}
                    />
                    {/* PCI DSS */}
                    <ComplianceFramework
                      title="PCI DSS"
                      description="A compliance framework focused on data security, availability, and confidentiality."
                      isEnabled={pcidss}
                      status={pcidssStatus}
                      onStatusChange={async (value) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            pcidssStatus: value as 'started' | 'in_progress' | 'compliant',
                          });
                          toast.success('PCI DSS status updated');
                        } catch (error) {
                          toast.error('Failed to update PCI DSS status');
                        }
                      }}
                      onToggle={async (checked) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            pcidss: checked,
                          });
                          toast.success('PCI DSS status updated');
                        } catch (error) {
                          toast.error('Failed to update PCI DSS status');
                        }
                      }}
                      fileName={certificateFiles.pcidss}
                      onFileUpload={handleFileUpload}
                      onFilePreview={handleFilePreview}
                      frameworkKey="pcidss"
                      orgId={orgId}
                    />
                    {/* NEN 7510 */}
                    <ComplianceFramework
                      title="NEN 7510"
                      description="A Dutch standard for managing information security systems."
                      isEnabled={nen7510}
                      status={nen7510Status}
                      onStatusChange={async (value) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            nen7510Status: value as 'started' | 'in_progress' | 'compliant',
                          });
                          toast.success('NEN 7510 status updated');
                        } catch (error) {
                          toast.error('Failed to update NEN 7510 status');
                        }
                      }}
                      onToggle={async (checked) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            nen7510: checked,
                          });
                          toast.success('NEN 7510 status updated');
                        } catch (error) {
                          toast.error('Failed to update NEN 7510 status');
                        }
                      }}
                      fileName={certificateFiles.nen7510}
                      onFileUpload={handleFileUpload}
                      onFilePreview={handleFilePreview}
                      frameworkKey="nen7510"
                      orgId={orgId}
                    />
                    {/* ISO 9001 */}
                    <ComplianceFramework
                      title="ISO 9001"
                      description="An international standard for quality management systems."
                      isEnabled={iso9001}
                      status={iso9001Status}
                      onStatusChange={async (value) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            iso9001Status: value as 'started' | 'in_progress' | 'compliant',
                          });
                          toast.success('ISO 9001 status updated');
                        } catch (error) {
                          toast.error('Failed to update ISO 9001 status');
                        }
                      }}
                      onToggle={async (checked) => {
                        try {
                          await updateTrustPortalFrameworks({
                            orgId,
                            iso9001: checked,
                          });
                          toast.success('ISO 9001 status updated');
                        } catch (error) {
                          toast.error('Failed to update ISO 9001 status');
                        }
                      }}
                      fileName={certificateFiles.iso9001}
                      onFileUpload={handleFileUpload}
                      onFilePreview={handleFilePreview}
                      frameworkKey="iso9001"
                      orgId={orgId}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}

// Extracted component for compliance frameworks to reduce repetition and improve readability
function ComplianceFramework({
  title,
  description,
  isEnabled,
  status,
  onStatusChange,
  onToggle,
  fileName,
  onFileUpload,
  onFilePreview,
  frameworkKey,
  orgId,
}: {
  title: string;
  description: string;
  isEnabled: boolean;
  status: string;
  onStatusChange: (value: string) => Promise<void>;
  onToggle: (checked: boolean) => Promise<void>;
  fileName?: string | null;
  onFileUpload?: (file: File, frameworkKey: string) => Promise<void>;
  onFilePreview?: (frameworkKey: string) => Promise<void>;
  frameworkKey: string;
  orgId: string;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const processFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 10MB');
      return;
    }

    if (onFileUpload) {
      setIsUploading(true);
      try {
        await onFileUpload(file, frameworkKey);
        toast.success('Certificate uploaded successfully');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to upload certificate';
        toast.error(message);
        console.error('File upload error:', error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const logo =
    title === 'ISO 27001' ? (
      <div className="h-16 w-16 flex items-center justify-center">
        <ISO27001 className="max-h-full max-w-full" />
      </div>
    ) : title === 'ISO 42001' ? (
      <div className="h-16 w-16 flex items-center justify-center">
        <ISO42001 className="max-h-full max-w-full" />
      </div>
    ) : title === 'GDPR' ? (
      <div className="h-16 w-16 flex items-center justify-center">
        <GDPR className="max-h-full max-w-full" />
      </div>
    ) : title === 'HIPAA' ? (
      <div className="h-16 w-16 flex items-center justify-center">
        <HIPAA className="max-h-full max-w-full" />
      </div>
    ) : title === 'SOC 2 Type 1' ? (
      <div className="h-16 w-16 flex items-center justify-center">
        <SOC2Type1 className="max-h-full max-w-full" />
      </div>
    ) : title === 'SOC 2 Type 2' ? (
      <div className="h-16 w-16 flex items-center justify-center">
        <SOC2Type2 className="max-h-full max-w-full" />
      </div>
    ) : title === 'PCI DSS' ? (
      <div className="h-16 w-16 flex items-center justify-center">
        <PCIDSS className="max-h-full max-w-full" />
      </div>
    ) : title === 'NEN 7510' ? (
      <div className="h-16 w-16 flex items-center justify-center">
        <NEN7510 className="max-h-full max-w-full" />
      </div>
    ) : title === 'ISO 9001' ? (
      <div className="h-16 w-16 flex items-center justify-center">
        <ISO9001 className="max-h-full max-w-full" />
      </div>
    ) : null;

  return (
    <>
      <Card className="rounded-lg border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-4">
            <div className="shrink-0">{logo}</div>
            <div>
              <CardTitle className="text-lg leading-tight font-semibold">{title}</CardTitle>
              <CardDescription className="text-muted-foreground mt-1 line-clamp-3 text-sm">
                {description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <div className="mt-4 border-t" />
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-row items-center justify-between gap-6">
            <div className="min-w-0 flex-1">
              {isEnabled ? (
                <Select defaultValue={status} onValueChange={onStatusChange}>
                  <SelectTrigger className="min-w-[180px] text-base font-medium">
                    <SelectValue placeholder="Select status" className="w-auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="started">
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-4 w-4 rounded-sm bg-gray-300" />
                        Started
                      </span>
                    </SelectItem>
                    <SelectItem value="in_progress">
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-4 w-4 rounded-sm bg-yellow-400" />
                        In Progress
                      </span>
                    </SelectItem>
                    <SelectItem value="compliant">
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-4 w-4 rounded-sm bg-primary" />
                        Compliant
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Disabled</span>
                </div>
              )}
            </div>
            <div className="shrink-0 pl-2">
              <Switch checked={isEnabled} onCheckedChange={onToggle} />
            </div>
          </div>
          
          {/* File Upload Section - Only show when status is "compliant" */}
          {isEnabled && status === 'compliant' && (
            <div className="mt-4 border-t pt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    await processFile(file);
                  }
                }}
                disabled={isUploading}
              />
              
              {/* Section Header */}
              <h4 className="text-sm font-semibold text-foreground mb-3">
                Compliance Certificate
              </h4>

              {/* Certificate Content */}
              {fileName ? (
                /* File Uploaded State */
                <div className="rounded-lg bg-muted/40 border border-border/50 p-4 space-y-3">
                  <div className="flex items-center gap-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileCheck2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Certificate uploaded
                      </p>
                    </div>
                    {onFilePreview && (
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await onFilePreview(frameworkKey);
                                } catch (error) {
                                  const message =
                                    error instanceof Error ? error.message : 'Failed to preview certificate';
                                  toast.error(message);
                                }
                              }}
                              className="text-xs font-medium text-primary hover:text-primary/80 hover:underline transition-colors flex items-center gap-1"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Open certificate in new tab</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center gap-2 pt-1">
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="h-8 gap-1.5 text-xs font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            Replace
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Replace current certificate (PDF)</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {onFilePreview && (
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await onFilePreview(frameworkKey);
                                } catch (error) {
                                  const message =
                                    error instanceof Error ? error.message : 'Failed to download certificate';
                                  toast.error(message);
                                }
                              }}
                              className="h-8 gap-1.5 text-xs font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Download certificate</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
              ) : (
                /* Empty State - Drop zone matching uploaded state height (122px) */
                <div
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`
                    relative rounded-lg bg-muted/40 border border-border/50 p-4 cursor-pointer
                    h-[122px] flex items-center
                    transition-all duration-200 ease-in-out
                    ${isDragging ? 'border-primary bg-primary/5' : ''}
                    ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
                      transition-all duration-200
                      ${isDragging ? 'bg-primary/10' : 'bg-background'}
                    `}>
                      <Upload className={`
                        h-5 w-5 transition-all duration-200
                        ${isDragging ? 'text-primary scale-110' : 'text-muted-foreground'}
                      `} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`
                        text-sm font-medium transition-colors duration-200
                        ${isDragging ? 'text-primary' : 'text-foreground'}
                      `}>
                        {isDragging ? 'Drop your certificate here' : 'Drag & drop certificate'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        or click to browse • PDF only, max 10MB
                      </p>
                    </div>
                  </div>

                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Uploading...
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

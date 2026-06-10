'use client';

import { usePermissions } from '@/hooks/use-permissions';
import type { TrustCustomFrameworkItem } from '@/hooks/use-trust-portal-settings';
import { useTrustPortalSettings } from '@/hooks/use-trust-portal-settings';
import { useDebounce } from '@/hooks/useDebounce';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@trycompai/design-system';
import { Form } from '@trycompai/ui/form';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ComplianceFramework } from './ComplianceFramework';
import { CustomFrameworksSection } from './CustomFrameworksSection';
import {
  TrustPortalAdditionalDocumentsSection,
  type TrustPortalDocument,
} from './TrustPortalAdditionalDocumentsSection';
import { TrustPortalBrandingSettings } from './TrustPortalBrandingSettings';
import { TrustPortalCustomLinks } from './TrustPortalCustomLinks';
import { TrustPortalFaqBuilder } from './TrustPortalFaqBuilder';
import { TrustPortalOverview } from './TrustPortalOverview';
import { TrustPortalVendors } from './TrustPortalVendors';

// Client-side form schema (includes all fields for form state)
const trustPortalSwitchSchema = z.object({
  enabled: z.boolean(),
  contactEmail: z.string().email().or(z.literal('')).optional(),
  primaryColor: z.string().optional(),
  soc2type1: z.boolean(),
  soc2type2: z.boolean(),
  soc3: z.boolean(),
  iso27001: z.boolean(),
  iso42001: z.boolean(),
  gdpr: z.boolean(),
  hipaa: z.boolean(),
  pcidss: z.boolean(),
  nen7510: z.boolean(),
  iso9001: z.boolean(),
  pipeda: z.boolean(),
  ccpa: z.boolean(),
  soc2type1Status: z.enum(['started', 'in_progress', 'compliant']),
  soc2type2Status: z.enum(['started', 'in_progress', 'compliant']),
  soc3Status: z.enum(['started', 'in_progress', 'compliant']),
  iso27001Status: z.enum(['started', 'in_progress', 'compliant']),
  iso42001Status: z.enum(['started', 'in_progress', 'compliant']),
  gdprStatus: z.enum(['started', 'in_progress', 'compliant']),
  hipaaStatus: z.enum(['started', 'in_progress', 'compliant']),
  pcidssStatus: z.enum(['started', 'in_progress', 'compliant']),
  nen7510Status: z.enum(['started', 'in_progress', 'compliant']),
  iso9001Status: z.enum(['started', 'in_progress', 'compliant']),
  pipedaStatus: z.enum(['started', 'in_progress', 'compliant']),
  ccpaStatus: z.enum(['started', 'in_progress', 'compliant']),
});

// Server action input schema (only fields that the server accepts)
type TrustPortalSwitchActionInput = {
  enabled: boolean;
  contactEmail?: string | '';
  primaryColor?: string;
};

const FRAMEWORK_KEY_TO_API_SLUG: Record<string, string> = {
  iso27001: 'iso_27001',
  iso42001: 'iso_42001',
  gdpr: 'gdpr',
  hipaa: 'hipaa',
  soc2type1: 'soc2_type1',
  soc2type2: 'soc2_type2',
  soc3: 'soc3',
  pcidss: 'pci_dss',
  nen7510: 'nen_7510',
  iso9001: 'iso_9001',
  pipeda: 'pipeda',
  ccpa: 'ccpa',
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

type TrustOverviewData = {
  overviewTitle: string | null;
  overviewContent: string | null;
  showOverview: boolean;
};

type TrustCustomLink = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  order: number;
  isActive: boolean;
};

type ComplianceBadge = {
  type: 'soc2' | 'iso27001' | 'iso42001' | 'gdpr' | 'hipaa' | 'pci_dss' | 'nen7510' | 'iso9001';
  verified: boolean;
};

type TrustVendor = {
  id: string;
  name: string;
  description: string;
  website: string | null;
  showOnTrustPortal: boolean;
  logoUrl: string | null;
  complianceBadges: ComplianceBadge[] | null;
};

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
  soc3,
  iso27001,
  iso42001,
  gdpr,
  hipaa,
  pcidss,
  soc2type1Status,
  soc2type2Status,
  soc3Status,
  iso27001Status,
  iso42001Status,
  gdprStatus,
  hipaaStatus,
  pcidssStatus,
  nen7510,
  nen7510Status,
  iso9001,
  iso9001Status,
  pipeda,
  pipedaStatus,
  ccpa,
  ccpaStatus,
  faqs,
  iso27001FileName,
  iso42001FileName,
  gdprFileName,
  hipaaFileName,
  soc2type1FileName,
  soc2type2FileName,
  soc3FileName,
  pcidssFileName,
  nen7510FileName,
  iso9001FileName,
  pipedaFileName,
  ccpaFileName,
  additionalDocuments,
  overview,
  customLinks,
  vendors,
  customFrameworks,
  faviconUrl,
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
  soc3: boolean;
  iso27001: boolean;
  iso42001: boolean;
  gdpr: boolean;
  hipaa: boolean;
  pcidss: boolean;
  nen7510: boolean;
  pipeda: boolean;
  ccpa: boolean;
  soc2type1Status: 'started' | 'in_progress' | 'compliant';
  soc2type2Status: 'started' | 'in_progress' | 'compliant';
  soc3Status: 'started' | 'in_progress' | 'compliant';
  iso27001Status: 'started' | 'in_progress' | 'compliant';
  iso42001Status: 'started' | 'in_progress' | 'compliant';
  gdprStatus: 'started' | 'in_progress' | 'compliant';
  hipaaStatus: 'started' | 'in_progress' | 'compliant';
  pcidssStatus: 'started' | 'in_progress' | 'compliant';
  nen7510Status: 'started' | 'in_progress' | 'compliant';
  iso9001: boolean;
  iso9001Status: 'started' | 'in_progress' | 'compliant';
  pipedaStatus: 'started' | 'in_progress' | 'compliant';
  ccpaStatus: 'started' | 'in_progress' | 'compliant';
  faqs: any[] | null;
  iso27001FileName?: string | null;
  iso42001FileName?: string | null;
  gdprFileName?: string | null;
  hipaaFileName?: string | null;
  soc2type1FileName?: string | null;
  soc2type2FileName?: string | null;
  soc3FileName?: string | null;
  pcidssFileName?: string | null;
  nen7510FileName?: string | null;
  iso9001FileName?: string | null;
  pipedaFileName?: string | null;
  ccpaFileName?: string | null;
  additionalDocuments: TrustPortalDocument[];
  overview: TrustOverviewData;
  customLinks: TrustCustomLink[];
  vendors: TrustVendor[];
  customFrameworks: TrustCustomFrameworkItem[];
  faviconUrl?: string | null;
}) {
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('trust', 'update');
  const {
    updateToggleSettings,
    updateFrameworkSettings,
    uploadComplianceResource,
    getComplianceResourceUrl,
  } = useTrustPortalSettings();

  const [certificateFiles, setCertificateFiles] = useState<Record<string, string | null>>({
    iso27001: iso27001FileName ?? null,
    iso42001: iso42001FileName ?? null,
    gdpr: gdprFileName ?? null,
    hipaa: hipaaFileName ?? null,
    soc2type1: soc2type1FileName ?? null,
    soc2type2: soc2type2FileName ?? null,
    soc3: soc3FileName ?? null,
    pcidss: pcidssFileName ?? null,
    nen7510: nen7510FileName ?? null,
    iso9001: iso9001FileName ?? null,
    pipeda: pipedaFileName ?? null,
    ccpa: ccpaFileName ?? null,
  });

  useEffect(() => {
    setCertificateFiles({
      iso27001: iso27001FileName ?? null,
      iso42001: iso42001FileName ?? null,
      gdpr: gdprFileName ?? null,
      hipaa: hipaaFileName ?? null,
      soc2type1: soc2type1FileName ?? null,
      soc2type2: soc2type2FileName ?? null,
      soc3: soc3FileName ?? null,
      pcidss: pcidssFileName ?? null,
      nen7510: nen7510FileName ?? null,
      iso9001: iso9001FileName ?? null,
      pipeda: pipedaFileName ?? null,
      ccpa: ccpaFileName ?? null,
    });
  }, [
    iso27001FileName,
    iso42001FileName,
    gdprFileName,
    hipaaFileName,
    soc2type1FileName,
    soc2type2FileName,
    soc3FileName,
    pcidssFileName,
    nen7510FileName,
    iso9001FileName,
    pipedaFileName,
    ccpaFileName,
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
    const payload = await uploadComplianceResource(
      orgId,
      apiFramework,
      file.name,
      file.type || 'application/pdf',
      fileData,
    );

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

    const payload = await getComplianceResourceUrl(orgId, apiFramework);
    window.open(payload.signedUrl, '_blank', 'noopener,noreferrer');
  };
  const [isToggling, setIsToggling] = useState(false);

  const form = useForm<z.infer<typeof trustPortalSwitchSchema>>({
    resolver: zodResolver(trustPortalSwitchSchema),
    defaultValues: {
      enabled: enabled,
      contactEmail: contactEmail ?? undefined,
      primaryColor: primaryColor ?? undefined,
      soc2type1: soc2type1 ?? false,
      soc2type2: soc2type2 ?? false,
      soc3: soc3 ?? false,
      iso27001: iso27001 ?? false,
      iso42001: iso42001 ?? false,
      gdpr: gdpr ?? false,
      hipaa: hipaa ?? false,
      pcidss: pcidss ?? false,
      nen7510: nen7510 ?? false,
      iso9001: iso9001 ?? false,
      pipeda: pipeda ?? false,
      ccpa: ccpa ?? false,
      soc2type1Status: soc2type1Status ?? 'started',
      soc2type2Status: soc2type2Status ?? 'started',
      soc3Status: soc3Status ?? 'started',
      iso27001Status: iso27001Status ?? 'started',
      iso42001Status: iso42001Status ?? 'started',
      gdprStatus: gdprStatus ?? 'started',
      hipaaStatus: hipaaStatus ?? 'started',
      pcidssStatus: pcidssStatus ?? 'started',
      nen7510Status: nen7510Status ?? 'started',
      iso9001Status: iso9001Status ?? 'started',
      pipedaStatus: pipedaStatus ?? 'started',
      ccpaStatus: ccpaStatus ?? 'started',
    },
  });

  const onSubmit = useCallback(
    async (data: TrustPortalSwitchActionInput) => {
      setIsToggling(true);
      try {
        await updateToggleSettings({
          enabled: data.enabled,
          contactEmail: data.contactEmail,
          primaryColor: data.primaryColor,
        });
        toast.success('Trust portal status updated');
      } catch {
        toast.error('Failed to update trust portal status');
      } finally {
        setIsToggling(false);
      }
    },
    [updateToggleSettings],
  );

  const portalUrl = domainVerified ? `https://${domain}` : `https://trust.inc/${slug}`;

  const lastSaved = useRef<{ [key: string]: string | boolean | null }>({
    contactEmail: contactEmail ?? '',
    enabled: enabled,
    primaryColor: primaryColor ?? null,
  });

  const savingRef = useRef<{ [key: string]: boolean }>({
    contactEmail: false,
    enabled: false,
    primaryColor: false,
  });

  const autoSave = useCallback(
    async (field: string, value: unknown) => {
      // Prevent concurrent saves for the same field
      if (savingRef.current[field]) {
        return;
      }

      const current = form.getValues();
      if (lastSaved.current[field] !== value) {
        savingRef.current[field] = true;
        try {
          // Only send fields that trustPortalSwitchAction accepts
          // Server schema accepts: enabled, contactEmail, primaryColor
          const data: TrustPortalSwitchActionInput = {
            enabled: field === 'enabled' ? (value as boolean) : current.enabled,
            contactEmail:
              field === 'contactEmail' ? (value as string) : (current.contactEmail ?? ''),
            primaryColor:
              field === 'primaryColor' ? (value as string) : (current.primaryColor ?? undefined),
          };
          await onSubmit(data);
          lastSaved.current[field] = value as string | boolean | null;
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

  const handleEnabledChange = useCallback(
    (val: boolean) => {
      form.setValue('enabled', val);
      autoSave('enabled', val);
    },
    [form, autoSave],
  );

  return (
    <Form {...form}>
      <form>
        <Tabs defaultValue="frameworks">
          <TabsList variant="underline">
            <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
            <TabsTrigger value="content">Mission</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          {/* Compliance Frameworks Tab */}
          <TabsContent value="frameworks">
            <div className="pt-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium">Compliance Frameworks</h3>
                <p className="text-muted-foreground text-sm">
                  Share the frameworks your organization is compliant with or working towards.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {/* ISO 27001 */}
                <ComplianceFramework
                  title="ISO 27001"
                  description="An international standard for managing information security systems."
                  isEnabled={iso27001}
                  status={iso27001Status}
                  onStatusChange={async (value) => {
                    try {
                      await updateFrameworkSettings({
                        iso27001Status: value as 'started' | 'in_progress' | 'compliant',
                      });
                      toast.success('ISO 27001 status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update ISO 27001 status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  onToggle={async (checked) => {
                    try {
                      await updateFrameworkSettings({
                        iso27001: checked,
                      });
                      toast.success('ISO 27001 status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update ISO 27001 status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  fileName={certificateFiles.iso27001}
                  onFileUpload={handleFileUpload}
                  onFilePreview={handleFilePreview}
                  frameworkKey="iso27001"
                  orgId={orgId}
                  disabled={!canUpdate}
                />
                {/* ISO 42001 */}
                <ComplianceFramework
                  title="ISO 42001"
                  description="An international standard for an Artificial Intelligence Management System."
                  isEnabled={iso42001}
                  status={iso42001Status}
                  onStatusChange={async (value) => {
                    try {
                      await updateFrameworkSettings({
                        iso42001Status: value as 'started' | 'in_progress' | 'compliant',
                      });
                      toast.success('ISO 42001 status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update ISO 42001 status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  onToggle={async (checked) => {
                    try {
                      await updateFrameworkSettings({
                        iso42001: checked,
                      });
                      toast.success('ISO 42001 status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update ISO 42001 status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  fileName={certificateFiles.iso42001}
                  onFileUpload={handleFileUpload}
                  onFilePreview={handleFilePreview}
                  frameworkKey="iso42001"
                  orgId={orgId}
                  disabled={!canUpdate}
                />
                {/* GDPR */}
                <ComplianceFramework
                  title="GDPR"
                  description="A European regulation that governs personal data protection and user privacy."
                  isEnabled={gdpr}
                  status={gdprStatus}
                  onStatusChange={async (value) => {
                    try {
                      await updateFrameworkSettings({
                        gdprStatus: value as 'started' | 'in_progress' | 'compliant',
                      });
                      toast.success('GDPR status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update GDPR status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  onToggle={async (checked) => {
                    try {
                      await updateFrameworkSettings({
                        gdpr: checked,
                      });
                      toast.success('GDPR status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update GDPR status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  fileName={certificateFiles.gdpr}
                  onFileUpload={handleFileUpload}
                  onFilePreview={handleFilePreview}
                  frameworkKey="gdpr"
                  orgId={orgId}
                  disabled={!canUpdate}
                />
                {/* HIPAA */}
                <ComplianceFramework
                  title="HIPAA"
                  description="A US regulation that protects sensitive patient health information and medical data."
                  isEnabled={hipaa}
                  status={hipaaStatus}
                  onStatusChange={async (value) => {
                    try {
                      await updateFrameworkSettings({
                        hipaaStatus: value as 'started' | 'in_progress' | 'compliant',
                      });
                      toast.success('HIPAA status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update HIPAA status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  onToggle={async (checked) => {
                    try {
                      await updateFrameworkSettings({
                        hipaa: checked,
                      });
                      toast.success('HIPAA status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update HIPAA status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  fileName={certificateFiles.hipaa}
                  onFileUpload={handleFileUpload}
                  onFilePreview={handleFilePreview}
                  frameworkKey="hipaa"
                  orgId={orgId}
                  disabled={!canUpdate}
                />
                {/* SOC 2 Type 1*/}
                <ComplianceFramework
                  title="SOC 2 Type 1"
                  description="A compliance framework focused on data security, availability, and confidentiality."
                  isEnabled={soc2type1}
                  status={soc2type1Status}
                  onStatusChange={async (value) => {
                    try {
                      await updateFrameworkSettings({
                        soc2type1Status: value as 'started' | 'in_progress' | 'compliant',
                      });
                      toast.success('SOC 2 Type 1 status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update SOC 2 Type 1 status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  onToggle={async (checked) => {
                    try {
                      await updateFrameworkSettings({
                        soc2type1: checked,
                      });
                      toast.success('SOC 2 Type 1 status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update SOC 2 Type 1 status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  fileName={certificateFiles.soc2type1}
                  onFileUpload={handleFileUpload}
                  onFilePreview={handleFilePreview}
                  frameworkKey="soc2type1"
                  orgId={orgId}
                  disabled={!canUpdate}
                />
                {/* SOC 2 Type 2*/}
                <ComplianceFramework
                  title="SOC 2 Type 2"
                  description="A compliance framework focused on data security, availability, and confidentiality."
                  isEnabled={soc2type2}
                  status={soc2type2Status}
                  onStatusChange={async (value) => {
                    try {
                      await updateFrameworkSettings({
                        soc2type2Status: value as 'started' | 'in_progress' | 'compliant',
                      });
                      toast.success('SOC 2 Type 2 status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update SOC 2 Type 2 status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  onToggle={async (checked) => {
                    try {
                      await updateFrameworkSettings(
                        checked ? { soc2type2: true } : { soc2: false, soc2type2: false },
                      );
                      toast.success('SOC 2 Type 2 status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update SOC 2 Type 2 status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  fileName={certificateFiles.soc2type2}
                  onFileUpload={handleFileUpload}
                  onFilePreview={handleFilePreview}
                  frameworkKey="soc2type2"
                  orgId={orgId}
                  disabled={!canUpdate}
                />
                {/* SOC 3 */}
                <ComplianceFramework
                  title="SOC 3"
                  description="A compliance framework focused on data security, availability, and confidentiality."
                  isEnabled={soc3}
                  status={soc3Status}
                  onStatusChange={async (value) => {
                    try {
                      await updateFrameworkSettings({
                        soc3Status: value as 'started' | 'in_progress' | 'compliant',
                      });
                      toast.success('SOC 3 status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update SOC 3 status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  onToggle={async (checked) => {
                    try {
                      await updateFrameworkSettings({
                        soc3: checked,
                      });
                      toast.success('SOC 3 status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update SOC 3 status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  fileName={certificateFiles.soc3}
                  onFileUpload={handleFileUpload}
                  onFilePreview={handleFilePreview}
                  frameworkKey="soc3"
                  orgId={orgId}
                  disabled={!canUpdate}
                />
                {/* PCI DSS */}
                <ComplianceFramework
                  title="PCI DSS"
                  description="A compliance framework focused on data security, availability, and confidentiality."
                  isEnabled={pcidss}
                  status={pcidssStatus}
                  onStatusChange={async (value) => {
                    try {
                      await updateFrameworkSettings({
                        pcidssStatus: value as 'started' | 'in_progress' | 'compliant',
                      });
                      toast.success('PCI DSS status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update PCI DSS status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  onToggle={async (checked) => {
                    try {
                      await updateFrameworkSettings({
                        pcidss: checked,
                      });
                      toast.success('PCI DSS status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update PCI DSS status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  fileName={certificateFiles.pcidss}
                  onFileUpload={handleFileUpload}
                  onFilePreview={handleFilePreview}
                  frameworkKey="pcidss"
                  orgId={orgId}
                  disabled={!canUpdate}
                />
                {/* NEN 7510 */}
                <ComplianceFramework
                  title="NEN 7510"
                  description="A Dutch standard for managing information security systems."
                  isEnabled={nen7510}
                  status={nen7510Status}
                  onStatusChange={async (value) => {
                    try {
                      await updateFrameworkSettings({
                        nen7510Status: value as 'started' | 'in_progress' | 'compliant',
                      });
                      toast.success('NEN 7510 status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update NEN 7510 status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  onToggle={async (checked) => {
                    try {
                      await updateFrameworkSettings({
                        nen7510: checked,
                      });
                      toast.success('NEN 7510 status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update NEN 7510 status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  fileName={certificateFiles.nen7510}
                  onFileUpload={handleFileUpload}
                  onFilePreview={handleFilePreview}
                  frameworkKey="nen7510"
                  orgId={orgId}
                  disabled={!canUpdate}
                />
                {/* ISO 9001 */}
                <ComplianceFramework
                  title="ISO 9001"
                  description="An international standard for quality management systems."
                  isEnabled={iso9001}
                  status={iso9001Status}
                  onStatusChange={async (value) => {
                    try {
                      await updateFrameworkSettings({
                        iso9001Status: value as 'started' | 'in_progress' | 'compliant',
                      });
                      toast.success('ISO 9001 status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update ISO 9001 status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  onToggle={async (checked) => {
                    try {
                      await updateFrameworkSettings({
                        iso9001: checked,
                      });
                      toast.success('ISO 9001 status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update ISO 9001 status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  fileName={certificateFiles.iso9001}
                  onFileUpload={handleFileUpload}
                  onFilePreview={handleFilePreview}
                  frameworkKey="iso9001"
                  orgId={orgId}
                  disabled={!canUpdate}
                />
                {/* PIPEDA */}
                <ComplianceFramework
                  title="PIPEDA"
                  description="Personal Information Protection and Electronic Documents Act"
                  isEnabled={pipeda}
                  status={pipedaStatus}
                  onStatusChange={async (value) => {
                    try {
                      await updateFrameworkSettings({
                        pipedaStatus: value as 'started' | 'in_progress' | 'compliant',
                      });
                      toast.success('PIPEDA status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update PIPEDA status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  onToggle={async (checked) => {
                    try {
                      await updateFrameworkSettings({
                        pipeda: checked,
                      });
                      toast.success('PIPEDA status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update PIPEDA status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  fileName={certificateFiles.pipeda}
                  onFileUpload={handleFileUpload}
                  onFilePreview={handleFilePreview}
                  frameworkKey="pipeda"
                  orgId={orgId}
                  disabled={!canUpdate}
                />
                {/* CCPA */}
                <ComplianceFramework
                  title="CCPA"
                  description="California Consumer Privacy Act"
                  isEnabled={ccpa}
                  status={ccpaStatus}
                  onStatusChange={async (value) => {
                    try {
                      await updateFrameworkSettings({
                        ccpaStatus: value as 'started' | 'in_progress' | 'compliant',
                      });
                      toast.success('CCPA status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update CCPA status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  onToggle={async (checked) => {
                    try {
                      await updateFrameworkSettings({
                        ccpa: checked,
                      });
                      toast.success('CCPA status updated');
                    } catch (error) {
                      console.error('[trust framework update] failed', error);
                      toast.error('Failed to update CCPA status', {
                        description: error instanceof Error ? error.message : undefined,
                      });
                    }
                  }}
                  fileName={certificateFiles.ccpa}
                  onFileUpload={handleFileUpload}
                  onFilePreview={handleFilePreview}
                  frameworkKey="ccpa"
                  orgId={orgId}
                  disabled={!canUpdate}
                />
              </div>

              <CustomFrameworksSection
                orgId={orgId}
                canUpdate={canUpdate}
                initialCustomFrameworks={customFrameworks}
              />
            </div>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding">
            <div className="pt-6">
              <TrustPortalBrandingSettings
                enabled={enabled}
                primaryColor={primaryColor ?? null}
                faviconUrl={faviconUrl ?? null}
              />
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content">
            <div className="pt-6">
              <TrustPortalOverview initialData={overview} orgId={orgId} />
            </div>
          </TabsContent>

          {/* Links Tab */}
          <TabsContent value="links">
            <div className="pt-6">
              <TrustPortalCustomLinks initialLinks={customLinks} orgId={orgId} />
            </div>
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors">
            <div className="pt-6">
              <TrustPortalVendors initialVendors={vendors} orgId={orgId} />
            </div>
          </TabsContent>

          {/* FAQ Tab */}
          <TabsContent value="faq">
            <div className="pt-6">
              <TrustPortalFaqBuilder initialFaqs={faqs} orgId={orgId} />
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <div className="pt-6">
              <TrustPortalAdditionalDocumentsSection
                organizationId={orgId}
                enabled={true}
                documents={additionalDocuments}
              />
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
}

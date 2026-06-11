'use client';

import {
  TrustCustomFrameworkItem,
  useTrustPortalSettings,
} from '@/hooks/use-trust-portal-settings';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ComplianceFramework } from './ComplianceFramework';

type FrameworkStatus = 'started' | 'in_progress' | 'compliant';

async function convertFileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Lets an org choose which of its custom frameworks appear on the public Trust
 * Portal, with the same toggle / status / certificate UX as native frameworks
 * (reuses the ComplianceFramework row). Custom frameworks render with an
 * initials avatar instead of a built-in SVG logo.
 */
export function CustomFrameworksSection({
  orgId,
  canUpdate,
  initialCustomFrameworks,
}: {
  orgId: string;
  canUpdate: boolean;
  initialCustomFrameworks: TrustCustomFrameworkItem[];
}) {
  const { updateCustomFramework, uploadCustomComplianceResource, getCustomComplianceResourceUrl } =
    useTrustPortalSettings();

  const [frameworks, setFrameworks] = useState<TrustCustomFrameworkItem[]>(initialCustomFrameworks);

  // Resync from the server when it refetches (e.g. after a new custom framework
  // is created). The prop reference is stable across client-only re-renders, so
  // this won't clobber in-session optimistic edits — it only fires on fresh
  // server data. Mirrors the certificate-file resync in TrustPortalSwitch.
  useEffect(() => {
    setFrameworks(initialCustomFrameworks);
  }, [initialCustomFrameworks]);

  // Nothing to show until the org authors a custom framework — keep the section
  // out of the way rather than rendering an empty grid.
  if (frameworks.length === 0) {
    return (
      <div className="mt-10">
        <div className="mb-4">
          <h3 className="text-lg font-medium">Custom Frameworks</h3>
          <p className="text-muted-foreground text-sm">
            Frameworks you create under Frameworks → Add Custom Framework will appear here, ready to
            publish on your Trust Portal.
          </p>
        </div>
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No custom frameworks yet.
        </div>
      </div>
    );
  }

  const updateFileName = (customFrameworkId: string, fileName: string) => {
    setFrameworks((prev) =>
      prev.map((framework) =>
        framework.customFrameworkId === customFrameworkId
          ? { ...framework, certificateFileName: fileName, hasCertificate: true }
          : framework,
      ),
    );
  };

  const handleToggle = async (customFrameworkId: string, checked: boolean) => {
    await updateCustomFramework({ customFrameworkId, enabled: checked });
    setFrameworks((prev) =>
      prev.map((framework) =>
        framework.customFrameworkId === customFrameworkId
          ? { ...framework, enabled: checked }
          : framework,
      ),
    );
  };

  const handleStatusChange = async (customFrameworkId: string, status: FrameworkStatus) => {
    await updateCustomFramework({ customFrameworkId, status });
    setFrameworks((prev) =>
      prev.map((framework) =>
        framework.customFrameworkId === customFrameworkId ? { ...framework, status } : framework,
      ),
    );
  };

  const handleFileUpload = async (file: File, customFrameworkId: string) => {
    // Defense-in-depth size cap at the API-call boundary: the raw file is
    // limited to 100MB (server decodes and re-checks), and base64 inflates it
    // ~33% — guarding here avoids building a ~133MB string and surfaces a clean
    // error if this handler is ever invoked outside the validated row flow.
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size must be less than 100MB');
    }
    const fileData = await convertFileToBase64(file);
    const payload = await uploadCustomComplianceResource(
      orgId,
      customFrameworkId,
      file.name,
      file.type || 'application/pdf',
      fileData,
    );
    updateFileName(customFrameworkId, payload.fileName);
  };

  const handleFilePreview = async (customFrameworkId: string) => {
    const payload = await getCustomComplianceResourceUrl(orgId, customFrameworkId);
    window.open(payload.signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mt-10">
      <div className="mb-4">
        <h3 className="text-lg font-medium">Custom Frameworks</h3>
        <p className="text-muted-foreground text-sm">
          Display your organization&apos;s custom frameworks alongside the standard ones.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {frameworks.map((framework) => (
          <ComplianceFramework
            key={framework.customFrameworkId}
            title={framework.name}
            description={framework.description}
            isEnabled={framework.enabled}
            status={framework.status}
            frameworkKey={framework.customFrameworkId}
            orgId={orgId}
            fileName={framework.certificateFileName}
            disabled={!canUpdate}
            onStatusChange={async (value) => {
              const status = value as FrameworkStatus;
              try {
                await handleStatusChange(framework.customFrameworkId, status);
                toast.success(`${framework.name} status updated`);
              } catch (error) {
                toast.error(`Failed to update ${framework.name} status`, {
                  description: error instanceof Error ? error.message : undefined,
                });
                throw error;
              }
            }}
            onToggle={async (checked) => {
              try {
                await handleToggle(framework.customFrameworkId, checked);
                toast.success(`${framework.name} updated`);
              } catch (error) {
                toast.error(`Failed to update ${framework.name}`, {
                  description: error instanceof Error ? error.message : undefined,
                });
                throw error;
              }
            }}
            onFileUpload={canUpdate ? handleFileUpload : undefined}
            onFilePreview={handleFilePreview}
          />
        ))}
      </div>
    </div>
  );
}

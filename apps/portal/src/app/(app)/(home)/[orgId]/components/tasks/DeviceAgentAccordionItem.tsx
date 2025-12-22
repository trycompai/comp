'use client';

import {
  MAC_APPLE_SILICON_FILENAME,
  MAC_INTEL_FILENAME,
  WINDOWS_FILENAME,
} from '@/app/api/download-agent/constants';
import { detectOSFromUserAgent, SupportedOS } from '@/utils/os';
import { CheckCircle2, ChevronDown, Circle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { EmployeePortalDashboard } from '../../types/employee-portal';
import { DeviceAgentInfoAccordion } from './device-agent/DeviceAgentInfoAccordion';
import { DeviceAgentInstructions } from './device-agent/DeviceAgentInstructions';
import { DeviceAgentPolicyStatusCard } from './device-agent/DeviceAgentPolicyStatusCard';

interface DeviceAgentAccordionItemProps {
  member: EmployeePortalDashboard['member'];
  host: EmployeePortalDashboard['host'];
  fleetPolicies?: EmployeePortalDashboard['fleetPolicies'];
}

export function DeviceAgentAccordionItem({
  member,
  host,
  fleetPolicies = [],
}: DeviceAgentAccordionItemProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [detectedOS, setDetectedOS] = useState<SupportedOS | null>(null);

  const isMacOS = useMemo(
    () => detectedOS === 'macos' || detectedOS === 'macos-intel',
    [detectedOS],
  );

  const mdmEnabledStatus = useMemo((): { name: string; response: 'pass' | 'fail' } => {
    return {
      response: host?.mdm?.connected_to_fleet ? 'pass' : 'fail',
      name: 'MDM Enabled',
    };
  }, [host]);

  const hasInstalledAgent = host !== null;
  const failedPoliciesCount = useMemo(() => {
    return (
      fleetPolicies.filter((policy) => policy.response !== 'pass').length +
      (!isMacOS || mdmEnabledStatus.response === 'pass' ? 0 : 1)
    );
  }, [fleetPolicies, mdmEnabledStatus, isMacOS]);

  const isCompleted = hasInstalledAgent && failedPoliciesCount === 0;

  const handleDownload = async () => {
    if (!detectedOS) {
      toast.error('Could not detect your OS. Please refresh and try again.');
      return;
    }

    setIsDownloading(true);

    try {
      // First, we need to get a download token/session from the API
      const tokenResponse = await fetch('/api/download-agent/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: member.organizationId,
          employeeId: member.id,
          os: detectedOS,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(errorText || 'Failed to prepare download.');
      }

      const { token } = await tokenResponse.json();

      // Now trigger the actual download using the browser's native download mechanism
      // This will show in the browser's download UI immediately
      const downloadUrl = `/api/download-agent?token=${encodeURIComponent(token)}`;

      // Method 1: Using a temporary link (most reliable)
      const a = document.createElement('a');
      a.href = downloadUrl;

      // Set filename based on OS and architecture
      if (isMacOS) {
        a.download = detectedOS === 'macos' ? MAC_APPLE_SILICON_FILENAME : MAC_INTEL_FILENAME;
      } else {
        a.download = WINDOWS_FILENAME;
      }

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success('Download started! Check your downloads folder.');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to download agent.');
    } finally {
      // Reset after a short delay to allow download to start
      setTimeout(() => {
        setIsDownloading(false);
      }, 1000);
    }
  };

  useEffect(() => {
    const detectOS = async () => {
      const os = await detectOSFromUserAgent();
      setDetectedOS(os);
    };
    detectOS();
  }, []);

  return (
    <details className="group px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 text-left">
          {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
          <span
            className={
              isCompleted
                ? 'text-sm font-medium text-muted-foreground line-through'
                : 'text-sm font-medium text-foreground'
            }
          >
            Download and install Comp AI Device Agent
          </span>
          {hasInstalledAgent && failedPoliciesCount > 0 ? (
            <span className="ml-auto text-xs text-muted-foreground">
              {failedPoliciesCount} policies failing
            </span>
          ) : null}
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="mt-4 flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Installing Comp AI Device Agent helps you and your security administrator keep your device
          protected against security threats.
        </p>

        {!hasInstalledAgent ? (
          <DeviceAgentInstructions
            isMacOS={isMacOS}
            detectedOS={detectedOS}
            onChangeDetectedOS={setDetectedOS}
            onDownload={handleDownload}
            isDownloading={isDownloading}
            downloadDisabled={isDownloading || hasInstalledAgent}
          />
        ) : (
          <DeviceAgentPolicyStatusCard
            host={host}
            fleetPolicies={fleetPolicies}
            isMacOS={isMacOS}
            mdmEnabledStatus={mdmEnabledStatus}
          />
        )}

        <DeviceAgentInfoAccordion />
      </div>
    </details>
  );
}

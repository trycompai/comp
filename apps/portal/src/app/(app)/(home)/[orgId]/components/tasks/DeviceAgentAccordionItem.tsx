'use client';

import {
  MAC_APPLE_SILICON_FILENAME,
  MAC_INTEL_FILENAME,
  WINDOWS_FILENAME,
} from '@/app/api/download-agent/constants';
import { detectOSFromUserAgent, SupportedOS } from '@/utils/os';
import { Accordion, HStack, Text, VStack } from '@trycompai/ui-v2';
import { CheckCircle2, Circle } from 'lucide-react';
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
    <Accordion.Item value="device-agent">
      <Accordion.ItemTrigger>
        <HStack gap="3" flex="1" textAlign="start">
          {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
          <Text
            textStyle="md"
            color={isCompleted ? 'fg.muted' : 'fg'}
            textDecoration={isCompleted ? 'line-through' : undefined}
          >
            Download and install Comp AI Device Agent
          </Text>
          {hasInstalledAgent && failedPoliciesCount > 0 && (
            <Text fontSize="xs" color="fg.muted" marginStart="auto">
              {failedPoliciesCount} policies failing
            </Text>
          )}
        </HStack>
        <Accordion.ItemIndicator />
      </Accordion.ItemTrigger>

      <Accordion.ItemContent>
        <Accordion.ItemBody>
          <VStack align="stretch" gap="4">
            <Text fontSize="sm" color="fg.muted">
              Installing Comp AI Device Agent helps you and your security administrator keep your
              device protected against security threats.
            </Text>

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
          </VStack>
        </Accordion.ItemBody>
      </Accordion.ItemContent>
    </Accordion.Item>
  );
}

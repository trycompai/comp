'use client';

import {
  MAC_APPLE_SILICON_FILENAME,
  MAC_INTEL_FILENAME,
  WINDOWS_FILENAME,
} from '@/app/api/download-agent/constants';
import { detectOSFromUserAgent, SupportedOS } from '@/utils/os';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { cn } from '@comp/ui/cn';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import type { FleetPolicyResult, Member } from '@db';
import { CheckCircle2, Circle, Download, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FleetPolicyItem } from './FleetPolicyItem';
import { MDMPolicyItem } from './MDMPolicyItem';
import type { FleetPolicy, Host } from '../../types';

interface DeviceAgentAccordionItemProps {
  member: Member;
  host: Host | null;
  fleetPolicies?: FleetPolicy[];
  fleetPolicyResults: FleetPolicyResult[];
}

export function DeviceAgentAccordionItem({
  member,
  host,
  fleetPolicies = [],
  fleetPolicyResults = [],
}: DeviceAgentAccordionItemProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [detectedOS, setDetectedOS] = useState<SupportedOS | null>(null);

  const isMacOS = useMemo(
    () => detectedOS === 'macos' || detectedOS === 'macos-intel',
    [detectedOS],
  );

  const mdmEnabledStatus = useMemo<FleetPolicy>(() => {
    return {
      id: 9999,
      response: host?.mdm.connected_to_fleet ? 'pass' : 'fail',
      name: 'MDM Enabled',
    };
  }, [host]);

  const fleetPolicyResultsMap = useMemo(() => {
    return fleetPolicyResults.reduce((acc, result) => {
      acc[result.fleetPolicyId] = result;
      return acc;
    }, {} as Record<string, FleetPolicyResult>);
  }, [fleetPolicyResults]);

  const hasInstalledAgent = host !== null;
  const failedPoliciesCount = useMemo(() => {
    return (
      fleetPolicies.filter((policy) => policy.response !== 'pass' && fleetPolicyResultsMap[policy.id]?.fleetPolicyResponse !== 'pass').length +
      (!isMacOS || mdmEnabledStatus.response === 'pass' ? 0 : 1)
    );
  }, [fleetPolicies, mdmEnabledStatus, isMacOS, fleetPolicyResultsMap]);

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

  const getButtonContent = () => {
    if (isDownloading) {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Downloading...
        </>
      );
    } else {
      return (
        <>
          <Download className="h-4 w-4" />
          Download Agent
        </>
      );
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
    <AccordionItem value="device-agent" className="border rounded-xs">
      <AccordionTrigger className="px-4 hover:no-underline [&[data-state=open]]:pb-2">
        <div className="flex items-center gap-3">
          {isCompleted ? (
            <CheckCircle2 className="text-green-600 dark:text-green-400 h-5 w-5" />
          ) : (
            <Circle className="text-muted-foreground h-5 w-5" />
          )}
          <span className={cn('text-base', isCompleted && 'text-muted-foreground line-through')}>
            Download and install Comp AI Device Agent
          </span>
          {hasInstalledAgent && failedPoliciesCount > 0 && (
            <span className="text-amber-600 dark:text-amber-400 text-xs ml-auto">
              {failedPoliciesCount} policies failing
            </span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-4">
          <p className="text-sm">
            Installing Comp AI Device Agent helps you and your security administrator keep your
            device protected against security threats.
          </p>

          {!hasInstalledAgent ? (
            <div className="space-y-4">
              <ol className="list-decimal space-y-4 pl-5 text-sm">
                <li>
                  <strong>Download the Device Agent installer.</strong>
                  <p className="mt-1">
                    Click the download button below to get the Device Agent installer.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {isMacOS && !hasInstalledAgent && (
                      <Select
                        value={detectedOS || 'macos'}
                        onValueChange={(value: 'macos' | 'macos-intel') => setDetectedOS(value)}
                      >
                        <SelectTrigger className="w-[136px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="macos">Apple Silicon</SelectItem>
                          <SelectItem value="macos-intel">Intel</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      size="sm"
                      variant="default"
                      onClick={handleDownload}
                      disabled={isDownloading || hasInstalledAgent}
                      className="gap-2"
                    >
                      {getButtonContent()}
                    </Button>
                  </div>
                </li>
                <li>
                  <strong>Install the Comp AI Device Agent</strong>
                  <p className="mt-1">
                    {isMacOS
                      ? 'Double-click the downloaded DMG file and follow the installation instructions.'
                      : 'Double-click the downloaded EXE file and follow the installation instructions.'}
                  </p>
                </li>
                {isMacOS ? (
                  <li>
                    <strong>Login with your work email</strong>
                    <p className="mt-1">
                      After installation, login with your work email, select your organization and
                      then click "Link Device" and "Install Agent".
                    </p>
                  </li>
                ) : (
                  <li>
                    <strong>Enable MDM</strong>
                    <div className="space-y-2">
                      <p>
                        Find the Fleet Desktop app in your system tray (bottom right corner). Click
                        on it and click My Device.
                      </p>
                      <p>
                        You should see a banner that asks you to enable MDM. Click the button and
                        follow the instructions.
                      </p>
                      <p>
                        After you've enabled MDM, if you refresh the page, the banner will
                        disappear. Now your computer will automatically enable the necessary
                        settings on your computer in order to be compliant.
                      </p>
                    </div>
                  </li>
                )}
              </ol>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{host.computer_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {fleetPolicies.length > 0 ? (
                  <>
                    {fleetPolicies.map((policy) => (
                      <FleetPolicyItem key={policy.id} policy={policy} policyResult={fleetPolicyResultsMap[policy.id]} />
                    ))}
                    {isMacOS && <MDMPolicyItem policy={mdmEnabledStatus} policyResult={fleetPolicyResultsMap[mdmEnabledStatus.id]} />}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No policies configured for this device.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <Accordion type="single" collapsible>
            {/* System Requirements */}
            <AccordionItem value="system-requirements" className="border rounded-xs mt-4">
              <AccordionTrigger className="px-4 hover:no-underline">
                <span className="text-base">System Requirements</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="text-muted-foreground space-y-2 text-sm">
                  <p>
                    <strong>Operating Systems:</strong> macOS 14+, Windows 10+
                  </p>
                  <p>
                    <strong>Memory:</strong> 512MB RAM minimum
                  </p>
                  <p>
                    <strong>Storage:</strong> 200MB available disk space
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Accordion type="single" collapsible>
            {/* About Comp AI Device Monitor */}
            <AccordionItem value="about" className="border rounded-xs">
              <AccordionTrigger className="px-4 hover:no-underline">
                <span className="text-base">About Comp AI Device Monitor</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="text-muted-foreground space-y-2 text-sm">
                  <p>
                    Comp AI Device Monitor is a lightweight agent that helps ensure your device
                    meets security compliance requirements.
                  </p>
                  <p>
                    It monitors device configuration, installed software, and security settings to
                    help maintain a secure work environment.
                  </p>
                  <p>
                    <strong>Security powered by Comp AI:</strong> Your organization uses Comp AI to
                    maintain security and compliance standards.
                  </p>
                  <p className="text-xs">If you have questions, contact your IT administrator.</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

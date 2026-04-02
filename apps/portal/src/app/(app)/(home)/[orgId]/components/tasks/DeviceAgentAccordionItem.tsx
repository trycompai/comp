'use client';

import {
  LINUX_FILENAME,
  MAC_APPLE_SILICON_FILENAME,
  MAC_INTEL_FILENAME,
  WINDOWS_FILENAME,
} from '@/app/api/download-agent/constants';
import { detectOSFromUserAgent, SupportedOS } from '@/utils/os';
import type { Device, Member } from '@db';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Spinner,
} from '@trycompai/design-system';
import { CheckmarkFilled, CircleDash, Download, Renew } from '@trycompai/design-system/icons';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { FleetPolicy, Host } from '../../types';
import { FleetPolicyItem } from './FleetPolicyItem';

interface DeviceAgentAccordionItemProps {
  member: Member;
  host: Host | null;
  agentDevices: Device[];
  isLoading: boolean;
  fleetPolicies?: FleetPolicy[];
  fetchFleetPolicies: () => void;
}

export function DeviceAgentAccordionItem({
  member,
  host,
  agentDevices,
  isLoading,
  fleetPolicies = [],
  fetchFleetPolicies,
}: DeviceAgentAccordionItemProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [detectedOS, setDetectedOS] = useState<SupportedOS | null>(null);

  const isMacOS = useMemo(
    () => detectedOS === 'macos' || detectedOS === 'macos-intel',
    [detectedOS],
  );

  const hasFleetDevice = host !== null;
  const hasAnyAgentDevice = agentDevices.length > 0;
  const failedPoliciesCount = useMemo(
    () => fleetPolicies.filter((policy) => policy.response !== 'pass').length,
    [fleetPolicies],
  );

  const isCompleted = hasAnyAgentDevice
    ? agentDevices.some((d) => d.isCompliant)
    : hasFleetDevice
      ? failedPoliciesCount === 0
      : false;

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
        credentials: 'include',
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
      } else if (detectedOS === 'linux') {
        a.download = LINUX_FILENAME;
      } else {
        a.download = WINDOWS_FILENAME;
      }

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success('Download started! Check your downloads folder.');
    } catch (error) {
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
          <Spinner size="sm" />
          Downloading...
        </>
      );
    } else {
      return (
        <>
          <Download size={16} />
          Download Agent
        </>
      );
    }
  };

  const handleRefresh = () => {
    fetchFleetPolicies();
  };

  useEffect(() => {
    const detectOS = async () => {
      const os = await detectOSFromUserAgent();
      setDetectedOS(os);
    };
    detectOS();
  }, []);

  return (
    <div className="border rounded-xs">
      <AccordionItem value="device-agent">
        <div className="px-4">
          <AccordionTrigger>
            <div className="flex items-center gap-3">
              {isCompleted ? (
                <div className="text-primary"><CheckmarkFilled size={20} /></div>
              ) : (
                <div className="text-muted-foreground"><CircleDash size={20} /></div>
              )}
              <span className={cn('text-base', isCompleted && 'text-muted-foreground line-through')}>
                Device Agent
              </span>
              {!hasAnyAgentDevice && hasFleetDevice && failedPoliciesCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400 text-xs ml-auto">
                  {failedPoliciesCount} policies failing
                </span>
              )}
            </div>
          </AccordionTrigger>
        </div>
        <AccordionContent>
          <div className="px-4 pb-4 space-y-4">
            <p className="text-sm">
              Installing Comp AI Device Agent helps you and your security administrator keep your
              device protected against security threats.
            </p>

            {agentDevices.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Your Devices
                </p>
                {agentDevices.map((device) => (
                  <Card key={device.id}>
                    <CardHeader>
                      <CardTitle>
                        <span className="text-lg">{device.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {device.isCompliant ? (
                            <div className="text-primary"><CheckmarkFilled size={16} /></div>
                          ) : (
                            <div className="text-amber-600 dark:text-amber-400"><CircleDash size={16} /></div>
                          )}
                          <span className="text-sm">
                            {device.isCompliant
                              ? 'All security checks passing'
                              : 'Some security checks need attention'}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {device.platform} &middot; {device.osVersion}
                          {device.lastCheckIn && (
                            <> &middot; Last check-in: {new Date(device.lastCheckIn).toLocaleDateString()}</>
                          )}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!hasAnyAgentDevice && hasFleetDevice && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle>
                      <span className="text-lg">{host.computer_name}</span>
                    </CardTitle>
                    <Button
                      variant="ghost"
                      onClick={handleRefresh}
                      disabled={isLoading}
                      iconLeft={<div className={cn(isLoading && 'animate-spin')}><Renew size={16} /></div>}
                    >
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {fleetPolicies.length > 0 ? (
                      <>
                        {fleetPolicies.map((policy) => (
                          <FleetPolicyItem
                            key={policy.id}
                            policy={policy}
                            organizationId={member.organizationId}
                            onRefresh={handleRefresh}
                          />
                        ))}
                      </>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No policies configured for this device.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {hasAnyAgentDevice ? 'Add Another Device' : 'Install on a Device'}
              </p>
              <ol className="list-decimal space-y-4 pl-5 text-sm">
                <li>
                  <strong>Download the Device Agent installer.</strong>
                  <p className="mt-1">
                    Click the download button below to get the Device Agent installer.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {isMacOS && (
                      <div className="w-[136px]">
                        <Select
                          value={detectedOS || 'macos'}
                          onValueChange={(value) => { if (value) setDetectedOS(value as SupportedOS); }}
                        >
                          <SelectTrigger>
                            <span>{detectedOS === 'macos-intel' ? 'Intel' : 'Apple Silicon'}</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="macos">Apple Silicon</SelectItem>
                            <SelectItem value="macos-intel">Intel</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button onClick={handleDownload} disabled={isDownloading}>
                      {getButtonContent()}
                    </Button>
                  </div>
                </li>
                <li>
                  <strong>Install the Comp AI Device Agent</strong>
                  <p className="mt-1">
                    {isMacOS
                      ? 'Double-click the downloaded DMG file and follow the installation instructions.'
                      : detectedOS === 'linux'
                        ? 'Install the downloaded DEB package using your package manager or by double-clicking it.'
                        : 'Double-click the downloaded EXE file and follow the installation instructions.'}
                  </p>
                </li>
                <li>
                  <strong>Login with your work email</strong>
                  <p className="mt-1">
                    After installation, login with your work email, select your organization and
                    then click &quot;Link Device&quot;.
                  </p>
                </li>
              </ol>
            </div>

            <div className="mt-4 space-y-2">
              <Accordion>
                <div className="border rounded-xs mt-4">
                  <AccordionItem value="system-requirements">
                    <div className="px-4">
                      <AccordionTrigger>
                        <span className="text-base">System Requirements</span>
                      </AccordionTrigger>
                    </div>
                    <AccordionContent>
                      <div className="px-4 pb-4 text-muted-foreground space-y-2 text-sm">
                        <p>
                          <strong>Operating Systems:</strong> macOS 14+, Windows 10+, Linux (Ubuntu 20.04+)
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
                </div>
              </Accordion>

              <Accordion>
                <div className="border rounded-xs">
                  <AccordionItem value="about">
                    <div className="px-4">
                      <AccordionTrigger>
                        <span className="text-base">About Comp AI Device Monitor</span>
                      </AccordionTrigger>
                    </div>
                    <AccordionContent>
                      <div className="px-4 pb-4 text-muted-foreground space-y-2 text-sm">
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
                </div>
              </Accordion>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}

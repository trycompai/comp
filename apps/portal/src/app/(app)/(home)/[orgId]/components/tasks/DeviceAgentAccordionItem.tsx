'use client';

import { detectOSFromUserAgent, type SupportedOS } from '@/utils/os';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { cn } from '@comp/ui/cn';
import type { Member } from '@db';
import { Badge, Button } from '@trycompai/design-system';
import { CheckmarkFilled, CircleDash, Download, Renew } from '@trycompai/design-system/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FleetPolicy, Host } from '../../types';
import { FleetPolicyItem } from './FleetPolicyItem';

interface DeviceStatus {
  id: string;
  name: string;
  hostname: string;
  platform: string;
  osVersion: string;
  isCompliant: boolean;
  diskEncryptionEnabled: boolean;
  antivirusEnabled: boolean;
  passwordPolicySet: boolean;
  screenLockEnabled: boolean;
  checkDetails: Record<string, { method?: string; raw?: string; message?: string; exception?: string; passed?: boolean; checkedAt?: string }> | null;
  lastCheckIn: string | null;
}

const CHECK_FIELDS = [
  { key: 'diskEncryptionEnabled' as const, dbKey: 'disk_encryption', label: 'Disk Encryption' },
  { key: 'antivirusEnabled' as const, dbKey: 'antivirus', label: 'Antivirus' },
  { key: 'passwordPolicySet' as const, dbKey: 'password_policy', label: 'Password Policy' },
  { key: 'screenLockEnabled' as const, dbKey: 'screen_lock', label: 'Screen Lock' },
];

interface DeviceAgentAccordionItemProps {
  organizationId: string;
  member: Member;
  host: Host | null;
  fleetPolicies: FleetPolicy[];
  isFleetLoading: boolean;
  fetchFleetPolicies: () => void;
}

export function DeviceAgentAccordionItem({
  organizationId,
  member,
  host,
  fleetPolicies,
  isFleetLoading,
  fetchFleetPolicies,
}: DeviceAgentAccordionItemProps) {
  const [detectedOS, setDetectedOS] = useState<SupportedOS | null>(null);
  const [isLoadingDeviceAgent, setIsLoadingDeviceAgent] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [devices, setDevices] = useState<DeviceStatus[]>([]);

  const isMacOS = useMemo(
    () => detectedOS === 'macos' || detectedOS === 'macos-intel',
    [detectedOS],
  );
  const isLinux = useMemo(() => detectedOS === 'linux', [detectedOS]);

  // Device-agent state
  const hasDeviceAgentDevices = devices.length > 0;
  const allDeviceAgentCompliant = devices.length > 0 && devices.every((d) => d.isCompliant);
  const failingDeviceAgentChecks = devices.reduce(
    (count, device) =>
      count + CHECK_FIELDS.filter(({ key }) => !device[key]).length,
    0,
  );

  // Fleet state
  const hasFleetDevice = host !== null;
  const failedFleetPolicies = useMemo(
    () => fleetPolicies.filter((policy) => policy.response !== 'pass').length,
    [fleetPolicies],
  );

  // Overall completion: either device-agent compliant OR all fleet policies pass
  const isCompleted =
    (hasDeviceAgentDevices && allDeviceAgentCompliant) ||
    (hasFleetDevice && failedFleetPolicies === 0 && fleetPolicies.length > 0);

  const fetchDeviceStatus = useCallback(async () => {
    setIsLoadingDeviceAgent(true);
    try {
      const response = await fetch(
        `/api/device-agent/status?organizationId=${encodeURIComponent(organizationId)}`,
      );
      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices || []);
      }
    } catch (error) {
      console.error('Failed to fetch device status:', error);
    } finally {
      setIsLoadingDeviceAgent(false);
    }
  }, [organizationId]);

  useEffect(() => {
    const detectOS = async () => {
      const os = await detectOSFromUserAgent();
      setDetectedOS(os);
    };
    detectOS();
    fetchDeviceStatus();
  }, [fetchDeviceStatus]);

  const handleRefreshFleet = () => {
    fetchFleetPolicies();
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch('/api/download-agent/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: organizationId, employeeId: member.id, os: detectedOS }),
      });
      if (!res.ok) throw new Error('Failed to get download token');
      const { token } = await res.json();
      window.location.href = `/api/download-agent?token=${token}`;
    } catch (e) {
      console.error('Download failed:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  // Determine what kind of failure indicator to show in the accordion trigger
  const failureIndicator = useMemo(() => {
    if (hasDeviceAgentDevices && failingDeviceAgentChecks > 0) {
      return `${failingDeviceAgentChecks} check${failingDeviceAgentChecks !== 1 ? 's' : ''} failing`;
    }
    if (!hasDeviceAgentDevices && hasFleetDevice && failedFleetPolicies > 0) {
      return `${failedFleetPolicies} ${failedFleetPolicies !== 1 ? 'policies' : 'policy'} failing`;
    }
    return null;
  }, [hasDeviceAgentDevices, failingDeviceAgentChecks, hasFleetDevice, failedFleetPolicies]);

  return (
    <AccordionItem value="device-agent" className="border rounded-xs">
      <AccordionTrigger className="px-4 hover:no-underline [&[data-state=open]]:pb-2">
        <div className="flex items-center gap-3">
          {isCompleted ? (
            <CheckmarkFilled size={20} className="text-primary" />
          ) : (
            <CircleDash size={20} className="text-muted-foreground" />
          )}
          <span className={cn('text-base', isCompleted && 'text-muted-foreground line-through')}>
            Download and install Comp AI Device Agent
          </span>
          {failureIndicator && (
            <span className="text-amber-600 dark:text-amber-400 text-xs ml-auto">
              {failureIndicator}
            </span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Installing Comp AI Device Agent helps you and your security administrator keep your
            device protected against security threats.
          </p>

          {/* THREE-WAY RENDERING */}
          {hasDeviceAgentDevices ? (
            /* 1. Device-agent devices found -- show device check results */
            <div className="space-y-4">
              {devices.map((device) => (
                <div key={device.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">{device.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {device.platform === 'macos'
                        ? 'macOS'
                        : device.platform === 'linux'
                          ? 'Linux'
                          : 'Windows'}{' '}
                      {device.osVersion}
                    </span>
                    <div className="ml-auto">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchDeviceStatus}
                        disabled={isLoadingDeviceAgent}
                      >
                        <Renew size={16} className={cn(isLoadingDeviceAgent && 'animate-spin')} />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {CHECK_FIELDS.map(({ key, dbKey, label }) => {
                      const passed = device[key];
                      const details = device.checkDetails?.[dbKey];
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <span className="text-sm font-medium">{label}</span>
                            {details?.message && (
                              <p className="text-muted-foreground text-xs">
                                {details.message}
                              </p>
                            )}
                            {details?.exception && (
                              <p className="text-amber-600 dark:text-amber-400 text-xs mt-0.5">
                                {details.exception}
                              </p>
                            )}
                          </div>
                          <Badge variant={passed ? 'default' : 'destructive'}>
                            {passed ? 'Pass' : 'Fail'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                  {device.lastCheckIn && (
                    <p className="text-muted-foreground text-xs">
                      Last check-in: {new Date(device.lastCheckIn).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : hasFleetDevice ? (
            /* 2. Fleet device found (legacy) -- show fleet policy list */
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{host!.computer_name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefreshFleet}
                    disabled={isFleetLoading}
                  >
                    <Renew size={16} className={cn(isFleetLoading && 'animate-spin')} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {fleetPolicies.length > 0 ? (
                  <>
                    {fleetPolicies.map((policy) => (
                      <FleetPolicyItem
                        key={policy.id}
                        policy={policy}
                        organizationId={member.organizationId}
                        onRefresh={handleRefreshFleet}
                      />
                    ))}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No policies configured for this device.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            /* 3. Neither -- show download instructions for new device agent */
            <div className="space-y-4">
              <ol className="list-decimal space-y-4 pl-5 text-sm">
                <li>
                  <strong>Download the Device Agent installer.</strong>
                  <p className="mt-1">
                    Download the latest Device Agent installer for your operating system.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      size="sm"
                      iconLeft={<Download size={16} />}
                      onClick={handleDownload}
                      loading={isDownloading}
                    >
                      {`Download${detectedOS ? ` for ${isMacOS ? 'macOS' : isLinux ? 'Linux' : 'Windows'}` : ''}`}
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    or{' '}
                    <a
                      href="https://github.com/trycompai/comp/releases"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      download from GitHub
                    </a>
                  </p>
                </li>
                <li>
                  <strong>Install the Comp AI Device Agent</strong>
                  <p className="mt-1">
                    {isMacOS
                      ? 'Double-click the downloaded DMG file and drag the app to your Applications folder.'
                      : isLinux
                        ? 'Install the downloaded .deb package using your package manager (e.g. sudo dpkg -i CompAI-Device-Agent.deb).'
                        : 'Double-click the downloaded EXE file and follow the installation instructions.'}
                  </p>
                </li>
                <li>
                  <strong>Sign in with your work email</strong>
                  <p className="mt-1">
                    After installation, the agent will appear in your system tray. Click it and sign
                    in with the same credentials you use for this portal. The agent will
                    automatically run compliance checks on your device.
                  </p>
                </li>
              </ol>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <Accordion type="single" collapsible>
            <AccordionItem value="system-requirements" className="border rounded-xs mt-4">
              <AccordionTrigger className="px-4 hover:no-underline">
                <span className="text-base">System Requirements</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="text-muted-foreground space-y-2 text-sm">
                  <p>
                    <strong>Operating Systems:</strong> macOS 14+, Windows 10+, Debian 11+ / Ubuntu
                    20.04+
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
            <AccordionItem value="about" className="border rounded-xs">
              <AccordionTrigger className="px-4 hover:no-underline">
                <span className="text-base">About Comp AI Device Agent</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="text-muted-foreground space-y-2 text-sm">
                  <p>
                    Comp AI Device Agent is a lightweight system tray application that monitors your
                    device's compliance with your organization's security requirements.
                  </p>
                  <p>It checks for:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Disk encryption (FileVault on macOS, BitLocker on Windows, LUKS on Linux)
                    </li>
                    <li>Antivirus software (XProtect, Windows Defender, ClamAV, or third-party)</li>
                    <li>Minimum password length policy (8+ characters)</li>
                    <li>Screen lock timeout (5 minutes or less)</li>
                  </ul>
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

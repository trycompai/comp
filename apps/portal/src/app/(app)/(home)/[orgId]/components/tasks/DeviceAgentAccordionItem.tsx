'use client';

import type { Member } from '@comp/db/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { cn } from '@comp/ui/cn';
import { CheckCircle2, Circle, Download, XCircle } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'sonner';
import type { FleetPolicy, Host } from '../../types';

interface DeviceAgentAccordionItemProps {
  member: Member;
  host: Host | null;
  fleetPolicies?: FleetPolicy[];
}

export function DeviceAgentAccordionItem({
  member,
  host,
  fleetPolicies = [],
}: DeviceAgentAccordionItemProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const hasInstalledAgent = host !== null;
  const allPoliciesPass =
    fleetPolicies.length === 0 || fleetPolicies.every((policy) => policy.response === 'pass');
  const isCompleted = hasInstalledAgent && allPoliciesPass;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/download-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: member.organizationId,
          employeeId: member.id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to download agent.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'compai-device-agent.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setIsDownloading(false);
    }
  };

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
          {hasInstalledAgent && !allPoliciesPass && (
            <span className="text-amber-600 dark:text-amber-400 text-xs ml-auto">
              {fleetPolicies.filter((p) => p.response !== 'pass').length} policies failing
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
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleDownload}
                    disabled={isDownloading || hasInstalledAgent}
                    className="gap-2 mt-2"
                  >
                    <Download className="h-4 w-4" />
                    {isDownloading ? 'Downloading...' : 'Download Agent'}
                  </Button>
                </li>
                <li>
                  <strong>Run the "Install Me First" file</strong>
                  <p className="mt-1">
                    After extracting the downloaded zip file, locate and run the "Install Me First"
                    file to prepare your system.
                  </p>
                </li>
                <li>
                  <strong>Run the Comp AI Device Agent installer</strong>
                  <p className="mt-1">
                    Follow the installation wizard steps. When you reach the introduction screen (as
                    shown below), click "Continue" to proceed through the installation.
                  </p>
                  <Image
                    src="/osquery-agent.jpeg"
                    alt="Fleet osquery installer introduction screen"
                    width={600}
                    height={400}
                    className="mt-2 rounded-xs border"
                  />
                </li>
                <li>
                  <strong>Enable MDM</strong>
                  <div className="space-y-2">
                    <p>
                      On Mac, on the top of your screen, find the Fleet Desktop app which looks like
                      an F made of dots. Click on it and click My Device.
                    </p>
                    <p>
                      You should see a banner that asks you to enable MDM. Click the button and
                      follow the instructions.
                    </p>
                    <p>
                      After you've enabled MDM, if you refresh the page, the banner will disappear.
                      Now your computer will automatically enable the necessary settings on your
                      computer in order to be compliant.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{host.computer_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {fleetPolicies.length > 0 ? (
                  fleetPolicies.map((policy) => (
                    <div
                      key={policy.id}
                      className={cn(
                        'hover:bg-muted/50 flex items-center justify-between rounded-md border border-l-4 p-3 shadow-sm transition-colors',
                        policy.response === 'pass' ? 'border-l-green-500' : 'border-l-red-500',
                      )}
                    >
                      <p className="text-sm font-medium">{policy.name}</p>
                      {policy.response === 'pass' ? (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle2 size={16} />
                          <span className="text-sm">Pass</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <XCircle size={16} />
                          <span className="text-sm">Fail</span>
                        </div>
                      )}
                    </div>
                  ))
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
                    <strong>Operating Systems:</strong> macOS 10.14+, Windows 10+, Ubuntu 18.04+
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

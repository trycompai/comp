'use client';

import { Card, CardContent, CardHeader, cn } from '@trycompai/ui-shadcn';
import { CheckCircle2, HelpCircle, XCircle } from 'lucide-react';

import type { EmployeePortalDashboard } from '../../../types/employee-portal';

interface DeviceAgentPolicyStatusCardProps {
  host: NonNullable<EmployeePortalDashboard['host']>;
  fleetPolicies: EmployeePortalDashboard['fleetPolicies'];
  isMacOS: boolean;
  mdmEnabledStatus: { name: string; response: 'pass' | 'fail' };
}

export function DeviceAgentPolicyStatusCard({
  host,
  fleetPolicies,
  isMacOS,
  mdmEnabledStatus,
}: DeviceAgentPolicyStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-base font-semibold">{host.computer_name}</h3>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {fleetPolicies.length > 0 ? (
            <>
              {fleetPolicies.map((policy) => {
                const isPass = policy.response === 'pass';
                return (
                  <div
                    key={policy.id}
                    className={cn(
                      'flex items-center justify-between rounded-md border border-border border-l-4 p-3',
                      isPass ? 'border-l-green-500' : 'border-l-red-500',
                    )}
                  >
                    <p className="text-sm font-medium">{policy.name}</p>
                    <div
                      className={cn(
                        'inline-flex items-center gap-1 text-sm',
                        isPass
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400',
                      )}
                    >
                      {isPass ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      <span>{isPass ? 'Pass' : 'Fail'}</span>
                    </div>
                  </div>
                );
              })}

              {isMacOS ? (
                <div
                  className={cn(
                    'flex items-center justify-between rounded-md border border-border border-l-4 p-3',
                    mdmEnabledStatus.response === 'pass'
                      ? 'border-l-green-500'
                      : 'border-l-red-500',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{mdmEnabledStatus.name}</p>
                    {mdmEnabledStatus.response === 'fail' ? (
                      <a
                        href="https://trycomp.ai/docs/device-agent#mdm-user-guide"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Open MDM instructions"
                      >
                        <HelpCircle size={14} />
                      </a>
                    ) : null}
                  </div>
                  <div
                    className={cn(
                      'inline-flex items-center gap-1 text-sm',
                      mdmEnabledStatus.response === 'pass'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400',
                    )}
                  >
                    {mdmEnabledStatus.response === 'pass' ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <XCircle size={16} />
                    )}
                    <span>{mdmEnabledStatus.response === 'pass' ? 'Pass' : 'Fail'}</span>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No policies configured for this device.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

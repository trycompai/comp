import { Button } from '@comp/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { cn } from '@comp/ui/cn';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { useMemo } from 'react';
import type { Host } from '../types';

export const HostDetails = ({ host, onClose }: { host: Host; onClose: () => void }) => {
  const isMacOS = useMemo(() => {
    return host.cpu_type && (host.cpu_type.includes('arm64') || host.cpu_type.includes('intel'));
  }, [host]);

  const mdmEnabledStatus = useMemo(() => {
    return {
      id: 'mdm',
      response: host?.mdm.connected_to_fleet ? 'pass' : 'fail',
      name: 'MDM Enabled',
    };
  }, [host]);

  return (
    <div className="space-y-4">
      <Button variant="outline" className="w-min" onClick={onClose}>
        <ArrowLeft size={16} className="mr-2" />
        Back
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{host.computer_name}'s Policies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {host.policies.length > 0 ? (
            <>
              {host.policies.map((policy) => (
                <div
                  key={policy.id}
                  className={cn(
                    'hover:bg-muted/50 flex items-center justify-between rounded-md border border-l-4 p-3 shadow-sm transition-colors',
                    policy.response === 'pass' ? 'border-l-primary' : 'border-l-red-500',
                  )}
                >
                  <p className="font-medium">{policy.name}</p>
                  {policy.response === 'pass' ? (
                    <div className="flex items-center gap-1 text-primary">
                      <CheckCircle2 size={16} />
                      <span>Pass</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-600">
                      <XCircle size={16} />
                      <span>Fail</span>
                    </div>
                  )}
                </div>
              ))}
              {isMacOS && (
                <div
                  key={mdmEnabledStatus.id}
                  className={cn(
                    'hover:bg-muted/50 flex items-center justify-between rounded-md border border-l-4 p-3 shadow-sm transition-colors',
                    mdmEnabledStatus.response === 'pass' ? 'border-l-primary' : 'border-l-red-500',
                  )}
                >
                  <p className="font-medium">{mdmEnabledStatus.name}</p>
                  {mdmEnabledStatus.response === 'pass' ? (
                    <div className="flex items-center gap-1 text-primary">
                      <CheckCircle2 size={16} />
                      <span>Pass</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-600">
                      <XCircle size={16} />
                      <span>Fail</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No policies found for this device.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

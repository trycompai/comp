import { Button } from '@comp/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';
import type { FleetPolicy, Host } from '../types';
import { PolicyItem } from './PolicyItem';

export const HostDetails = ({ host, onClose }: { host: Host; onClose: () => void }) => {
  const isMacOS = useMemo(() => {
    return host.cpu_type && (host.cpu_type.includes('arm64') || host.cpu_type.includes('intel'));
  }, [host]);

  const mdmEnabledStatus = useMemo<FleetPolicy>(() => {
    return {
      id: 9999,
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
                <PolicyItem key={policy.id} policy={policy} />
              ))}
              {isMacOS && <PolicyItem policy={mdmEnabledStatus} />}
            </>
          ) : (
            <p className="text-muted-foreground">No policies found for this device.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

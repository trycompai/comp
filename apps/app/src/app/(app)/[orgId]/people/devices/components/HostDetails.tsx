import { Button } from '@comp/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { ArrowLeft } from 'lucide-react';
import type { Host } from '../types';
import { PolicyItem } from './PolicyItem';

export const HostDetails = ({ host, onClose }: { host: Host; onClose: () => void }) => {
  return (
    <div className="space-y-4">
      <Button variant="outline" className="w-min" onClick={onClose}>
        <ArrowLeft size={16} className="mr-2" />
        Back
      </Button>
      <Card style={{ marginBottom: 48 }}>
        <CardHeader>
          <CardTitle>{host.computer_name}'s Policies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {host.policies.length > 0 ? (
            <>
              {host.policies.map((policy) => (
                <PolicyItem key={policy.id} policy={policy} />
              ))}
            </>
          ) : (
            <p className="text-muted-foreground">No policies found for this device.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

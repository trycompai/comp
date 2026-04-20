'use client';

import { Skeleton } from '@trycompai/design-system';
import { useMemo } from 'react';
import { useAgentDevices } from '../hooks/useAgentDevices';
import { useFleetHosts } from '../hooks/useFleetHosts';
import { DeviceAgentDevicesList } from './DeviceAgentDevicesList';
import { DeviceComplianceChart } from './DeviceComplianceChart';
import { EmployeeDevicesList } from './EmployeeDevicesList';

interface DevicesTabContentProps {
  isCurrentUserOwner: boolean;
}

export function DevicesTabContent({ isCurrentUserOwner }: DevicesTabContentProps) {
  const {
    agentDevices,
    isLoading: isAgentLoading,
    error: agentError,
  } = useAgentDevices();
  const {
    fleetHosts,
    isLoading: isFleetLoading,
    error: fleetError,
  } = useFleetHosts();

  // Filter out Fleet hosts for members who already have device-agent devices.
  // Device agent takes priority over Fleet.
  const filteredFleetDevices = useMemo(() => {
    const memberIdsWithAgent = new Set(
      agentDevices.map((d) => d.memberId).filter(Boolean),
    );
    return fleetHosts.filter(
      (host) => !host.member_id || !memberIdsWithAgent.has(host.member_id),
    );
  }, [agentDevices, fleetHosts]);

  const error = agentError ?? fleetError;

  // Show a skeleton only while the fast agent-devices fetch is in flight; the
  // slower Fleet call (hosted elsewhere) streams in separately so the page
  // doesn't block on it.
  if (isAgentLoading) {
    return (
      <div className="space-y-6">
        <div className="my-6 h-[360px] w-full">
          <Skeleton style={{ height: '100%', width: '100%' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Failed to load device data. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DeviceComplianceChart
        fleetDevices={filteredFleetDevices}
        agentDevices={agentDevices}
      />

      {agentDevices.length > 0 && (
        <DeviceAgentDevicesList devices={agentDevices} />
      )}

      {isFleetLoading ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-muted-foreground/70" />
          Loading devices from Fleet…
        </div>
      ) : (
        filteredFleetDevices.length > 0 && (
          <EmployeeDevicesList
            devices={filteredFleetDevices}
            isCurrentUserOwner={isCurrentUserOwner}
          />
        )
      )}
    </div>
  );
}

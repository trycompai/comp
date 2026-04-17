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

  const isLoading = isAgentLoading || isFleetLoading;
  const error = agentError ?? fleetError;

  if (isLoading) {
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

      {filteredFleetDevices.length > 0 && (
        <EmployeeDevicesList
          devices={filteredFleetDevices}
          isCurrentUserOwner={isCurrentUserOwner}
        />
      )}
    </div>
  );
}

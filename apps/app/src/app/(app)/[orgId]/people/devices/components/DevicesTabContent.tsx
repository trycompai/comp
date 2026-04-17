'use client';

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
  const { agentDevices } = useAgentDevices();
  const { fleetHosts } = useFleetHosts();

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

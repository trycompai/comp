import { DeviceComplianceChart } from './components/DeviceComplianceChart';
import { EmployeeDevicesList } from './components/EmployeeDevicesList';
import { getEmployeeDevices } from './data';
import type { Host } from './types';

export default async function EmployeeDevicesPage() {
  let devices: Host[] = [];

  try {
    const fetchedDevices = await getEmployeeDevices();
    devices = fetchedDevices || [];
  } catch (error) {
    console.error('Error fetching employee devices:', error);
    // Return empty array on error to render empty state
    devices = [];
  }

  return (
    <div>
      <DeviceComplianceChart devices={devices} />
      <EmployeeDevicesList devices={devices} />
    </div>
  );
}

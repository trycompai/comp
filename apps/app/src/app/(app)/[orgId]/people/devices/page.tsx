import { EmployeeDevicesList } from './components/EmployeeDevicesList';
import { DeviceComplianceChart } from './components/DeviceComplianceChart';
import { getEmployeeDevices } from './data';

export default async function EmployeeDevicesPage() {
  const devices = (await getEmployeeDevices()) || [];

  return (
    <div>
      <DeviceComplianceChart devices={devices} />
      <EmployeeDevicesList devices={devices} />
    </div>
  );
}

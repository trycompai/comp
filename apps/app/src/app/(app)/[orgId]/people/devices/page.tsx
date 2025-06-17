import { DeviceComplianceChart } from './components/DeviceComplianceChart';
import { EmployeeDevicesList } from './components/EmployeeDevicesList';
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

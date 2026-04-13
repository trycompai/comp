import type { SecurityFinding } from '../../cloud-security.service';
import type { AzureServiceAdapter } from './azure-service-adapter';
import { fetchAllPages } from './azure-service-adapter';

interface VirtualMachine {
  id: string;
  name: string;
  location: string;
  identity?: {
    type: string; // 'SystemAssigned' | 'UserAssigned' | 'None'
  };
  properties: {
    storageProfile?: {
      osDisk?: {
        managedDisk?: {
          diskEncryptionSet?: { id: string };
        };
        encryptionSettings?: { enabled: boolean };
      };
    };
    osProfile?: {
      linuxConfiguration?: {
        disablePasswordAuthentication?: boolean;
      };
      windowsConfiguration?: unknown;
    };
    networkProfile?: {
      networkInterfaces?: Array<{ id: string }>;
    };
    securityProfile?: {
      securityType?: string; // 'TrustedLaunch' | etc.
      uefiSettings?: {
        secureBootEnabled?: boolean;
        vTpmEnabled?: boolean;
      };
    };
  };
}

export class VirtualMachineAdapter implements AzureServiceAdapter {
  readonly serviceId = 'virtual-machine';

  async scan({ accessToken, subscriptionId }: {
    accessToken: string;
    subscriptionId: string;
  }): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    const vms = await fetchAllPages<VirtualMachine>(
      accessToken,
      `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Compute/virtualMachines?api-version=2024-03-01`,
    );

    if (vms.length === 0) return findings;

    for (const vm of vms) {
      // Check 1: Managed identity
      const hasIdentity = vm.identity?.type && vm.identity.type !== 'None';
      if (!hasIdentity) {
        findings.push(this.finding(vm, {
          key: 'no-managed-identity',
          title: `No Managed Identity: ${vm.name}`,
          description: `VM "${vm.name}" does not use a managed identity. Managed identities eliminate credential management and are more secure than service principals.`,
          severity: 'medium',
          remediation: 'Enable system-assigned or user-assigned managed identity on the VM.',
        }));
      }

      // Check 2: OS disk encryption
      const osDisk = vm.properties.storageProfile?.osDisk;
      const hasEncryption = osDisk?.managedDisk?.diskEncryptionSet?.id
        || osDisk?.encryptionSettings?.enabled;
      if (!hasEncryption) {
        findings.push(this.finding(vm, {
          key: 'disk-not-encrypted',
          title: `OS Disk Not Encrypted with CMK: ${vm.name}`,
          description: `VM "${vm.name}" OS disk does not use customer-managed key encryption. Azure encrypts by default with platform keys, but CMK provides more control.`,
          severity: 'low',
          remediation: 'Enable disk encryption with a customer-managed key via Azure Disk Encryption or Disk Encryption Sets.',
        }));
      }

      // Check 3: Linux VMs — password auth
      const linuxConfig = vm.properties.osProfile?.linuxConfiguration;
      if (linuxConfig && linuxConfig.disablePasswordAuthentication === false) {
        findings.push(this.finding(vm, {
          key: 'password-auth-enabled',
          title: `SSH Password Authentication Enabled: ${vm.name}`,
          description: `Linux VM "${vm.name}" allows SSH password authentication. Use SSH keys instead for stronger security.`,
          severity: 'medium',
          remediation: 'Disable password authentication and use SSH key-based authentication only.',
        }));
      }

      // Check 4: Trusted Launch
      const secProfile = vm.properties.securityProfile;
      if (secProfile?.securityType === 'TrustedLaunch') {
        if (!secProfile.uefiSettings?.secureBootEnabled) {
          findings.push(this.finding(vm, {
            key: 'secure-boot-disabled',
            title: `Secure Boot Disabled: ${vm.name}`,
            description: `VM "${vm.name}" supports Trusted Launch but Secure Boot is not enabled.`,
            severity: 'low',
            remediation: 'Enable Secure Boot in the VM security settings.',
          }));
        }
      }
    }

    if (findings.length === 0) {
      findings.push({
        id: `azure-vm-ok-${subscriptionId}`,
        title: 'Virtual Machine Security',
        description: `All ${vms.length} VM(s) are properly configured.`,
        severity: 'info',
        resourceType: 'virtual-machine',
        resourceId: subscriptionId,
        remediation: 'No action needed.',
        evidence: { serviceId: this.serviceId, serviceName: 'Virtual Machines', findingKey: 'azure-virtual-machine-all-ok' },
        createdAt: new Date().toISOString(),
        passed: true,
      });
    }

    return findings;
  }

  private finding(vm: VirtualMachine, opts: {
    key: string; title: string; description: string;
    severity: SecurityFinding['severity']; remediation: string;
  }): SecurityFinding {
    return {
      id: `azure-vm-${opts.key}-${vm.name}`,
      title: opts.title,
      description: opts.description,
      severity: opts.severity,
      resourceType: 'virtual-machine',
      resourceId: vm.id,
      remediation: opts.remediation,
      evidence: {
        serviceId: this.serviceId,
        serviceName: 'Virtual Machines',
        findingKey: `azure-virtual-machine-${opts.key}`,
        vmName: vm.name,
        location: vm.location,
      },
      createdAt: new Date().toISOString(),
    };
  }
}

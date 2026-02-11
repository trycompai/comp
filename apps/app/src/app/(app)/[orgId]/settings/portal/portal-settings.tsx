'use client';

import { updateOrganizationDeviceAgentStepAction } from '@/actions/organization/update-organization-device-agent-step-action';
import { updateOrganizationSecurityTrainingStepAction } from '@/actions/organization/update-organization-security-training-step-action';
import { SettingGroup, SettingRow, Switch } from '@trycompai/design-system';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

interface PortalSettingsProps {
  deviceAgentStepEnabled: boolean;
  securityTrainingStepEnabled: boolean;
}

export function PortalSettings({
  deviceAgentStepEnabled,
  securityTrainingStepEnabled,
}: PortalSettingsProps) {
  const updateDeviceAgentStep = useAction(updateOrganizationDeviceAgentStepAction, {
    onSuccess: () => toast.success('Device agent step setting updated'),
    onError: () => toast.error('Error updating device agent step setting'),
  });

  const updateSecurityTrainingStep = useAction(updateOrganizationSecurityTrainingStepAction, {
    onSuccess: () => toast.success('Security training step setting updated'),
    onError: () => toast.error('Error updating security training step setting'),
  });

  return (
    <SettingGroup>
      <SettingRow
        size="lg"
        label="Show Device Agent Step"
        description="Employees will be asked to download and install Comp AI's device agent on their device."
      >
        <Switch
          checked={deviceAgentStepEnabled}
          onCheckedChange={(checked) => {
            updateDeviceAgentStep.execute({ deviceAgentStepEnabled: checked });
          }}
          disabled={updateDeviceAgentStep.status === 'executing'}
        />
      </SettingRow>
      <SettingRow
        size="lg"
        label="Show Security Training Step"
        description="Employees will be required to complete Comp AI's security awareness training videos."
      >
        <Switch
          checked={securityTrainingStepEnabled}
          onCheckedChange={(checked) => {
            updateSecurityTrainingStep.execute({ securityTrainingStepEnabled: checked });
          }}
          disabled={updateSecurityTrainingStep.status === 'executing'}
        />
      </SettingRow>
    </SettingGroup>
  );
}

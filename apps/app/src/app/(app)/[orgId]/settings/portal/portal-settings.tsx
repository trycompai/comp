'use client';

import { useOrganizationMutations } from '@/hooks/use-organization-mutations';
import { usePermissions } from '@/hooks/use-permissions';
import { SettingGroup, SettingRow, Switch } from '@trycompai/design-system';
import { useState } from 'react';
import { toast } from 'sonner';

interface PortalSettingsProps {
  deviceAgentStepEnabled: boolean;
  securityTrainingStepEnabled: boolean;
}

export function PortalSettings({
  deviceAgentStepEnabled,
  securityTrainingStepEnabled,
}: PortalSettingsProps) {
  const { updateOrganization } = useOrganizationMutations();
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('organization', 'update');
  const [isSavingDevice, setIsSavingDevice] = useState(false);
  const [isSavingTraining, setIsSavingTraining] = useState(false);

  const handleDeviceAgentToggle = async (checked: boolean) => {
    setIsSavingDevice(true);
    try {
      await updateOrganization({ deviceAgentStepEnabled: checked });
      toast.success('Device agent step setting updated');
    } catch {
      toast.error('Error updating device agent step setting');
    } finally {
      setIsSavingDevice(false);
    }
  };

  const handleSecurityTrainingToggle = async (checked: boolean) => {
    setIsSavingTraining(true);
    try {
      await updateOrganization({ securityTrainingStepEnabled: checked });
      toast.success('Security training step setting updated');
    } catch {
      toast.error('Error updating security training step setting');
    } finally {
      setIsSavingTraining(false);
    }
  };

  return (
    <SettingGroup>
      <SettingRow
        size="lg"
        label="Show Device Agent Step"
        description="Employees will be asked to download and install Comp AI's device agent on their device."
      >
        <Switch
          checked={deviceAgentStepEnabled}
          onCheckedChange={handleDeviceAgentToggle}
          disabled={!canUpdate || isSavingDevice}
        />
      </SettingRow>
      <SettingRow
        size="lg"
        label="Show Security Training Step"
        description="Employees will be required to complete Comp AI's security awareness training videos."
      >
        <Switch
          checked={securityTrainingStepEnabled}
          onCheckedChange={handleSecurityTrainingToggle}
          disabled={!canUpdate || isSavingTraining}
        />
      </SettingRow>
    </SettingGroup>
  );
}

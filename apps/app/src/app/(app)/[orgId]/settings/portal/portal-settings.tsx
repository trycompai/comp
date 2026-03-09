'use client';

import { useOrganizationMutations } from '@/hooks/use-organization-mutations';
import { usePermissions } from '@/hooks/use-permissions';
import { SettingGroup, SettingRow, Switch } from '@trycompai/design-system';
import { useState } from 'react';
import { toast } from 'sonner';

interface PortalSettingsProps {
  deviceAgentStepEnabled: boolean;
  securityTrainingStepEnabled: boolean;
  whistleblowerReportEnabled: boolean;
  accessRequestFormEnabled: boolean;
}

export function PortalSettings({
  deviceAgentStepEnabled,
  securityTrainingStepEnabled,
  whistleblowerReportEnabled,
  accessRequestFormEnabled,
}: PortalSettingsProps) {
  const { hasPermission } = usePermissions();
  const { updateOrganization } = useOrganizationMutations();
  const [updatingField, setUpdatingField] = useState<string | null>(null);

  const handleToggle = async (
    field: string,
    value: boolean,
    successMessage: string,
    errorMessage: string,
  ) => {
    setUpdatingField(field);
    try {
      await updateOrganization({ [field]: value });
      toast.success(successMessage);
    } catch {
      toast.error(errorMessage);
    } finally {
      setUpdatingField(null);
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
          onCheckedChange={(checked) => {
            handleToggle(
              'deviceAgentStepEnabled',
              checked,
              'Device agent step setting updated',
              'Error updating device agent step setting',
            );
          }}
          disabled={!hasPermission('organization', 'update') || updatingField === 'deviceAgentStepEnabled'}
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
            handleToggle(
              'securityTrainingStepEnabled',
              checked,
              'Security training step setting updated',
              'Error updating security training step setting',
            );
          }}
          disabled={!hasPermission('organization', 'update') || updatingField === 'securityTrainingStepEnabled'}
        />
      </SettingRow>
      <SettingRow
        size="lg"
        label="Show Whistleblower Report Form"
        description="Employees can submit whistleblower reports from the employee portal."
      >
        <Switch
          checked={whistleblowerReportEnabled}
          onCheckedChange={(checked) => {
            handleToggle(
              'whistleblowerReportEnabled',
              checked,
              'Whistleblower report visibility updated',
              'Error updating whistleblower report visibility',
            );
          }}
          disabled={!hasPermission('organization', 'update') || updatingField === 'whistleblowerReportEnabled'}
        />
      </SettingRow>
      <SettingRow
        size="lg"
        label="Show Access Request Form"
        description="Employees can submit access requests from the employee portal."
      >
        <Switch
          checked={accessRequestFormEnabled}
          onCheckedChange={(checked) => {
            handleToggle(
              'accessRequestFormEnabled',
              checked,
              'Access request visibility updated',
              'Error updating access request visibility',
            );
          }}
          disabled={!hasPermission('organization', 'update') || updatingField === 'accessRequestFormEnabled'}
        />
      </SettingRow>
    </SettingGroup>
  );
}

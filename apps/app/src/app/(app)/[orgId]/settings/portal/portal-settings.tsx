'use client';

import { updateOrganizationDeviceAgentStepAction } from '@/actions/organization/update-organization-device-agent-step-action';
import { updateOrganizationSecurityTrainingStepAction } from '@/actions/organization/update-organization-security-training-step-action';
import { updateOrganizationWhistleblowerReportAction } from '@/actions/organization/update-organization-whistleblower-report-action';
import { updateOrganizationAccessRequestFormAction } from '@/actions/organization/update-organization-access-request-form-action';
import { SettingGroup, SettingRow, Switch } from '@trycompai/design-system';
import { useAction } from 'next-safe-action/hooks';
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
  const updateDeviceAgentStep = useAction(updateOrganizationDeviceAgentStepAction, {
    onSuccess: () => toast.success('Device agent step setting updated'),
    onError: () => toast.error('Error updating device agent step setting'),
  });

  const updateSecurityTrainingStep = useAction(updateOrganizationSecurityTrainingStepAction, {
    onSuccess: () => toast.success('Security training step setting updated'),
    onError: () => toast.error('Error updating security training step setting'),
  });

  const updateWhistleblowerReport = useAction(updateOrganizationWhistleblowerReportAction, {
    onSuccess: () => toast.success('Whistleblower report visibility updated'),
    onError: () => toast.error('Error updating whistleblower report visibility'),
  });

  const updateAccessRequestForm = useAction(updateOrganizationAccessRequestFormAction, {
    onSuccess: () => toast.success('Access request visibility updated'),
    onError: () => toast.error('Error updating access request visibility'),
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
      <SettingRow
        size="lg"
        label="Show Whistleblower Report Form"
        description="Employees can submit whistleblower reports from the employee portal."
      >
        <Switch
          checked={whistleblowerReportEnabled}
          onCheckedChange={(checked) => {
            updateWhistleblowerReport.execute({ whistleblowerReportEnabled: checked });
          }}
          disabled={updateWhistleblowerReport.status === 'executing'}
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
            updateAccessRequestForm.execute({ accessRequestFormEnabled: checked });
          }}
          disabled={updateAccessRequestForm.status === 'executing'}
        />
      </SettingRow>
    </SettingGroup>
  );
}

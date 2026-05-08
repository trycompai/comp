'use client';

import { Stack, Text } from '@trycompai/design-system';
import { EmploymentEvidenceSection } from './EmploymentEvidenceSection';

const ONBOARD_DESCRIPTION =
  'Upload evidence showing the employee completed your required onboarding and screening steps. This may include a background check result, signed policy acknowledgments, security training completion, access approval, and proof that access was provisioned according to role.';

const OFFBOARD_DESCRIPTION =
  'Upload evidence showing the employee was off-boarded according to your process. This may include a termination or off-boarding checklist, proof of account deactivation, device return, access removal, and confirmation that privileged access was revoked in a timely manner.';

interface EmploymentEvidenceProps {
  memberId: string;
  onboardDate: string | null;
  offboardDate: string | null;
  canEdit: boolean;
}

export function EmploymentEvidence({
  memberId,
  onboardDate,
  offboardDate,
  canEdit,
}: EmploymentEvidenceProps) {
  if (!onboardDate && !offboardDate) {
    return (
      <Text variant="muted">
        Set an onboard or offboard date in the Details tab to upload employment
        evidence.
      </Text>
    );
  }

  return (
    <Stack gap="6">
      {onboardDate && (
        <EmploymentEvidenceSection
          memberId={memberId}
          eventType="onboard"
          title="New Hire Evidence"
          description={ONBOARD_DESCRIPTION}
          canEdit={canEdit}
        />
      )}
      {offboardDate && (
        <EmploymentEvidenceSection
          memberId={memberId}
          eventType="offboard"
          title="Termination Evidence"
          description={OFFBOARD_DESCRIPTION}
          canEdit={canEdit}
        />
      )}
    </Stack>
  );
}

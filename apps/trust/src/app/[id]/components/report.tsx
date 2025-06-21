import type { FrameworkStatus, Organization, Policy, Task } from '@comp/db/types';
import ComplianceHeader from './compliance-header';
import ComplianceItem from './compliance-item';
import ComplianceSection from './compliance-section';
import FrameworkItem from './framework-item';
import { GDPR, ISO27001, SOC2 } from './logos';
interface ComplianceReportProps {
  organization: Organization;
  policies: Pick<Policy, 'id' | 'name' | 'status'>[];
  controls: Pick<Task, 'id' | 'title' | 'status'>[];
  frameworks: {
    soc2: boolean | undefined;
    iso27001: boolean | undefined;
    gdpr: boolean | undefined;
    soc2_status: FrameworkStatus | undefined;
    iso27001_status: FrameworkStatus | undefined;
    gdpr_status: FrameworkStatus | undefined;
  };
}

export default function ComplianceReport({
  organization,
  policies,
  controls,
  frameworks,
}: ComplianceReportProps) {
  return (
    <div>
      <div className="mx-auto max-w-6xl">
        <div className="rounded-lg">
          <div>
            <ComplianceHeader
              organization={organization}
              title={`${organization.name} - Trust Center`}
            />
          </div>

          <div className="mt-4 flex flex-col gap-4">
            {(frameworks.soc2 || frameworks.iso27001 || frameworks.gdpr) && (
              <ComplianceSection
                title="Compliance overview"
                description={`An overview of the compliance status of ${organization.name} across common frameworks like SOC 2, ISO 27001, and GDPR.`}
                isLive
              >
                <div
                  className={`grid grid-cols-1 ${
                    [frameworks.soc2, frameworks.iso27001, frameworks.gdpr].filter(Boolean).length >
                    1
                      ? `md:grid-cols-3 ${[frameworks.soc2, frameworks.iso27001, frameworks.gdpr].filter(Boolean).length > 2 ? 'lg:grid-cols-3' : ''}`
                      : ''
                  } gap-4`}
                >
                  {frameworks.soc2 && (
                    <FrameworkItem
                      text="SOC 2"
                      status={frameworks.soc2_status ?? 'started'}
                      icon={<SOC2 />}
                    />
                  )}
                  {frameworks.iso27001 && (
                    <FrameworkItem
                      text="ISO 27001"
                      status={frameworks.iso27001_status ?? 'started'}
                      icon={<ISO27001 />}
                    />
                  )}
                  {frameworks.gdpr && (
                    <FrameworkItem
                      text="GDPR"
                      status={frameworks.gdpr_status ?? 'started'}
                      icon={<GDPR />}
                    />
                  )}
                </div>
              </ComplianceSection>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4">
            {policies.length > 0 && (
              <ComplianceSection
                title="Policies"
                description={`An up to date list of policies published internally by ${organization.name}.`}
                isLive
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {policies.map((policy) => (
                    <ComplianceItem
                      key={policy.id}
                      text={policy.name}
                      isCompliant={policy.status === 'published'}
                    />
                  ))}
                </div>
              </ComplianceSection>
            )}

            {controls.length > 0 && (
              <ComplianceSection
                title="Controls"
                description={`An up to date list of controls published internally by ${organization.name}.`}
                isLive
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {controls.map((control) => (
                    <ComplianceItem
                      key={control.id}
                      text={control.title}
                      isCompliant={control.status === 'done'}
                    />
                  ))}
                </div>
              </ComplianceSection>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

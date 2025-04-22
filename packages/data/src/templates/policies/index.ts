import { accessControlPolicy } from "./data/access-control.policy";
import { applicationSecurityPolicy } from "./data/application-security.policy";
import { availabilityPolicy } from "./data/availability.policy";
import { businessContinuityPolicy } from "./data/business-continuity.policy";
import { changeManagementPolicy } from "./data/change-management.policy";
import { classificationPolicy } from "./data/classification.policy";
import { codeOfConductPolicy } from "./data/code-of-conduct.policy";
import { confidentialityPolicy } from "./data/confidentiality.policy";
import { corporateGovernancePolicy } from "./data/corporate-governance.policy";
import { cyberRiskPolicy } from "./data/cyber-risk.policy";
import { dataBreachRegisterPolicy } from "./data/data-breach-register.policy";
import { dataBreachResponsePolicy } from "./data/data-breach-response.policy";
import { dataCenterPolicy } from "./data/data-center.policy";
import { dataClassificationPolicy } from "./data/data-classification.policy";
import { dataProtectionPolicy } from "./data/data-protection.policy";
import { dataRetentionNoticePolicy } from "./data/data-retention-notice.policy";
import { dataRetentionSchedulePolicy } from "./data/data-retention-schedule.policy";
import { dataSubjectConsentFormPolicy } from "./data/data-subject-consent-form.policy";
import { disasterRecoveryPolicy } from "./data/disaster_recovery.policy";
import { dpiaRegisterPolicy } from "./data/dpia-register.policy";
import { employeePrivacyNoticePolicy } from "./data/employee-privacy-notice.policy";
import { humanResourcesPolicy } from "./data/human_resources.policy";
import { incidentResponsePolicy } from "./data/incident_response.policy";
import { informationSecurityPolicy } from "./data/information-security.policy";
import { passwordPolicy } from "./data/password-policy.policy";
import { privacyNoticePolicy } from "./data/privacy-notice.policy";
import { privacyPolicy } from "./data/privacy.policy";
import { recordsOfProcessingActivitiesPolicy } from "./data/records-of-processing-activities.policy";
import { rightOfAccessPolicy } from "./data/right-of-access.policy";
import { rightToDataPortabilityPolicy } from "./data/right-to-data-portability.policy";
import { rightToErasurePolicy } from "./data/right-to-erasure.policy";
import { rightToObjectPolicy } from "./data/right-to-object.policy";
import { rightToRectificationPolicy } from "./data/right-to-rectification.policy";
import { rightToRestrictionPolicy } from "./data/right-to-restriction.policy";
import { riskAssessmentPolicy } from "./data/risk-assessment.policy";
import { riskManagementPolicy } from "./data/risk-management.policy";
import { softwareDevelopmentPolicy } from "./data/software-development.policy";
import { supplierDataProcessingAgreementPolicy } from "./data/supplier-data-processing-agreement.policy";
import { systemChangePolicy } from "./data/system-change.policy";
import { thirdPartyPolicy } from "./data/thirdparty.policy";
import { workstationPolicy } from "./data/workstation.policy";
import type { TemplatePolicy } from "./types";

export const policies = {
	access_control_policy: accessControlPolicy,
	application_security_policy: applicationSecurityPolicy,
	availability_policy: availabilityPolicy,
	business_continuity_policy: businessContinuityPolicy,
	change_management_policy: changeManagementPolicy,
	classification_policy: classificationPolicy,
	code_of_conduct_policy: codeOfConductPolicy,
	confidentiality_policy: confidentialityPolicy,
	corporate_governance_policy: corporateGovernancePolicy,
	cyber_risk_policy: cyberRiskPolicy,
	data_breach_register: dataBreachRegisterPolicy,
	data_breach_response: dataBreachResponsePolicy,
	data_center_policy: dataCenterPolicy,
	data_classification_policy: dataClassificationPolicy,
	data_protection: dataProtectionPolicy,
	data_retention_notice: dataRetentionNoticePolicy,
	data_retention_schedule: dataRetentionSchedulePolicy,
	data_subject_consent_form: dataSubjectConsentFormPolicy,
	disaster_recovery_policy: disasterRecoveryPolicy,
	dpia_register: dpiaRegisterPolicy,
	employee_privacy_notice: employeePrivacyNoticePolicy,
	human_resources_policy: humanResourcesPolicy,
	incident_response_policy: incidentResponsePolicy,
	information_security_policy: informationSecurityPolicy,
	password_policy: passwordPolicy,
	privacy_notice: privacyNoticePolicy,
	privacy_policy: privacyPolicy,
	risk_assessment_policy: riskAssessmentPolicy,
	risk_management_policy: riskManagementPolicy,
	software_development_policy: softwareDevelopmentPolicy,
	supplier_data_processing_agreement: supplierDataProcessingAgreementPolicy,
	system_change_policy: systemChangePolicy,
	third_party_policy: thirdPartyPolicy,
	workstation_policy: workstationPolicy,
	right_of_access_policy: rightOfAccessPolicy,
	right_to_data_portability_policy: rightToDataPortabilityPolicy,
	right_to_object_policy: rightToObjectPolicy,
	right_to_rectification_policy: rightToRectificationPolicy,
	right_to_erasure_policy: rightToErasurePolicy,
	right_to_restriction_policy: rightToRestrictionPolicy,
	records_of_processing_activities_policy:
		recordsOfProcessingActivitiesPolicy,
} as const satisfies Record<string, TemplatePolicy>;

export type TemplatePolicyId = keyof typeof policies;

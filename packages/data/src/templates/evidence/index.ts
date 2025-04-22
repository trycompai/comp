import { accessControlRecords } from "./data/access_control_records";
import { accessLogs } from "./data/access_logs";
import { accessRemovalRecords } from "./data/access_removal_records";
import { accessReviewRecords } from "./data/access_review_records";
import { accountManagementRecords } from "./data/account_management_records";
import { authenticationRecords } from "./data/authentication_records";
import { boardMeetingDocumentation } from "./data/board_meeting_documentation";
import { businessContinuityAndDisasterRecoveryTestingRecords } from "./data/business_continuity_and_disaster_recovery_testing_records";
import { businessContinuityPlans } from "./data/business_continuity_plans";
import { capacityReports } from "./data/capacity_reports";
import { changeManagementRecords } from "./data/change_management_records";
import { changeRequestLogs } from "./data/change_request_logs";
import { changeRiskDocumentation } from "./data/change_risk_documentation";
import { communicationRecords } from "./data/communication_records";
import { consentRecords } from "./data/consent_records";
import { controlImplementationRecords } from "./data/control_implementation_records";
import { controlTestingDocumentation } from "./data/control_testing_documentation";
import { dataBreachRegisterEvidence } from "./data/data-breach-register.evidence";
import { dataBreachResponseEvidence } from "./data/data-breach-response.evidence";
import { dataProtectionEvidence } from "./data/data-protection.evidence";
import { dataRetentionNoticeEvidence } from "./data/data-retention-notice.evidence";
import { dataRetentionScheduleEvidence } from "./data/data-retention-schedule.evidence";
import { dataSubjectConsentFormEvidence } from "./data/data-subject-consent-form.evidence";
import { dataClassificationRecords } from "./data/data_classification_records";
import { dataProcessingLogs } from "./data/data_processing_logs";
import { dataQualityDocumentation } from "./data/data_quality_documentation";
import { dataValidationRecords } from "./data/data_validation_records";
import { deficiencyManagementRecords } from "./data/deficiency_management_records";
import { disposalRecords } from "./data/disposal_records";
import { dpiaRegisterEvidence } from "./data/dpia-register.evidence";
import { employeePrivacyNoticeEvidence } from "./data/employee-privacy-notice.evidence";
import { ethicsComplianceDocumentation } from "./data/ethics_compliance_documentation";
import { exceptionLogs } from "./data/exception_logs";
import { externalCommunicationRecords } from "./data/external_communication_records";
import { fraudRiskDocumentation } from "./data/fraud_risk_documentation";
import { hrDocumentation } from "./data/hr_documentation";
import { incidentAnalysisRecords } from "./data/incident_analysis_records";
import { incidentCommunicationRecords } from "./data/incident_communication_records";
import { incidentRecoveryRecords } from "./data/incident_recovery_records";
import { incidentResponseRecords } from "./data/incident_response_records";
import { infrastructureMonitoringRecords } from "./data/infrastructure_monitoring_records";
import { malwarePreventionRecords } from "./data/malware_prevention_records";
import { managementStructureDocumentation } from "./data/management_structure_documentation";
import { personnelComplianceDocumentation } from "./data/personnel_compliance_documentation";
import { physicalAccessRecords } from "./data/physical_access_records";
import { policyImplementationRecords } from "./data/policy_implementation_records";
import { privacyNoticeEvidence } from "./data/privacy-notice.evidence";
import { recordsOfProcessingActivitiesEvidence } from "./data/records-of-processing-activities.evidence";
import { recoveryRecords } from "./data/recovery_records";
import { retentionSchedules } from "./data/retention_schedules";
import { rightOfAccessEvidence } from "./data/right-of-access.evidence";
import { rightToDataPortabilityEvidence } from "./data/right-to-data-portability.evidence";
import { rightToErasureEvidence } from "./data/right-to-erasure.evidence";
import { rightToObjectEvidence } from "./data/right-to-object.evidence";
import { rightToRectificationEvidence } from "./data/right-to-rectification.evidence";
import { rightToRestrictionEvidence } from "./data/right-to-restriction.evidence";
import { riskAssessmentDocumentation } from "./data/risk_assessment_documentation";
import { riskIdentificationRecords } from "./data/risk_identification_records";
import { supplierDpaEvidence } from "./data/supplier-data-processing-agreement.evidence";
import { technologyControlRecords } from "./data/technology_control_records";
import { uptimeReports } from "./data/uptime_reports";
import { vendorRiskAssessmentRecords } from "./data/vendor_risk_assessment_records";
import type { TemplateEvidence } from "./types";

export const evidence = {
	access_control_records: accessControlRecords,
	access_logs: accessLogs,
	access_removal_records: accessRemovalRecords,
	access_review_records: accessReviewRecords,
	account_management_records: accountManagementRecords,
	authentication_records: authenticationRecords,
	board_meeting_documentation: boardMeetingDocumentation,
	business_continuity_and_disaster_recovery_testing_records:
		businessContinuityAndDisasterRecoveryTestingRecords,
	business_continuity_plans: businessContinuityPlans,
	capacity_reports: capacityReports,
	change_management_records: changeManagementRecords,
	change_request_logs: changeRequestLogs,
	change_risk_documentation: changeRiskDocumentation,
	communication_records: communicationRecords,
	consent_records: consentRecords,
	control_implementation_records: controlImplementationRecords,
	control_testing_documentation: controlTestingDocumentation,
	data_breach_register_evidence: dataBreachRegisterEvidence,
	data_breach_response_evidence: dataBreachResponseEvidence,
	data_classification_records: dataClassificationRecords,
	data_processing_logs: dataProcessingLogs,
	data_protection_evidence: dataProtectionEvidence,
	data_quality_documentation: dataQualityDocumentation,
	data_retention_notice_evidence: dataRetentionNoticeEvidence,
	data_retention_schedule_evidence: dataRetentionScheduleEvidence,
	data_subject_consent_form_evidence: dataSubjectConsentFormEvidence,
	data_validation_records: dataValidationRecords,
	deficiency_management_records: deficiencyManagementRecords,
	disposal_records: disposalRecords,
	dpia_register_evidence: dpiaRegisterEvidence,
	employee_privacy_notice_evidence: employeePrivacyNoticeEvidence,
	ethics_compliance_documentation: ethicsComplianceDocumentation,
	exception_logs: exceptionLogs,
	external_communication_records: externalCommunicationRecords,
	fraud_risk_documentation: fraudRiskDocumentation,
	hr_documentation: hrDocumentation,
	incident_analysis_records: incidentAnalysisRecords,
	incident_communication_records: incidentCommunicationRecords,
	incident_recovery_records: incidentRecoveryRecords,
	incident_response_records: incidentResponseRecords,
	infrastructure_monitoring_records: infrastructureMonitoringRecords,
	malware_prevention_records: malwarePreventionRecords,
	management_structure_documentation: managementStructureDocumentation,
	personnel_compliance_documentation: personnelComplianceDocumentation,
	physical_access_records: physicalAccessRecords,
	policy_implementation_records: policyImplementationRecords,
	privacy_notice_evidence: privacyNoticeEvidence,
	recovery_records: recoveryRecords,
	retention_schedules: retentionSchedules,
	risk_assessment_documentation: riskAssessmentDocumentation,
	risk_identification_records: riskIdentificationRecords,
	supplier_dpa_evidence: supplierDpaEvidence,
	technology_control_records: technologyControlRecords,
	uptime_reports: uptimeReports,
	vendor_risk_assessment_records: vendorRiskAssessmentRecords,
	right_of_access_evidence: rightOfAccessEvidence,
	right_to_data_portability_evidence: rightToDataPortabilityEvidence,
	right_to_rectification_evidence: rightToRectificationEvidence,
	right_to_object_evidence: rightToObjectEvidence,
	right_to_erasure_evidence: rightToErasureEvidence,
	right_to_restriction_evidence: rightToRestrictionEvidence,
	records_of_processing_activities_evidence:
		recordsOfProcessingActivitiesEvidence,
} as const satisfies Record<string, TemplateEvidence>;

export type TemplateEvidenceKey = keyof typeof evidence;
export type TemplateEvidenceId = TemplateEvidenceKey;

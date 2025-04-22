import { accessAuthentication } from "./data/access-authentication";
import { accessRemoval } from "./data/access-removal";
import { accessRestrictions } from "./data/access-restrictions";
import { accessRestrictionsForConfidentialData } from "./data/access-restrictions-for-confidential-data";
import { accessReview } from "./data/access-review";
import { accessSecurity } from "./data/access-security";
import { accuracyAndCompleteness } from "./data/accuracy-and-completeness";
import { boardOversight } from "./data/board-oversight";
import { changeManagementRisk } from "./data/change-management-risk";
import { choiceAndConsent } from "./data/choice-and-consent";
import { codeOfConduct } from "./data/code-of-conduct";
import { confidentialDataDisposal } from "./data/confidential-data-disposal";
import { confidentialInformationClassification } from "./data/confidential-information-classification";
import { controlMonitoring } from "./data/control-monitoring";
import { controlSelection } from "./data/control-selection";
import { dataBreachRegisterControl } from "./data/data-breach-register.control";
import { dataBreachResponseControl } from "./data/data-breach-response.control";
import { dataProtectionPolicyControl } from "./data/data-protection.control";
import { dataRetentionAndDisposal } from "./data/data-retention-and-disposal";
import { dataRetentionNoticeControl } from "./data/data-retention-notice.control";
import { dataSubjectConsentFormControl } from "./data/data-subject-consent-form.control";
import { deficiencyManagement } from "./data/deficiency-management";
import { dpiaRegisterControl } from "./data/dpia-register.control";
import { employeePrivacyNoticeControl } from "./data/employee-privacy-notice.control";
import { exceptionHandling } from "./data/exception-handling";
import { externalCommunication } from "./data/external-communication";
import { fraudRiskAssessment } from "./data/fraud-risk-assessment";
import { informationAssetChanges } from "./data/information-asset-changes";
import { informationQuality } from "./data/information-quality";
import { infrastructureMonitoring } from "./data/infrastructure-monitoring";
import { inputProcessingAndOutputControls } from "./data/input-processing-and-output-controls";
import { internalCommunication } from "./data/internal-communication";
import { maliciousSoftwarePrevention } from "./data/malicious-software-prevention";
import { managementPhilosophy } from "./data/management-philosophy";
import { organizationalStructure } from "./data/organizational-structure";
import { personnelPolicies } from "./data/personnel-policies";
import { policyImplementation } from "./data/policy-implementation";
import { privacyNotice } from "./data/privacy-notice";
import { privacyNoticeControl } from "./data/privacy-notice.control";
import { recordsOfProcessingActivitiesControl } from "./data/records-of-processing-activities.control";
import { rightOfAccessControl } from "./data/right-of-access.control";
import { rightToDataPortabilityControl } from "./data/right-to-data-portability.control";
import { rightToErasureControl } from "./data/right-to-erasure.control";
import { rightToObjectControl } from "./data/right-to-object.control";
import { rightToRectificationControl } from "./data/right-to-rectification.control";
import { rightToRestrictionControl } from "./data/right-to-restriction.control";
import { riskAssessmentProcess } from "./data/risk-assessment-process";
import { riskIdentification } from "./data/risk-identification";
import { securityEventAnalysis } from "./data/security-event-analysis";
import { securityEventCommunication } from "./data/security-event-communication";
import { securityEventRecovery } from "./data/security-event-recovery";
import { securityEventResponse } from "./data/security-event-response";
import { supplierDataProcessingAgreementControl } from "./data/supplier-data-processing-agreement.control";
import { systemAccountManagement } from "./data/system-account-management";
import { technologyControls } from "./data/technology-controls";
import type { TemplateControl } from "./types";

export const controls = [
	boardOversight,
	managementPhilosophy,
	organizationalStructure,
	personnelPolicies,
	codeOfConduct,
	informationQuality,
	internalCommunication,
	externalCommunication,
	riskAssessmentProcess,
	riskIdentification,
	fraudRiskAssessment,
	changeManagementRisk,
	controlMonitoring,
	deficiencyManagement,
	controlSelection,
	technologyControls,
	policyImplementation,
	accessSecurity,
	accessAuthentication,
	accessRemoval,
	accessReview,
	systemAccountManagement,
	accessRestrictions,
	informationAssetChanges,
	maliciousSoftwarePrevention,
	infrastructureMonitoring,
	securityEventResponse,
	securityEventRecovery,
	securityEventAnalysis,
	securityEventCommunication,
	confidentialInformationClassification,
	accessRestrictionsForConfidentialData,
	confidentialDataDisposal,
	accuracyAndCompleteness,
	inputProcessingAndOutputControls,
	exceptionHandling,
	privacyNotice,
	choiceAndConsent,
	dataRetentionAndDisposal,
	dataBreachRegisterControl,
	dataBreachResponseControl,
	dataProtectionPolicyControl,
	dataRetentionNoticeControl,
	dataSubjectConsentFormControl,
	dpiaRegisterControl,
	employeePrivacyNoticeControl,
	privacyNoticeControl,
	supplierDataProcessingAgreementControl,
	rightToDataPortabilityControl,
	rightToRectificationControl,
	rightToObjectControl,
	rightToErasureControl,
	rightOfAccessControl,
	rightToRestrictionControl,
	recordsOfProcessingActivitiesControl,
] as const satisfies TemplateControl[];

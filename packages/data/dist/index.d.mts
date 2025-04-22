import { Frequency, Departments } from '@comp/db/types';

/**
 * Represents a training video resource that can be used
 * for user education and compliance training.
 */
interface TrainingVideo {
    /** Unique identifier for the video */
    id: string;
    /** Title of the training video */
    title: string;
    /** Detailed description of the video content */
    description: string;
    /** YouTube video identifier for embedding */
    youtubeId: string;
    /** Full URL to access the video */
    url: string;
}

declare const trainingVideos: readonly TrainingVideo[];

/**
 * Represents a compliance or regulatory framework
 * that defines standards for security, privacy, or data handling.
 */
interface Framework {
    /** Name of the framework */
    name: string;
    /** Version number or year of the framework */
    version: string;
    /** Brief description of the framework's purpose and scope */
    description: string;
}
/**
 * Collection of supported compliance frameworks within the system.
 */
interface Frameworks {
    /** SOC 2 (Service Organization Control 2) framework */
    soc2: Framework;
    gdpr: Framework;
}
/**
 * Valid framework ID strings that can be used to reference specific frameworks.
 */
type FrameworkId = keyof Frameworks;

declare const frameworks: Frameworks;

type gdprRequirementIds = "A4" | "A5" | "A6" | "A7" | "A12" | "A13" | "A14" | "A15" | "A16" | "A17" | "A18" | "A19" | "A20" | "A21" | "A25" | "A30" | "A32" | "A33" | "A34" | "A35";

type soc2RequirementIds = "CC1" | "CC2" | "CC3" | "CC4" | "CC5" | "CC6" | "CC7" | "CC8" | "CC9" | "A1" | "C1" | "PI1" | "P1";

/**
 * Represents a specific requirement from a compliance framework
 * that an organization needs to fulfill.
 */
interface Requirement {
    /** Name of the requirement */
    name: string;
    /** Detailed explanation of what this requirement entails */
    description: string;
}
/**
 * A mapping of requirement codes to their corresponding Requirement objects.
 * Used for efficient lookup of requirements.
 */
type SingleFrameworkRequirements<A extends string = string> = Record<A, Requirement>;
type AllRequirements = {
    [K in FrameworkId]: SingleFrameworkRequirements<AllRequirementIdsByFramework[K]>;
};
type AllRequirementIdsByFramework = {
    soc2: soc2RequirementIds;
    gdpr: gdprRequirementIds;
};

declare const gdprRequirements: SingleFrameworkRequirements<gdprRequirementIds>;

declare const soc2Requirements: SingleFrameworkRequirements<soc2RequirementIds>;

declare const requirements: AllRequirements;

/**
 * Represents the structure of JSON content used in policy documents.
 * This type is compatible with ProseMirror/TipTap document structure.
 */
type JSONContent = {
    [key: string]: any;
    type?: string;
    attrs?: Record<string, any>;
    content?: JSONContent[];
    marks?: {
        type: string;
        attrs?: Record<string, any>;
        [key: string]: any;
    }[];
    text?: string;
};
/**
 * Represents the metadata associated with a policy document.
 */
interface TemplatePolicyMetadata {
    id: string;
    slug: string;
    name: string;
    description: string;
    frequency: Frequency;
    department: Departments;
}
/**
 * Represents the structure of a policy document, including metadata and content.
 */
interface TemplatePolicy {
    /**
     * The main type of the document, typically "doc".
     */
    type: "doc";
    /**
     * Metadata providing details about the policy.
     */
    metadata: TemplatePolicyMetadata;
    /**
     * The structured content of the policy document.
     */
    content: JSONContent[];
}
type TemplatePolicies = Record<string, TemplatePolicy>;

declare const policies: {
    readonly access_control_policy: TemplatePolicy;
    readonly application_security_policy: TemplatePolicy;
    readonly availability_policy: TemplatePolicy;
    readonly business_continuity_policy: TemplatePolicy;
    readonly change_management_policy: TemplatePolicy;
    readonly classification_policy: TemplatePolicy;
    readonly code_of_conduct_policy: TemplatePolicy;
    readonly confidentiality_policy: TemplatePolicy;
    readonly corporate_governance_policy: TemplatePolicy;
    readonly cyber_risk_policy: TemplatePolicy;
    readonly data_breach_register: TemplatePolicy;
    readonly data_breach_response: TemplatePolicy;
    readonly data_center_policy: TemplatePolicy;
    readonly data_classification_policy: TemplatePolicy;
    readonly data_protection: TemplatePolicy;
    readonly data_retention_notice: TemplatePolicy;
    readonly data_retention_schedule: TemplatePolicy;
    readonly data_subject_consent_form: TemplatePolicy;
    readonly disaster_recovery_policy: TemplatePolicy;
    readonly dpia_register: TemplatePolicy;
    readonly employee_privacy_notice: TemplatePolicy;
    readonly human_resources_policy: TemplatePolicy;
    readonly incident_response_policy: TemplatePolicy;
    readonly information_security_policy: TemplatePolicy;
    readonly password_policy: TemplatePolicy;
    readonly privacy_notice: TemplatePolicy;
    readonly privacy_policy: TemplatePolicy;
    readonly risk_assessment_policy: TemplatePolicy;
    readonly risk_management_policy: TemplatePolicy;
    readonly software_development_policy: TemplatePolicy;
    readonly supplier_data_processing_agreement: TemplatePolicy;
    readonly system_change_policy: TemplatePolicy;
    readonly third_party_policy: TemplatePolicy;
    readonly workstation_policy: TemplatePolicy;
    readonly right_of_access_policy: TemplatePolicy;
    readonly right_to_data_portability_policy: TemplatePolicy;
    readonly right_to_object_policy: TemplatePolicy;
    readonly right_to_rectification_policy: TemplatePolicy;
    readonly right_to_erasure_policy: TemplatePolicy;
    readonly right_to_restriction_policy: TemplatePolicy;
    readonly records_of_processing_activities_policy: TemplatePolicy;
};
type TemplatePolicyId = keyof typeof policies;

/**
 * Represents a piece of compliance or regulatory evidence
 * that organizations need to maintain and present during audits.
 */
interface TemplateEvidence {
    /** Unique identifier for the evidence */
    id: string;
    /** Display name of the evidence */
    name: string;
    /** Detailed explanation of what this evidence entails */
    description: string;
    /** How often this evidence needs to be collected or updated (e.g., "monthly", "quarterly", "yearly") */
    frequency: Frequency;
    /** The organizational department responsible for maintaining this evidence */
    department: Departments;
}
/**
 * A mapping of evidence IDs to their corresponding Evidence objects.
 * Used for efficient lookup of evidence by ID.
 */
interface TemplateEvidenceMap {
    [key: string]: TemplateEvidence;
}

declare const evidence: {
    readonly access_control_records: TemplateEvidence;
    readonly access_logs: TemplateEvidence;
    readonly access_removal_records: TemplateEvidence;
    readonly access_review_records: TemplateEvidence;
    readonly account_management_records: TemplateEvidence;
    readonly authentication_records: TemplateEvidence;
    readonly board_meeting_documentation: TemplateEvidence;
    readonly business_continuity_and_disaster_recovery_testing_records: TemplateEvidence;
    readonly business_continuity_plans: TemplateEvidence;
    readonly capacity_reports: TemplateEvidence;
    readonly change_management_records: TemplateEvidence;
    readonly change_request_logs: TemplateEvidence;
    readonly change_risk_documentation: TemplateEvidence;
    readonly communication_records: TemplateEvidence;
    readonly consent_records: TemplateEvidence;
    readonly control_implementation_records: TemplateEvidence;
    readonly control_testing_documentation: TemplateEvidence;
    readonly data_breach_register_evidence: TemplateEvidence;
    readonly data_breach_response_evidence: TemplateEvidence;
    readonly data_classification_records: TemplateEvidence;
    readonly data_processing_logs: TemplateEvidence;
    readonly data_protection_evidence: TemplateEvidence;
    readonly data_quality_documentation: TemplateEvidence;
    readonly data_retention_notice_evidence: TemplateEvidence;
    readonly data_retention_schedule_evidence: TemplateEvidence;
    readonly data_subject_consent_form_evidence: TemplateEvidence;
    readonly data_validation_records: TemplateEvidence;
    readonly deficiency_management_records: TemplateEvidence;
    readonly disposal_records: TemplateEvidence;
    readonly dpia_register_evidence: TemplateEvidence;
    readonly employee_privacy_notice_evidence: TemplateEvidence;
    readonly ethics_compliance_documentation: TemplateEvidence;
    readonly exception_logs: TemplateEvidence;
    readonly external_communication_records: TemplateEvidence;
    readonly fraud_risk_documentation: TemplateEvidence;
    readonly hr_documentation: TemplateEvidence;
    readonly incident_analysis_records: TemplateEvidence;
    readonly incident_communication_records: TemplateEvidence;
    readonly incident_recovery_records: TemplateEvidence;
    readonly incident_response_records: TemplateEvidence;
    readonly infrastructure_monitoring_records: TemplateEvidence;
    readonly malware_prevention_records: TemplateEvidence;
    readonly management_structure_documentation: TemplateEvidence;
    readonly personnel_compliance_documentation: TemplateEvidence;
    readonly physical_access_records: TemplateEvidence;
    readonly policy_implementation_records: TemplateEvidence;
    readonly privacy_notice_evidence: TemplateEvidence;
    readonly recovery_records: TemplateEvidence;
    readonly retention_schedules: TemplateEvidence;
    readonly risk_assessment_documentation: TemplateEvidence;
    readonly risk_identification_records: TemplateEvidence;
    readonly supplier_dpa_evidence: TemplateEvidence;
    readonly technology_control_records: TemplateEvidence;
    readonly uptime_reports: TemplateEvidence;
    readonly vendor_risk_assessment_records: TemplateEvidence;
    readonly right_of_access_evidence: TemplateEvidence;
    readonly right_to_data_portability_evidence: TemplateEvidence;
    readonly right_to_rectification_evidence: TemplateEvidence;
    readonly right_to_object_evidence: TemplateEvidence;
    readonly right_to_erasure_evidence: TemplateEvidence;
    readonly right_to_restriction_evidence: TemplateEvidence;
    readonly records_of_processing_activities_evidence: TemplateEvidence;
};
type TemplateEvidenceKey = keyof typeof evidence;
type TemplateEvidenceId = TemplateEvidenceKey;

/**
 * Represents an artifact associated with a control
 * that can be used to demonstrate compliance.
 */
type TemplateArtifact = {
    type: "policy";
    policyId: TemplatePolicyId;
} | {
    type: "evidence";
    evidenceId: TemplateEvidenceId;
};
/**
 * Represents a requirement that a control addresses.
 */
type TemplateRequirement<T extends FrameworkId = FrameworkId> = {
    frameworkId: T;
    requirementId: AllRequirementIdsByFramework[T];
};
/**
 * Represents a security or compliance control that organizations
 * implement to address specific requirements.
 */
interface TemplateControl {
    /** Unique identifier for the control */
    id: string;
    /** Display name of the control */
    name: string;
    /** Detailed explanation of what this control entails */
    description: string;
    /** List of artifacts used to demonstrate implementation of this control */
    mappedArtifacts: TemplateArtifact[];
    /** List of requirements this control addresses */
    mappedRequirements: TemplateRequirement[];
}

declare const controls: [TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl];

export { type AllRequirementIdsByFramework, type AllRequirements, type Framework, type FrameworkId, type Frameworks, type Requirement, type SingleFrameworkRequirements, type TemplateArtifact, type TemplateControl, type TemplateEvidence, type TemplateEvidenceId, type TemplateEvidenceKey, type TemplateEvidenceMap, type TemplatePolicies, type TemplatePolicy, type TemplatePolicyId, type TemplatePolicyMetadata, type TemplateRequirement, type TrainingVideo, controls, evidence, frameworks, type gdprRequirementIds, gdprRequirements, policies, requirements, type soc2RequirementIds, soc2Requirements, trainingVideos };

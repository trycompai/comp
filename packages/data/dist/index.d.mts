import { Frequency, Departments } from '@comp/db/types';
export { Departments, Frequency } from '@comp/db/types';

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
    /** Identifier of the framework */
    identifier: string;
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
    "frk_682734f304cbbfdb3a9d4f44": Framework;
}
/**
 * Valid framework ID strings that can be used to reference specific frameworks.
 */
type FrameworkId = keyof Frameworks;

declare const frameworks: Frameworks;

type soc2RequirementIds = "frk_rq_681e8514778fd2238a33c121" | "frk_rq_681e85140854c64019d53422" | "frk_rq_681e8514f62bb35319068677" | "frk_rq_681e8514cba3ce1991f9d6c8" | "frk_rq_681e85140e8b698d7154d43e" | "frk_rq_681e8514753b4054f1a632e7" | "frk_rq_681e851403a5c3114dc746ba" | "frk_rq_681e85146ed80156122dd094" | "frk_rq_681e8514fedb1b2123661713" | "frk_rq_681e8514b7a9c5278ada8527" | "frk_rq_681e8514ae9bac0ace4829ae" | "frk_rq_681e85145df1606ef144c69c" | "frk_rq_681e8514e2ebc08069c2c862";

/**
 * Represents a specific requirement from a compliance framework
 * that an organization needs to fulfill.
 */
interface Requirement {
    /** Name of the requirement */
    name: string;
    /** Detailed explanation of what this requirement entails */
    description: string;
    /** Identifier of the requirement */
    identifier: string;
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
    "frk_682734f304cbbfdb3a9d4f44": soc2RequirementIds;
};

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
    readonly data_center_policy: TemplatePolicy;
    readonly data_classification_policy: TemplatePolicy;
    readonly disaster_recovery_policy: TemplatePolicy;
    readonly human_resources_policy: TemplatePolicy;
    readonly incident_response_policy: TemplatePolicy;
    readonly information_security_policy: TemplatePolicy;
    readonly password_policy: TemplatePolicy;
    readonly privacy_policy: TemplatePolicy;
    readonly risk_assessment_policy: TemplatePolicy;
    readonly risk_management_policy: TemplatePolicy;
    readonly software_development_policy: TemplatePolicy;
    readonly system_change_policy: TemplatePolicy;
    readonly third_party_policy: TemplatePolicy;
    readonly vendor_risk_management_policy: TemplatePolicy;
    readonly workstation_policy: TemplatePolicy;
};
type TemplatePolicyId = keyof typeof policies;

/**
 * Represents a piece of compliance or regulatory task
 * that organizations need to maintain and present during audits.
 */
interface TemplateTask {
    /** Unique identifier for the task */
    id: string;
    /** Display name of the task */
    name: string;
    /** Detailed explanation of what this task entails */
    description: string;
    /** How often this task needs to be collected or updated (e.g., "monthly", "quarterly", "yearly") */
    frequency: Frequency;
    /** The organizational department responsible for maintaining this task */
    department: Departments;
}
/**
 * A mapping of task IDs to their corresponding Task objects.
 * Used for efficient lookup of tasks by ID.
 */
interface TemplateTaskMap {
    [key: string]: TemplateTask;
}

declare const tasks: {
    readonly access_control_records: TemplateTask;
    readonly access_logs: TemplateTask;
    readonly access_removal_records: TemplateTask;
    readonly access_review_records: TemplateTask;
    readonly account_management_records: TemplateTask;
    readonly authentication_records: TemplateTask;
    readonly board_meeting_documentation: TemplateTask;
    readonly business_continuity_and_disaster_recovery_testing_records: TemplateTask;
    readonly business_continuity_plans: TemplateTask;
    readonly capacity_reports: TemplateTask;
    readonly change_management_records: TemplateTask;
    readonly change_request_logs: TemplateTask;
    readonly change_risk_documentation: TemplateTask;
    readonly communication_records: TemplateTask;
    readonly consent_records: TemplateTask;
    readonly control_implementation_records: TemplateTask;
    readonly control_testing_documentation: TemplateTask;
    readonly data_classification_records: TemplateTask;
    readonly data_processing_logs: TemplateTask;
    readonly data_quality_documentation: TemplateTask;
    readonly data_validation_records: TemplateTask;
    readonly deficiency_management_records: TemplateTask;
    readonly disposal_records: TemplateTask;
    readonly ethics_compliance_documentation: TemplateTask;
    readonly exception_logs: TemplateTask;
    readonly external_communication_records: TemplateTask;
    readonly fraud_risk_documentation: TemplateTask;
    readonly hr_documentation: TemplateTask;
    readonly incident_analysis_records: TemplateTask;
    readonly incident_communication_records: TemplateTask;
    readonly incident_recovery_records: TemplateTask;
    readonly incident_response_records: TemplateTask;
    readonly infrastructure_monitoring_records: TemplateTask;
    readonly malware_prevention_records: TemplateTask;
    readonly management_structure_documentation: TemplateTask;
    readonly personnel_compliance_documentation: TemplateTask;
    readonly physical_access_records: TemplateTask;
    readonly policy_implementation_records: TemplateTask;
    readonly privacy_notice: TemplateTask;
    readonly recovery_records: TemplateTask;
    readonly retention_schedules: TemplateTask;
    readonly risk_assessment_documentation: TemplateTask;
    readonly risk_identification_records: TemplateTask;
    readonly technology_control_records: TemplateTask;
    readonly uptime_reports: TemplateTask;
    readonly vendor_risk_assessment_records: TemplateTask;
};
type TemplateTaskKey = keyof typeof tasks;
type TemplateTaskId = TemplateTaskKey;

/**
 * Represents an artifact associated with a control
 * that can be used to demonstrate compliance.
 */
type TemplateArtifact = {
    type: "policy";
    policyId: TemplatePolicyId;
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
    /** List of tasks this control addresses */
    mappedTasks: {
        taskId: TemplateTaskId;
    }[];
}

declare const controls: [TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl, TemplateControl];

export { type AllRequirementIdsByFramework, type AllRequirements, type Framework, type FrameworkId, type Frameworks, type Requirement, type SingleFrameworkRequirements, type TemplateArtifact, type TemplateControl, type TemplatePolicies, type TemplatePolicy, type TemplatePolicyId, type TemplatePolicyMetadata, type TemplateRequirement, type TemplateTask, type TemplateTaskId, type TemplateTaskKey, type TemplateTaskMap, type TrainingVideo, controls, frameworks, policies, requirements, soc2Requirements, tasks, trainingVideos };

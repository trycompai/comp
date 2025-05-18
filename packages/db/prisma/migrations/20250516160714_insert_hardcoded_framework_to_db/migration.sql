-- Insert SOC2 framework if it doesn't exist
INSERT INTO "FrameworkEditorFramework" (id, name, version, description, "createdAt", "updatedAt")
VALUES (
    'frk_682734f304cbbfdb3a9d4f44',
    'soc2',
    '2025',
    'SOC 2 is a framework for assessing the security and reliability of information systems.',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Insert SOC2 requirements if they don't exist
INSERT INTO "FrameworkEditorRequirement" (
    id,
    "frameworkId",
    name,
    identifier,
    description,
    "createdAt",
    "updatedAt"
)
VALUES
    ('frk_rq_681e8514778fd2238a33c121', 'frk_682734f304cbbfdb3a9d4f44', 'Commitment to Integrity and Ethical Values', 'CC1', 'This criterion ensures that the organization demonstrates commitment to integrity and ethical values, establishes board oversight, creates appropriate organizational structures, and shows commitment to competence.', NOW(), NOW()),
    ('frk_rq_681e85140854c64019d53422', 'frk_682734f304cbbfdb3a9d4f44', 'Information Quality and Communication', 'CC2', 'This criterion focuses on how the organization obtains and uses relevant quality information to support the functioning of internal control, and communicates internal control information internally and externally.', NOW(), NOW()),
    ('frk_rq_681e8514f62bb35319068677', 'frk_682734f304cbbfdb3a9d4f44', 'Risk Assessment and Management', 'CC3', 'This criterion evaluates how the organization specifies suitable objectives, identifies and analyzes risk, and assesses fraud risk and significant change that could impact the system of internal control.', NOW(), NOW()),
    ('frk_rq_681e8514cba3ce1991f9d6c8', 'frk_682734f304cbbfdb3a9d4f44', 'Control Activities and Monitoring', 'CC4', 'This criterion assesses how the organization selects, develops and performs ongoing evaluations to determine whether controls are present and functioning, and communicates internal control deficiencies.', NOW(), NOW()),
    ('frk_rq_681e85140e8b698d7154d43e', 'frk_682734f304cbbfdb3a9d4f44', 'Control Activities Implementation', 'CC5', 'This criterion evaluates how the organization selects and develops control activities that contribute to the mitigation of risks, and deploys them through policies and procedures.', NOW(), NOW()),
    ('frk_rq_681e8514753b4054f1a632e7', 'frk_682734f304cbbfdb3a9d4f44', 'System Security Controls', 'CC6', 'This criterion focuses on how the organization implements controls over system boundaries, user identification and authentication, data security, and physical access to facilities and assets.', NOW(), NOW()),
    ('frk_rq_681e851403a5c3114dc746ba', 'frk_682734f304cbbfdb3a9d4f44', 'System Operations Management', 'CC7', 'This criterion assesses how the organization manages system operations, detects and mitigates processing deviations, and implements recovery plans and business continuity procedures.', NOW(), NOW()),
    ('frk_rq_681e85146ed80156122dd094', 'frk_682734f304cbbfdb3a9d4f44', 'Change Management', 'CC8', 'This criterion evaluates how the organization manages changes to infrastructure, data, software and procedures including change authorization and documentation.', NOW(), NOW()),
    ('frk_rq_681e8514fedb1b2123661713', 'frk_682734f304cbbfdb3a9d4f44', 'Vendor and Business Continuity Risk Management', 'CC9', 'This criterion assesses how the organization identifies, selects and develops risk mitigation activities for risks arising from potential business disruptions and the use of vendors and business partners.', NOW(), NOW()),
    ('frk_rq_681e8514b7a9c5278ada8527', 'frk_682734f304cbbfdb3a9d4f44', 'System Availability', 'A1', 'This criterion ensures that systems and data are available for operation and use as committed or agreed, including availability of information processing facilities and backup capabilities.', NOW(), NOW()),
    ('frk_rq_681e85145df1606ef144c69c', 'frk_682734f304cbbfdb3a9d4f44', 'Processing Integrity', 'PI1', 'This criterion ensures that system processing is complete, valid, accurate, timely and authorized to meet the entity''s objectives.', NOW(), NOW()),
    ('frk_rq_681e8514e2ebc08069c2c862', 'frk_682734f304cbbfdb3a9d4f44', 'Privacy Protection', 'P1', 'This criterion ensures that personal information is collected, used, retained, disclosed and disposed of in conformity with commitments in the entity''s privacy notice and criteria set forth in Generally Accepted Privacy Principles.', NOW(), NOW()),
    ('frk_rq_681e8514ae9bac0ace4829ae', 'frk_682734f304cbbfdb3a9d4f44', 'Confidentiality Protection', 'C1', 'This criterion ensures that information designated as confidential is protected according to policy and procedures as committed or agreed, including encryption, access controls and secure disposal.', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
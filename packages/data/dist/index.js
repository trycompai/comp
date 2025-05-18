"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  controls: () => controls,
  frameworks: () => frameworks,
  policies: () => policies,
  requirements: () => requirements,
  soc2Requirements: () => soc2Requirements,
  tasks: () => tasks,
  trainingVideos: () => trainingVideos
});
module.exports = __toCommonJS(index_exports);

// src/static/videos/data/trainingVideos.ts
var trainingVideos = [
  {
    id: "sat-1",
    title: "Security Awareness Training - Part 1",
    description: "Security Awareness Training - Part 1",
    youtubeId: "N-sBS3uCWB4",
    url: "https://www.youtube.com/watch?v=N-sBS3uCWB4"
  },
  {
    id: "sat-2",
    title: "Security Awareness Training - Part 2",
    description: "Security Awareness Training - Part 2",
    youtubeId: "JwQNwhDyXig",
    url: "https://www.youtube.com/watch?v=JwQNwhDyXig"
  },
  {
    id: "sat-3",
    title: "Security Awareness Training - Part 3",
    description: "Security Awareness Training - Part 3",
    youtubeId: "fzMNw_-KEGE",
    url: "https://www.youtube.com/watch?v=fzMNw_-KEGE"
  },
  {
    id: "sat-4",
    title: "Security Awareness Training - Part 4",
    description: "Security Awareness Training - Part 4",
    youtubeId: "WbpqjH9kI2Y",
    url: "https://www.youtube.com/watch?v=WbpqjH9kI2Y"
  },
  {
    id: "sat-5",
    title: "Security Awareness Training - Part 5",
    description: "Security Awareness Training - Part 5",
    youtubeId: "Clvfkm6azDs",
    url: "https://www.youtube.com/watch?v=Clvfkm6azDs"
  }
];

// src/static/frameworks/data/frameworks.ts
var frameworks = {
  "frk_682734f304cbbfdb3a9d4f44": {
    identifier: "soc2",
    name: "SOC 2",
    version: "2025",
    description: "SOC 2 is a framework for assessing the security and reliability of information systems."
  }
  // iso27001: {
  // 	name: "ISO 27001",
  // 	version: "2025",
  // 	description:
  // 		"ISO 27001 is a framework for assessing the security and reliability of information systems.",
  // },
  // gdpr: {
  // 	name: "GDPR",
  // 	version: "2025",
  // 	description:
  // 		"GDPR is a framework for assessing the security and reliability of information systems.",
  // },
};

// src/static/requirements/data/soc2.ts
var soc2Requirements = {
  "frk_rq_681e8514778fd2238a33c121": {
    identifier: "CC1",
    name: "CC1: Control Environment",
    description: "This criterion ensures that the organization demonstrates commitment to integrity and ethical values, establishes board oversight, creates appropriate organizational structures, and shows commitment to competence."
  },
  "frk_rq_681e85140854c64019d53422": {
    identifier: "CC2",
    name: "CC2: Communication and Information",
    description: "This criterion focuses on how the organization obtains and uses relevant quality information to support the functioning of internal control, and communicates internal control information internally and externally."
  },
  "frk_rq_681e8514f62bb35319068677": {
    identifier: "CC3",
    name: "CC3: Risk Assessment",
    description: "This criterion evaluates how the organization specifies suitable objectives, identifies and analyzes risk, and assesses fraud risk and significant change that could impact the system of internal control."
  },
  "frk_rq_681e8514cba3ce1991f9d6c8": {
    identifier: "CC4",
    name: "CC4: Monitoring Activities",
    description: "This criterion assesses how the organization selects, develops and performs ongoing evaluations to determine whether controls are present and functioning, and communicates internal control deficiencies."
  },
  "frk_rq_681e85140e8b698d7154d43e": {
    identifier: "CC5",
    name: "CC5: Control Activities",
    description: "This criterion evaluates how the organization selects and develops control activities that contribute to the mitigation of risks, and deploys them through policies and procedures."
  },
  "frk_rq_681e8514753b4054f1a632e7": {
    identifier: "CC6",
    name: "CC6: Logical and Physical Access Controls",
    description: "This criterion focuses on how the organization implements controls over system boundaries, user identification and authentication, data security, and physical access to facilities and assets."
  },
  "frk_rq_681e851403a5c3114dc746ba": {
    identifier: "CC7",
    name: "CC7: System Operations",
    description: "This criterion assesses how the organization manages system operations, detects and mitigates processing deviations, and implements recovery plans and business continuity procedures."
  },
  "frk_rq_681e85146ed80156122dd094": {
    identifier: "CC8",
    name: "CC8: Change Management",
    description: "This criterion evaluates how the organization manages changes to infrastructure, data, software and procedures including change authorization and documentation."
  },
  "frk_rq_681e8514fedb1b2123661713": {
    identifier: "CC9",
    name: "CC9: Risk Mitigation",
    description: "This criterion assesses how the organization identifies, selects and develops risk mitigation activities for risks arising from potential business disruptions and the use of vendors and business partners."
  },
  "frk_rq_681e8514b7a9c5278ada8527": {
    identifier: "A1",
    name: "A1: Availability",
    description: "This criterion ensures that systems and data are available for operation and use as committed or agreed, including availability of information processing facilities and backup capabilities."
  },
  "frk_rq_681e8514ae9bac0ace4829ae": {
    identifier: "C1",
    name: "C1: Confidentiality",
    description: "This criterion ensures that information designated as confidential is protected according to policy and procedures as committed or agreed, including encryption, access controls and secure disposal."
  },
  "frk_rq_681e85145df1606ef144c69c": {
    identifier: "PI1",
    name: "PI1: Processing Integrity",
    description: "This criterion ensures that system processing is complete, valid, accurate, timely and authorized to meet the entity's objectives."
  },
  "frk_rq_681e8514e2ebc08069c2c862": {
    identifier: "P1",
    name: "P1: Privacy",
    description: "This criterion ensures that personal information is collected, used, retained, disclosed and disposed of in conformity with commitments in the entity's privacy notice and criteria set forth in Generally Accepted Privacy Principles."
  }
};

// src/static/requirements/index.ts
var requirements = {
  "frk_682734f304cbbfdb3a9d4f44": soc2Requirements
  // iso27001: {},
  // gdpr: {},
};

// src/templates/policies/data/access-control.policy.ts
var accessControlPolicy = {
  type: "doc",
  metadata: {
    id: "access_control",
    name: "Access Control Policy",
    description: "This policy defines the requirements for controlling access to information systems and data based on the principle of least privilege.",
    frequency: "yearly",
    department: "it"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Access Control Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "CISO" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Restricted" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This policy governs access to all organizational systems and data. It is designed to enforce the principle of least privilege and protect sensitive information from unauthorized access."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Access rights must be granted based on business need and reviewed periodically."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "User authentication must incorporate strong passwords and multi-factor authentication."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Access privileges must be promptly revoked upon termination or role change."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "References" }]
    }
  ]
};

// src/templates/policies/data/application-security.policy.ts
var applicationSecurityPolicy = {
  type: "doc",
  metadata: {
    id: "application_security",
    name: "Application Security Policy",
    description: "This policy outlines the security framework and requirements for applications, notably web applications, within the organization's production environment.",
    frequency: "yearly",
    department: "it"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Application Security Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "Chief Information Security Officer" }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This application security policy defines the security framework and requirements for applications, notably web applications, within the organization's production environment."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This document also provides implementing controls and instructions for web application security, to include periodic vulnerability scans and other types of evaluations and assessments."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This policy applies to all applications within the organization's production environment, as well as administrators and users of these applications. This typically includes employees and contractors."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Background" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Application vulnerabilities typically account for the largest number of initial attack vectors after malware infections. As a result, it is important that applications are designed with security in mind, and that they are scanned and continuously monitored for malicious activity that could indicate a system compromise. Discovery and subsequent mitigation of application vulnerabilities will limit the organization's attack surface, and ensures a baseline level of security across all systems."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "In addition to scanning guidance, this policy also defines technical requirements and procedures to ensure that applications are properly hardened in accordance with security best practices."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "References" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Data Classification Policy" }]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "OWASP Risk Rating Methodology" }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "OWASP Testing Guide" }]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "OWASP Top Ten Project" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Security Best Practices" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The organization must ensure that all applications it develops and/or acquires are securely configured and managed. The following security best practices must be considered and, if feasible, applied as a matter of the application's security design:"
        }
      ]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Data handled and managed by the application must be classified in accordance with the Data Classification Policy."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "If the application processes confidential information, a confidential record banner must be prominently displayed which highlights the type of confidential data being accessed (e.g., personally-identifiable information (PII), protected health information (PHI), etc.)"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Third-Party Applications" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "When applications are acquired from a third party, such as a vendor:"
        }
      ]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Only applications that are supported by an approved vendor shall be procured and used."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Full support contracts must be arranged with the application vendor for full life-cycle support."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Web Application Assessment" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Web applications must be assessed according to the following criteria:"
        }
      ]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "New or major application releases must have a full assessment prior to approval of the change control documentation and/or release into the production environment."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Vulnerability Risk Levels" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Vulnerabilities discovered during application assessments must be mitigated based upon the following risk levels, which are based on the Open Web Application Security Project (OWASP) Risk Rating Methodology:"
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 4 },
      content: [{ type: "text", text: "High Risk" }]
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Issues must be fixed immediately" }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Alternate mitigation strategies must be implemented to limit exposure before deployment"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Security Assessment Types" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The following security assessment types may be leveraged to perform an application security assessment:"
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 4 },
      content: [{ type: "text", text: "Full Assessment" }]
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Comprised of tests for all known web application vulnerabilities"
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Uses both automated and manual tools based on the OWASP Testing Guide"
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Must leverage manual penetration testing techniques"
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Validates discovered vulnerabilities to determine overall risk"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 4 },
      content: [{ type: "text", text: "Quick Assessment" }]
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Consists of an automated scan of an application"
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Covers, at minimum, the OWASP Top Ten web application security risks"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 4 },
      content: [{ type: "text", text: "Targeted Assessment" }]
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Verifies vulnerability remediation changes"
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Validates new application functionality"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Additional Security Controls" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "To counter the risk of unauthorized access, the organization maintains a Data Center Security Policy."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Security requirements for the software development life cycle, including system development, acquisition and maintenance are defined in the Software Development Lifecycle Policy."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Security requirements for handling information security incidents are defined in the Security Incident Response Policy."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Disaster recovery and business continuity management policy is defined in the Disaster Recovery Policy."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Requirements for information system availability and redundancy are defined in the System Availability Policy."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// src/templates/policies/data/availability.policy.ts
var availabilityPolicy = {
  type: "doc",
  metadata: {
    id: "availability",
    name: "Availability Policy",
    description: "This policy defines the requirements for ensuring that information systems and data are available for use when needed.",
    frequency: "yearly",
    department: "it"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Availability Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "Chief Information Security Officer" }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Revision History" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Version" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Date" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Description" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "1.0" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Initial document" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "The purpose of this policy is to define requirements for proper controls to protect the availability of the organization's information systems."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: 'This policy applies to all users of information systems within the organization. This typically includes employees and contractors, as well as any external parties that come into contact with systems and information controlled by the organization (hereinafter referred to as "users"). This policy must be made readily available to all users.'
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Background" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The intent of this policy is to minimize the amount of unexpected or unplanned downtime (also known as outages) of information systems under the organization's control. This policy prescribes specific measures for the organization that will increase system redundancy, introduce failover mechanisms, and implement monitoring such that outages are prevented as much as possible. Where they cannot be prevented, outages will be quickly detected and remediated."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Within this policy, availability is defined as a characteristic of information or information systems in which such information or systems can be accessed by authorized entities whenever needed."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "References" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Risk Assessment Policy" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "System Availability Requirements" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Information systems must be consistently available to conduct and support business operations."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Information systems must have a defined availability classification, with appropriate controls enabled and incorporated into development and production processes based on this classification."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "System and network failures must be reported promptly to the organization's lead for Information Technology (IT) or designated IT operations manager."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Users must be notified of scheduled outages (e.g., system maintenance) that require periods of downtime. This notification must specify the date and time of the system maintenance, expected duration, and anticipated system or service resumption time."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Prior to production use, each new or significantly modified application must have a completed risk assessment that includes availability risks. Risk assessments must be completed in accordance with the Risk Assessment Policy."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Capacity management and load balancing techniques must be used, as deemed necessary, to help minimize the risk and impact of system failures."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Backup Requirements" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Information systems must have an appropriate data backup plan that ensures:"
        }
      ]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "All sensitive data can be restored within a reasonable time period."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Full backups of critical resources are performed on at least a weekly basis."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Incremental backups for critical resources are performed on at least a daily basis."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Backups and associated media are maintained for a minimum of thirty (30) days and retained for at least one (1) year, or in accordance with legal and regulatory requirements."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Backups are stored off-site with multiple points of redundancy and protected using encryption and key management."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Tests of backup data must be conducted once per quarter. Tests of configurations must be conducted twice per year."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Redundancy and Failover" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Information systems must have an appropriate redundancy and failover plan that meets the following criteria:"
        }
      ]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Network infrastructure that supports critical resources must have system-level redundancy (including but not limited to a secondary power supply, backup disk-array, and secondary computing system)."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Critical core components must have an actively maintained spare. SLAs must require parts replacement within twenty-four (24) hours."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Servers that support critical resources must have redundant power supplies and network interface cards."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Servers classified as high availability must use disk mirroring."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Business Continuity" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Information systems must have an appropriate business continuity plan that adheres to the following availability classifications and requirements:"
        }
      ]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Availability Classification" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Availability Requirements" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Scheduled Outage" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Recovery Time" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Data Loss or Impact Loss" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "High" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "High to Continuous" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "30 minutes" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "1 hour" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Minimal" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Medium" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Standard Availability" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "2 hours" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "4 hours" }]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Some data loss is tolerated if it results in quicker restoration"
                }
              ]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Low" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Limited Availability" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "4 hours" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Next business day" }]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Some data loss is tolerated if it results in quicker restoration"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The business continuity plan must also ensure:"
        }
      ]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Recovery time requirements and data loss limits must be adhered to with specific documentation in the plan."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Company and/or external critical resources, personnel, and necessary corrective actions must be specifically identified."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Specific responsibilities and tasks for responding to emergencies and resuming business operations must be included in the plan."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "All applicable legal and regulatory requirements must be satisfied."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Requirements for information system availability and redundancy are defined in the System Availability Policy."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// src/templates/policies/data/business-continuity.policy.ts
var businessContinuityPolicy = {
  type: "doc",
  metadata: {
    id: "business_continuity",
    name: "Business Continuity Policy",
    description: "This policy outlines the procedures and strategies for ensuring that essential business functions can continue during and after a disruption.",
    frequency: "yearly",
    department: "gov"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [
        {
          type: "text",
          text: "Business Continuity & Disaster Recovery Policy"
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "IT & Business Continuity Committee" }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This policy provides guidelines and procedures to ensure the continuous operation of critical business processes and the rapid recovery of IT systems following a disruptive event."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Identify critical business functions and define Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO)."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Develop, maintain, and test business continuity and disaster recovery plans."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Ensure backup systems, data redundancy, and failover mechanisms are in place."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "References" }]
    }
  ]
};

// src/templates/policies/data/change-management.policy.ts
var changeManagementPolicy = {
  type: "doc",
  metadata: {
    id: "change_management",
    name: "Change Management Policy",
    description: "This policy establishes standardized procedures for managing changes to IT systems and infrastructure to minimize risk and disruption.",
    frequency: "yearly",
    department: "it"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Change Management Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "IT Management" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Restricted" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This policy outlines the process for managing changes to systems and infrastructure, ensuring all modifications are reviewed, approved, tested, and documented."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "All change requests must be submitted via the designated change management system."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Changes must be reviewed and approved by the Change Advisory Board (CAB) before implementation, except for approved emergency changes."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Post-implementation reviews must be conducted to ensure changes did not negatively impact operations."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "References" }]
    }
  ]
};

// src/templates/policies/data/classification.policy.ts
var classificationPolicy = {
  type: "doc",
  metadata: {
    id: "classification",
    name: "General Classification Policy",
    description: "This policy provides a general framework for classification of assets and information.",
    frequency: "yearly",
    department: "gov"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Data Classification Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "Chief Information Security Officer" }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This data classification policy defines the requirements to ensure that information within the organization is protected at an appropriate level."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This document applies to the entire scope of the organization's information security program. It includes all types of information, regardless of its form, such as paper or electronic documents, applications and databases, and knowledge or information that is not written."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This policy applies to all individuals and systems that have access to information kept by the organization."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Background" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This policy defines the high level objectives and implementation instructions for the organization's data classification scheme. This includes data classification levels, as well as procedures for the classification, labeling and handling of data within the organization. Confidentiality and non-disclosure agreements maintained by the organization must reference this policy."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Classification Levels" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      marks: [{ type: "bold" }],
                      text: "Confidentiality Level"
                    }
                  ]
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      marks: [{ type: "bold" }],
                      text: "Label"
                    }
                  ]
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      marks: [{ type: "bold" }],
                      text: "Classification Criteria"
                    }
                  ]
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      marks: [{ type: "bold" }],
                      text: "Access Restrictions"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Public" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "For Public Release" }]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Making the information public will not harm the organization in any way."
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Information is available to the public."
                }
              ]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Internal Use" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Internal Use" }]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Unauthorized access may cause minor damage and/or inconvenience to the organization."
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Information is available to all employees and authorized third parties."
                }
              ]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Restricted" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Restricted" }]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Unauthorized access to information may cause considerable damage to the business and/or the organization's reputation."
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Information is available to a specific group of employees and authorized third parties."
                }
              ]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Unauthorized access to information may cause catastrophic damage to business and/or the organization's reputation."
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Information is available only to specific individuals in the organization."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "If classified information is received from outside the organization, the person who receives the information must classify it in accordance with the rules prescribed in this policy. The person thereby will become the owner of the information."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "If classified information is received from outside the organization and handled as part of business operations activities (e.g., customer data on provided cloud services), the information classification, as well as the owner of such information, must be made in accordance with the specifications of the respective customer service agreement and other legal requirements."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "When classifying information, the level of confidentiality is determined by:"
                }
              ]
            },
            {
              type: "orderedList",
              attrs: { tight: true, start: 1 },
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        { type: "text", text: " Value" },
                        { type: "text", text: ": " },
                        {
                          type: "text",
                          text: "The value of the information, based on impacts identified during the risk assessment process."
                        }
                      ]
                    }
                  ]
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        { type: "text", text: " Sensitivity" },
                        { type: "text", text: ": " },
                        {
                          type: "text",
                          text: "Sensitivity and criticality of the information, based on the highest risk calculated for each information item during the risk assessment."
                        }
                      ]
                    }
                  ]
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        { type: "text", text: " Legal obligations" },
                        { type: "text", text: ": " },
                        {
                          type: "text",
                          text: "Legal, regulatory and contractual obligations."
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Appendices" }]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        {
          type: "text",
          text: "Appendix A: Handling of Classified Information"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Information and information systems must be handled according to detailed guidelines covering:"
        }
      ]
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Paper Documents" }]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Electronic Documents" }]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Information Systems" }]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Electronic Mail" }]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Electronic Storage Media" }]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Information Transmitted Orally" }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// src/templates/policies/data/code-of-conduct.policy.ts
var codeOfConductPolicy = {
  type: "doc",
  metadata: {
    id: "code_of_conduct",
    name: "Code of Conduct Policy",
    description: "This policy outlines the expected standards of behavior and ethical conduct for all employees and representatives of the organization.",
    frequency: "yearly",
    department: "hr"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Code of Conduct Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Human Resources" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "The purpose of this policy is to define expected behavior from employees towards their colleagues, supervisors, and the organization as a whole."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "All employees and contractors must follow this policy as outlined in their Employment Offer Letter or Independent Contractor Agreement while performing their duties."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Compliance with Law: Employees must understand and comply with environmental, safety, and fair dealing laws while ensuring ethical and responsible conduct in their job duties."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Respect in the Workplace: Discriminatory behavior, harassment, or victimization is strictly prohibited."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Protection of Company Property: Employees must not misuse company equipment, respect intellectual property, and protect material property from damage."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Personal Appearance: Employees must present themselves in a professional manner and adhere to the company dress code."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Corruption: Employees must not accept bribes or inappropriate gifts from clients or partners."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Job Duties and Authority: Employees must act with integrity, respect team members, and avoid abuse of authority when delegating responsibilities."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Absenteeism and Tardiness: Employees must adhere to their designated work schedules unless exceptions are approved by their hiring manager."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Conflict of Interest: Employees must avoid personal or financial interests that interfere with their job duties."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Collaboration: Employees must promote a positive and cooperative work environment."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Communication: Employees must maintain open and professional communication with colleagues and supervisors."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Benefits: Employees must not abuse employment benefits, such as time off, insurance, or company resources."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Policy Adherence: Employees must comply with all company policies. Questions should be directed to HR or their hiring manager."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Disciplinary Actions" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Violations of this policy may result in disciplinary actions, including but not limited to:"
                }
              ]
            },
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [{ type: "text", text: "Demotion" }]
                },
                {
                  type: "listItem",
                  content: [{ type: "text", text: "Reprimand" }]
                },
                {
                  type: "listItem",
                  content: [
                    { type: "text", text: "Suspension or termination" }
                  ]
                },
                {
                  type: "listItem",
                  content: [{ type: "text", text: "Reduction of benefits" }]
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Serious violations such as corruption, theft, or embezzlement may result in legal action."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// src/templates/policies/data/confidentiality.policy.ts
var confidentialityPolicy = {
  type: "doc",
  metadata: {
    id: "confidentiality",
    name: "Confidentiality Policy",
    description: "This policy defines the requirements for protecting confidential information from unauthorized access, use, or disclosure.",
    frequency: "yearly",
    department: "gov"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Confidentiality Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "Chief Information Security Officer" }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "The purpose of this policy is to define guidelines for maintaining the confidentiality of sensitive and proprietary information within the organization."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This policy applies to all employees, contractors, third-party vendors, and other individuals who access confidential information belonging to the organization."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Confidential information includes, but is not limited to, customer data, trade secrets, intellectual property, financial records, employee records, and other sensitive organizational data."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Confidential Information Handling" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Confidential information must be accessed only by authorized individuals with a legitimate business need."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Confidential data must be encrypted at rest and in transit to prevent unauthorized access."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Employees must use company-approved systems and communication channels for handling confidential data."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Unauthorized disclosure, duplication, or transmission of confidential data is strictly prohibited."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Non-Disclosure Agreements (NDAs)" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "All employees, contractors, and third-party vendors must sign a Non-Disclosure Agreement (NDA) before accessing confidential information."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "NDAs outline obligations to protect and prevent the unauthorized use or disclosure of confidential information."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Violations of an NDA may result in disciplinary action, contract termination, and potential legal consequences."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Access Control Measures" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Access to confidential information is based on the principle of least privilege (PoLP)."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Users must authenticate via company-approved methods (e.g., Multi-Factor Authentication) before accessing confidential data."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Confidential data must not be stored on personal devices unless explicitly authorized."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Incident Reporting and Enforcement" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Employees must report any suspected or actual breaches of confidentiality to the Information Security Manager (ISM) immediately."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Violations of this policy may result in disciplinary actions, including termination of employment or legal action."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// src/templates/policies/data/corporate-governance.policy.ts
var corporateGovernancePolicy = {
  type: "doc",
  metadata: {
    id: "corporate_governance",
    name: "Corporate Governance Policy",
    description: "This policy outlines the structure, responsibilities, and processes that guide the organization's overall direction and management.",
    frequency: "yearly",
    department: "gov"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Corporate Governance Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Board of Directors" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Revision History" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Version" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Date" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Description" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "1.0" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Initial version" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This policy provides a framework for effective governance by outlining the responsibilities of the board, senior management, and related committees. It applies to all members of the board and senior leadership."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        {
          type: "text",
          text: "Board Oversight and Management Responsibilities"
        }
      ]
    },
    {
      type: "orderedList",
      attrs: { tight: true },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Ensure the board maintains independence from management."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Review and approve internal control frameworks and risk management reports regularly."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Establish committees and processes for oversight of key business functions."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Review and update this policy at least annually."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "References" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Risk Management Policy" }]
            }
          ]
        }
      ]
    }
  ]
};

// src/templates/policies/data/cyber-risk.policy.ts
var cyberRiskPolicy = {
  type: "doc",
  metadata: {
    id: "cyber_risk",
    name: "Cyber Risk Policy",
    description: "This policy outlines the strategies and procedures for identifying, assessing, and mitigating cyber risks to protect organizational assets and ensure operational resilience.",
    frequency: "yearly",
    department: "it"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Cyber Risk Assessment Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "Chief Information Security Officer" }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "The purpose of this policy is to establish a structured approach for conducting cyber risk assessments to identify, evaluate, and mitigate cybersecurity threats to the organization."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This policy applies to all employees, contractors, and third parties responsible for cybersecurity risk management within the organization."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Cyber risk assessments must be conducted on all critical systems, networks, and applications to ensure compliance with security policies and regulatory requirements."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Cyber Risk Assessment Process" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "The organization must establish a cyber risk assessment methodology that includes identifying assets, assessing threats, evaluating vulnerabilities, and determining potential impact."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "All risks must be documented in a cyber risk register and categorized based on severity and business impact."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Cyber risk assessments must be conducted at least annually and whenever significant changes to the IT infrastructure or threat landscape occur."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Identified risks must be assigned an owner responsible for implementing appropriate mitigation measures."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Cyber Risk Mitigation Strategies" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "The organization must implement cyber risk mitigation strategies based on the severity of identified risks, including risk avoidance, acceptance, transfer, or reduction."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Cybersecurity controls such as firewalls, encryption, endpoint protection, and access controls must be implemented to reduce risk to an acceptable level."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Cyber risk treatment plans must be reviewed periodically to ensure their continued effectiveness."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Reporting and Compliance" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Cyber risk assessment results must be reported to senior management and cybersecurity stakeholders for informed decision-making."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "The organization must comply with industry standards, regulations, and best practices for cybersecurity risk management."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Cyber risk assessments must be updated periodically to adapt to evolving cyber threats and business changes."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Non-compliance with this policy may result in corrective actions, including enhanced security controls, additional training, or disciplinary measures."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// src/templates/policies/data/data-center.policy.ts
var dataCenterPolicy = {
  type: "doc",
  metadata: {
    id: "data_center",
    name: "Data Center Policy",
    description: "This policy outlines the security and operational requirements for data centers to protect physical infrastructure and ensure service availability.",
    frequency: "yearly",
    department: "it"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Datacenter Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "Chief Information Security Officer" }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "The purpose of this policy is to define security and operational requirements for the organization's datacenter facilities to ensure protection, availability, and reliability of critical systems and data."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This policy applies to all employees, contractors, vendors, and third-party service providers who access or maintain datacenter infrastructure."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "All datacenter locations, including on-premises, colocation, and cloud facilities that host the organization's critical IT infrastructure, fall under this policy's scope."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Datacenter Security Requirements" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Datacenters must have physical security controls such as access restrictions, video surveillance, and intrusion detection systems."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Access to the datacenter must be granted only to authorized personnel with a legitimate business need."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Visitor access must be logged, monitored, and restricted to authorized escorts within the facility."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Multi-factor authentication must be required for personnel accessing restricted areas of the datacenter."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Environmental Controls" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Datacenters must have redundant power supplies and backup generators to ensure continuous operation."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Temperature and humidity must be monitored and maintained within manufacturer-recommended ranges for critical equipment."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Fire suppression systems must be in place to protect against damage to IT infrastructure."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Datacenter Access and Auditing" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Access logs must be maintained and reviewed periodically to ensure compliance with access control policies."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Annual security assessments must be conducted to evaluate compliance with datacenter security requirements."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Unauthorized access attempts must be reported immediately to security personnel."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        { type: "text", text: "Disaster Recovery and Business Continuity" }
      ]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Datacenter facilities must be included in the organization's Business Continuity and Disaster Recovery plans."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Data backups must be stored securely and regularly tested to ensure data recoverability."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Datacenter failover plans must be documented and tested periodically."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// src/templates/policies/data/data-classification.policy.ts
var dataClassificationPolicy = {
  type: "doc",
  metadata: {
    id: "data_classification",
    name: "Data Classification Policy",
    description: "This policy establishes guidelines for classifying data based on its sensitivity and defining handling requirements for each classification level.",
    frequency: "yearly",
    department: "gov"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Data Classification Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "CISO" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Restricted" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This policy establishes the criteria for classifying data into categories (e.g., Public, Internal, Confidential, Highly Sensitive) and specifies handling requirements for each category."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "All data must be classified at the time of creation or receipt."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Classification levels must be defined with corresponding handling, storage, and disposal requirements."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Access to confidential data must be restricted on a need-to-know basis."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "References" }]
    }
  ]
};

// src/templates/policies/data/disaster_recovery.policy.ts
var disasterRecoveryPolicy = {
  type: "doc",
  metadata: {
    id: "disaster_recovery",
    name: "Disaster Recovery Policy",
    description: "This policy outlines the procedures for recovering IT systems and data in the event of a disaster to ensure business continuity.",
    frequency: "yearly",
    department: "it"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Disaster Recovery Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "Chief Information Security Officer" }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This policy establishes the framework for disaster recovery planning to ensure the organization can recover from disruptive events, including natural disasters, cyber incidents, and other emergencies."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "A disaster recovery plan must be developed, documented, and maintained for all critical systems and data."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "The disaster recovery plan must include recovery time objectives (RTO) and recovery point objectives (RPO) for each critical system."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Regular testing of the disaster recovery plan must be conducted to ensure its effectiveness and to identify areas for improvement."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "All employees must be trained on their roles and responsibilities in the event of a disaster."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "References" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Business Continuity Policy" }]
            }
          ]
        }
      ]
    }
  ]
};

// src/templates/policies/data/human_resources.policy.ts
var humanResourcesPolicy = {
  type: "doc",
  metadata: {
    id: "human_resources",
    name: "Human Resources Policy",
    description: "This policy defines guidelines for HR practices including employee conduct, data privacy, and security awareness.",
    frequency: "yearly",
    department: "hr"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Human Resources Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "HR Director" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Internal" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This policy governs all aspects of human resource management including recruitment, performance management, and employee accountability for internal control responsibilities."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Recruitment processes must include background checks and verification of qualifications for roles with access to sensitive information."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Employees must complete training on internal controls and ethical behavior during onboarding and at regular intervals."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Performance evaluations shall include assessments of adherence to internal control responsibilities."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "References" }]
    }
  ]
};

// src/templates/policies/data/incident_response.policy.ts
var incidentResponsePolicy = {
  type: "doc",
  metadata: {
    id: "incident_response",
    name: "Incident Response Policy",
    description: "This policy outlines the procedures for responding to and managing security incidents to minimize impact and restore normal operations quickly.",
    frequency: "yearly",
    department: "it"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Incident Response Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "CISO" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This policy defines the steps for identifying, reporting, and responding to security incidents to minimize impact and restore normal operations as quickly as possible."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Establish an Incident Response Team (IRT) with defined roles and responsibilities."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Implement processes for incident detection, reporting, containment, eradication, and recovery."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Conduct regular incident response training and simulation exercises."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "References" }]
    }
  ]
};

// src/templates/policies/data/information-security.policy.ts
var informationSecurityPolicy = {
  type: "doc",
  metadata: {
    id: "information_security",
    name: "Information Security Policy",
    description: "This policy establishes the framework for protecting the organization's information assets by defining security objectives, roles, responsibilities, and controls.",
    frequency: "yearly",
    department: "it"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Information Security Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "CISO" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The purpose of this policy is to protect the confidentiality, integrity, and availability of information assets by establishing security requirements and responsibilities across the organization. This policy applies to all employees, contractors, and third-party service providers."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "All information assets shall be classified and handled according to their sensitivity."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Access to information must be restricted based on role and business need."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Security controls such as encryption, firewalls, and intrusion detection systems must be implemented and regularly tested."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "References" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Data Classification Policy" }]
            }
          ]
        }
      ]
    }
  ]
};

// src/templates/policies/data/password-policy.policy.ts
var passwordPolicy = {
  type: "doc",
  metadata: {
    id: "password_policy",
    name: "Password Policy",
    description: "This policy defines the requirements for creating and managing strong passwords.",
    frequency: "yearly",
    department: "it"
  },
  content: []
};

// src/templates/policies/data/privacy.policy.ts
var privacyPolicy = {
  type: "doc",
  metadata: {
    id: "privacy_policy",
    name: "Privacy Policy",
    description: "This policy outlines the criteria and procedures for handling personal data and ensuring compliance with privacy regulations.",
    frequency: "yearly",
    department: "gov"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Privacy Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Privacy Officer" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This policy outlines the organization's practices for handling personal data, including collection, processing, retention, and disposal, to ensure compliance with privacy regulations."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Obtain explicit consent prior to collecting personal data where required."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Limit the collection of personal data to what is necessary for business purposes."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Ensure personal data is stored securely and only accessible to authorized personnel."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "References" }]
    }
  ]
};

// src/templates/policies/data/risk-assessment.policy.ts
var riskAssessmentPolicy = {
  type: "doc",
  metadata: {
    id: "risk_assessment",
    name: "Risk Assessment Policy",
    description: "This policy defines the process and responsibilities for conducting risk assessments to identify, analyze, and evaluate potential threats and vulnerabilities.",
    frequency: "yearly",
    department: "gov"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Risk Assessment Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "Chief Information Security Officer" }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "The purpose of this policy is to establish a structured approach for identifying, evaluating, and mitigating risks associated with the organization's information systems, operations, and assets."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This policy applies to all employees, contractors, and third parties responsible for assessing and managing risk within the organization."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Risk assessments must be conducted for all business units, departments, and critical systems to ensure compliance with regulatory and security requirements."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Risk Assessment Process" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "The organization must establish a formal risk assessment methodology that includes identifying assets, assessing threats, determining vulnerabilities, and evaluating impact and likelihood."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "All risks must be documented in a risk register and categorized based on their severity and potential business impact."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Risk assessments must be conducted at least annually and whenever significant changes to systems, processes, or threats occur."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "All identified risks must be assigned an owner responsible for implementing appropriate mitigation measures."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Risk Mitigation Strategies" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "The organization must implement risk mitigation strategies based on the level of identified risk, including risk avoidance, acceptance, transfer, and reduction."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Controls must be implemented to reduce risk to an acceptable level, including security controls, process improvements, and technical safeguards."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Risk treatment plans must be reviewed periodically to ensure continued effectiveness."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// src/templates/policies/data/risk-management.policy.ts
var riskManagementPolicy = {
  type: "doc",
  metadata: {
    id: "risk_management",
    name: "Risk Management Policy",
    description: "This policy establishes the framework for identifying, assessing, treating, and monitoring risks across the organization to protect its assets and achieve its objectives.",
    frequency: "yearly",
    department: "gov"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Risk Management Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Risk Committee" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This policy establishes the framework and process for identifying, assessing, and mitigating risks that could impact the organization's objectives. It applies to all business units and processes."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Conduct risk assessments at least annually and whenever significant changes occur."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Document identified risks in a risk register and assign risk owners."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Implement risk mitigation strategies based on the assessed impact and likelihood."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "References" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Information Security Policy" }]
            }
          ]
        }
      ]
    }
  ]
};

// src/templates/policies/data/software-development.policy.ts
var softwareDevelopmentPolicy = {
  type: "doc",
  metadata: {
    id: "software_development",
    name: "Software Development Lifecycle Policy",
    description: "This policy outlines the requirements for the software development lifecycle to ensure secure, reliable, and high-quality software development practices.",
    frequency: "yearly",
    department: "it"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [
        {
          type: "text",
          text: "Software Development Lifecycle (SDLC) Policy"
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "Chief Information Security Officer" }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "The purpose of this policy is to define a structured Software Development Lifecycle (SDLC) to ensure secure, reliable, and high-quality software development practices."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This policy applies to all software development teams, including employees, contractors, and third-party developers involved in designing, developing, testing, deploying, and maintaining software for the organization."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "The policy covers all software, including internal applications, customer-facing applications, and third-party integrated software solutions."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        { type: "text", text: "Software Development Lifecycle Phases" }
      ]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "1. Planning & Requirements:"
                }
              ]
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Define business, functional, and security requirements before software development begins. Risk assessments must be conducted to identify security concerns early in the process."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "2. Design & Architecture:"
                }
              ]
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Software design must incorporate security principles, including secure authentication, encryption, and least privilege access controls."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "3. Development & Implementation:"
                }
              ]
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Developers must adhere to secure coding practices, including input validation, proper error handling, and protection against known vulnerabilities (e.g., OWASP Top Ten threats)."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "4. Testing & Validation:"
                }
              ]
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "All software must undergo security, functional, and performance testing before deployment. Automated and manual security testing must be conducted, including penetration testing and code reviews."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// src/templates/policies/data/system-change.policy.ts
var systemChangePolicy = {
  type: "doc",
  metadata: {
    id: "system_change",
    name: "System Change Policy",
    description: "This policy outlines the requirements for system changes to ensure secure, reliable, and high-quality software development practices.",
    frequency: "yearly",
    department: "it"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "System Change Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "Chief Information Security Officer" }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This information security policy defines how changes to information systems are planned and implemented."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This policy applies to the entire information security program at the organization (i.e. to all information and communications technology, as well as related documentation)."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "All employees, contractors, part-time and temporary workers, service providers, and those employed by others to perform work for the organization, or who have been granted to the organization's information and communications technology, must comply with this policy."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Background" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This policy defines specific requirements to ensure that changes to systems and applications are properly planned, evaluated, reviewed, approved, communicated, implemented, documented, and reviewed, thereby ensuring the greatest probability of success. Where changes are not successful, this document provides mechanisms for conducting post-implementation review such that future mistakes and errors can be prevented."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "All changes to information systems must follow a standardized process that includes planning, testing, approval, and documentation."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// src/templates/policies/data/thirdparty.policy.ts
var thirdPartyPolicy = {
  type: "doc",
  metadata: {
    id: "third_party",
    name: "Third Party Policy",
    description: "This policy outlines the requirements for third party integrations to ensure secure, reliable, and high-quality software development practices.",
    frequency: "yearly",
    department: "it"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Third-Party Management Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "Chief Information Security Officer" }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This policy defines the rules for relationships with the organization's Information Technology (IT) third-parties and partners."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This policy applies to all IT third-parties and partners who can impact the confidentiality, integrity, and availability of the organization's technology and sensitive information, or who are within the scope of the organization's information security program."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This policy applies to all employees and contractors responsible for the management and oversight of IT third-parties and partners of the organization."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Background" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The overall security of the organization is highly dependent on the security of its contractual relationships with its IT suppliers and partners. This policy defines requirements for effective management and oversight of such suppliers and partners from an information security perspective. It prescribes minimum security standards third-parties must meet, including security clauses, risk assessments, service level agreements, and incident management."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "References" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Information Security Policy" }]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Security Incident Response Policy" }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "IT third-parties are prohibited from accessing the organization's information security assets until a contract containing security controls is agreed to and signed by the appropriate parties."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "All IT third-parties must comply with the security policies defined in the Information Security Policy."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "All security incidents involving IT third-parties or partners must be documented per the Security Incident Response Policy and immediately reported to the Information Security Manager (ISM)."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "The organization must adhere to the terms of all Service Level Agreements (SLAs) entered into with IT third-parties. As SLAs are updated or new agreements are made, necessary changes or controls must be implemented to maintain compliance."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// src/templates/policies/data/vendor-risk-management.policy.ts
var vendorRiskManagementPolicy = {
  type: "doc",
  metadata: {
    id: "vendor_risk_management",
    name: "Vendor Risk Management Policy",
    description: "This policy outlines the criteria and procedures for evaluating, selecting, and monitoring third-party vendors to manage risks associated with external service providers.",
    frequency: "yearly",
    department: "gov"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Vendor Risk Management Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Procurement" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Restricted" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This policy establishes guidelines for evaluating and managing risks associated with vendors and third-party service providers."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Conduct risk assessments for all vendors prior to engagement."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Maintain ongoing monitoring and periodic reassessment of vendor risk."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Include appropriate security and compliance requirements in vendor contracts."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "References" }]
    }
  ]
};

// src/templates/policies/data/workstation.policy.ts
var workstationPolicy = {
  type: "doc",
  metadata: {
    id: "workstation",
    name: "Workstation Policy",
    description: "This policy outlines the requirements for workstations to ensure secure, reliable, and high-quality software development practices.",
    frequency: "yearly",
    department: "it"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Workstation Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Review Frequency" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{organization}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annual" }]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "Chief Information Security Officer" }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Purpose and Scope" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This policy defines best practices to reduce the risk of data loss or exposure through workstations."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This policy applies to all employees and contractors using workstations."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Workstations are defined as all company-owned and personal devices containing company data."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Policy" }]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Workstation Device Requirements" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Operating systems must be no more than one generation older than the current version."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Devices must be encrypted at rest to protect company data."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Devices must be locked when not in use or when an employee leaves the workstation."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Workstations must be used for authorized business purposes only."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Loss or destruction of devices must be reported immediately to IT."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Laptops and desktop devices must run the latest version of IT-approved antivirus software."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Desktop & Laptop Devices" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "All desktop and laptop devices must be company-owned and managed by IT."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Personal devices are not allowed to access company data or systems."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "All devices must have a password-protected screensaver that activates after 5 minutes of inactivity."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Devices must be returned to IT upon termination of employment."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Mobile Devices" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Mobile devices used for business purposes must be enrolled in Mobile Device Management (MDM)."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "All mobile devices must have a passcode or biometric authentication enabled."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Mobile devices must be kept up to date with the latest security patches."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Lost or stolen devices must be reported immediately to IT for remote wipe."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Software Installation" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Only IT-approved software may be installed on company devices."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Users must not attempt to bypass security controls or install unauthorized software."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "All software must be kept up to date with the latest security patches."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Data Protection" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Sensitive data must be stored in approved locations only."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Data must be backed up regularly using approved backup solutions."
                }
              ]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Users must not store sensitive data on personal devices or cloud storage."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "References" }]
    },
    {
      type: "orderedList",
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Information Security Policy" }]
            }
          ]
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Data Protection Policy" }]
            }
          ]
        }
      ]
    }
  ]
};

// src/templates/policies/index.ts
var policies = {
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
  data_center_policy: dataCenterPolicy,
  data_classification_policy: dataClassificationPolicy,
  disaster_recovery_policy: disasterRecoveryPolicy,
  human_resources_policy: humanResourcesPolicy,
  incident_response_policy: incidentResponsePolicy,
  information_security_policy: informationSecurityPolicy,
  password_policy: passwordPolicy,
  privacy_policy: privacyPolicy,
  risk_assessment_policy: riskAssessmentPolicy,
  risk_management_policy: riskManagementPolicy,
  software_development_policy: softwareDevelopmentPolicy,
  system_change_policy: systemChangePolicy,
  third_party_policy: thirdPartyPolicy,
  vendor_risk_management_policy: vendorRiskManagementPolicy,
  workstation_policy: workstationPolicy
};

// src/templates/tasks/data/access_control_records.ts
var accessControlRecords = {
  id: "access_control_records",
  name: "Access Control Records",
  description: "Access control configurations, firewall logs, and system access review reports. Provide Access Management Procedures document that outlines granting, monitoring, and revoking system access including access logging and periodic reviews.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/tasks/data/access_logs.ts
var accessLogs = {
  id: "access_logs",
  name: "Access Logs",
  description: "System and application access logs showing user authentication and authorization activities.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/access_removal_records.ts
var accessRemovalRecords = {
  id: "access_removal_records",
  name: "Access Removal Records",
  description: "Documentation of access removal for terminated employees or role changes.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/access_review_records.ts
var accessReviewRecords = {
  id: "access_review_records",
  name: "Access Review Records",
  description: "Documentation of periodic access reviews and approvals.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/tasks/data/account_management_records.ts
var accountManagementRecords = {
  id: "account_management_records",
  name: "Account Management Records",
  description: "Records of account creation, modification, and deletion activities.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/authentication_records.ts
var authenticationRecords = {
  id: "authentication_records",
  name: "Authentication Records",
  description: "Authentication system logs and configuration documentation.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/board_meeting_documentation.ts
var boardMeetingDocumentation = {
  id: "board_meeting_documentation",
  name: "Board Meeting Documentation",
  description: "Minutes and documentation from board meetings discussing security and compliance matters.",
  frequency: "quarterly",
  department: "gov"
};

// src/templates/tasks/data/business_continuity_and_disaster_recovery_testing_records.ts
var businessContinuityAndDisasterRecoveryTestingRecords = {
  id: "business_continuity_and_disaster_recovery_testing_records",
  name: "Business Continuity and Disaster Recovery Testing Records",
  description: "Documentation of BCDR testing activities and results.",
  frequency: "yearly",
  department: "it"
};

// src/templates/tasks/data/business_continuity_plans.ts
var businessContinuityPlans = {
  id: "business_continuity_plans",
  name: "Business Continuity Plans",
  description: "Documentation of business continuity and disaster recovery plans.",
  frequency: "yearly",
  department: "it"
};

// src/templates/tasks/data/capacity_reports.ts
var capacityReports = {
  id: "capacity_reports",
  name: "Capacity Reports",
  description: "System capacity planning and monitoring reports.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/change_management_records.ts
var changeManagementRecords = {
  id: "change_management_records",
  name: "Change Management Records",
  description: "Documentation of system changes and approvals.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/change_request_logs.ts
var changeRequestLogs = {
  id: "change_request_logs",
  name: "Change Request Logs",
  description: "Logs of system change requests and their status.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/change_risk_documentation.ts
var changeRiskDocumentation = {
  id: "change_risk_documentation",
  name: "Change Risk Documentation",
  description: "Risk assessment documentation for system changes.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/communication_records.ts
var communicationRecords = {
  id: "communication_records",
  name: "Communication Records",
  description: "Documentation of internal and external security communications.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/consent_records.ts
var consentRecords = {
  id: "consent_records",
  name: "Consent Records",
  description: "Records of user consent for data processing activities.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/control_implementation_records.ts
var controlImplementationRecords = {
  id: "control_implementation_records",
  name: "Control Implementation Records",
  description: "Documentation of control implementation and effectiveness.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/tasks/data/control_testing_documentation.ts
var controlTestingDocumentation = {
  id: "control_testing_documentation",
  name: "Control Testing Documentation",
  description: "Documentation of control testing activities and results.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/tasks/data/data_classification_records.ts
var dataClassificationRecords = {
  id: "data_classification_records",
  name: "Data Classification Records",
  description: "Documentation of data classification and handling procedures.",
  frequency: "yearly",
  department: "it"
};

// src/templates/tasks/data/data_processing_logs.ts
var dataProcessingLogs = {
  id: "data_processing_logs",
  name: "Data Processing Logs",
  description: "Logs of data processing activities and transactions.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/data_quality_documentation.ts
var dataQualityDocumentation = {
  id: "data_quality_documentation",
  name: "Data Quality Documentation",
  description: "Documentation of data quality controls and monitoring.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/tasks/data/data_validation_records.ts
var dataValidationRecords = {
  id: "data_validation_records",
  name: "Data Validation Records",
  description: "Records of data validation and verification activities.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/deficiency_management_records.ts
var deficiencyManagementRecords = {
  id: "deficiency_management_records",
  name: "Deficiency Management Records",
  description: "Documentation of control deficiencies and remediation activities.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/tasks/data/disposal_records.ts
var disposalRecords = {
  id: "disposal_records",
  name: "Disposal Records",
  description: "Documentation of secure data and asset disposal activities.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/ethics_compliance_documentation.ts
var ethicsComplianceDocumentation = {
  id: "ethics_compliance_documentation",
  name: "Ethics Compliance Documentation",
  description: "Documentation of ethics training and compliance activities.",
  frequency: "yearly",
  department: "it"
};

// src/templates/tasks/data/exception_logs.ts
var exceptionLogs = {
  id: "exception_logs",
  name: "Exception Logs",
  description: "Logs of security control exceptions and approvals.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/external_communication_records.ts
var externalCommunicationRecords = {
  id: "external_communication_records",
  name: "External Communication Records",
  description: "Documentation of external security communications and notifications.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/fraud_risk_documentation.ts
var fraudRiskDocumentation = {
  id: "fraud_risk_documentation",
  name: "Fraud Risk Documentation",
  description: "Documentation of fraud risk assessment and mitigation activities.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/tasks/data/hr_documentation.ts
var hrDocumentation = {
  id: "hr_documentation",
  name: "HR Documentation",
  description: "Documentation of HR security policies and procedures.",
  frequency: "yearly",
  department: "hr"
};

// src/templates/tasks/data/incident_analysis_records.ts
var incidentAnalysisRecords = {
  id: "incident_analysis_records",
  name: "Incident Analysis Records",
  description: "Documentation of security incident analysis and findings.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/incident_communication_records.ts
var incidentCommunicationRecords = {
  id: "incident_communication_records",
  name: "Incident Communication Records",
  description: "Documentation of incident-related communications.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/incident_recovery_records.ts
var incidentRecoveryRecords = {
  id: "incident_recovery_records",
  name: "Incident Recovery Records",
  description: "Documentation of incident recovery activities and lessons learned.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/incident_response_records.ts
var incidentResponseRecords = {
  id: "incident_response_records",
  name: "Incident Response Records",
  description: "Documentation of security incident response activities.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/infrastructure_monitoring_records.ts
var infrastructureMonitoringRecords = {
  id: "infrastructure_monitoring_records",
  name: "Infrastructure Monitoring Records",
  description: "Documentation of infrastructure monitoring and alerting activities.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/malware_prevention_records.ts
var malwarePreventionRecords = {
  id: "malware_prevention_records",
  name: "Malware Prevention Records",
  description: "Documentation of malware prevention and detection activities.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/management_structure_documentation.ts
var managementStructureDocumentation = {
  id: "management_structure_documentation",
  name: "Management Structure Documentation",
  description: "Documentation of organizational structure and reporting relationships.",
  frequency: "yearly",
  department: "hr"
};

// src/templates/tasks/data/personnel_compliance_documentation.ts
var personnelComplianceDocumentation = {
  id: "personnel_compliance_documentation",
  name: "Personnel Compliance Documentation",
  description: "Documentation of personnel compliance with security policies.",
  frequency: "quarterly",
  department: "hr"
};

// src/templates/tasks/data/physical_access_records.ts
var physicalAccessRecords = {
  id: "physical_access_records",
  name: "Physical Access Records",
  description: "Documentation of physical access control activities.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/policy_implementation_records.ts
var policyImplementationRecords = {
  id: "policy_implementation_records",
  name: "Policy Implementation Records",
  description: "Documentation of security policy implementation activities.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/tasks/data/privacy_notice.ts
var privacyNotice = {
  id: "privacy_notice",
  name: "Privacy Notice",
  description: "Current privacy notice and related documentation.",
  frequency: "yearly",
  department: "it"
};

// src/templates/tasks/data/recovery_records.ts
var recoveryRecords = {
  id: "recovery_records",
  name: "Recovery Records",
  description: "Documentation of system recovery activities and testing.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/tasks/data/retention_schedules.ts
var retentionSchedules = {
  id: "retention_schedules",
  name: "Retention Schedules",
  description: "Documentation of data retention policies and schedules.",
  frequency: "yearly",
  department: "it"
};

// src/templates/tasks/data/risk_assessment_documentation.ts
var riskAssessmentDocumentation = {
  id: "risk_assessment_documentation",
  name: "Risk Assessment Documentation",
  description: "Documentation of risk assessment activities and findings.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/tasks/data/risk_identification_records.ts
var riskIdentificationRecords = {
  id: "risk_identification_records",
  name: "Risk Identification Records",
  description: "Documentation of risk identification activities.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/tasks/data/technology_control_records.ts
var technologyControlRecords = {
  id: "technology_control_records",
  name: "Technology Control Records",
  description: "Documentation of technology control implementation and monitoring.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/uptime_reports.ts
var uptimeReports = {
  id: "uptime_reports",
  name: "Uptime Reports",
  description: "System uptime and availability reports.",
  frequency: "monthly",
  department: "it"
};

// src/templates/tasks/data/vendor_risk_assessment_records.ts
var vendorRiskAssessmentRecords = {
  id: "vendor_risk_assessment_records",
  name: "Vendor Risk Assessment Records",
  description: "Documentation of vendor risk assessment activities.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/tasks/index.ts
var tasks = {
  access_control_records: accessControlRecords,
  access_logs: accessLogs,
  access_removal_records: accessRemovalRecords,
  access_review_records: accessReviewRecords,
  account_management_records: accountManagementRecords,
  authentication_records: authenticationRecords,
  board_meeting_documentation: boardMeetingDocumentation,
  business_continuity_and_disaster_recovery_testing_records: businessContinuityAndDisasterRecoveryTestingRecords,
  business_continuity_plans: businessContinuityPlans,
  capacity_reports: capacityReports,
  change_management_records: changeManagementRecords,
  change_request_logs: changeRequestLogs,
  change_risk_documentation: changeRiskDocumentation,
  communication_records: communicationRecords,
  consent_records: consentRecords,
  control_implementation_records: controlImplementationRecords,
  control_testing_documentation: controlTestingDocumentation,
  data_classification_records: dataClassificationRecords,
  data_processing_logs: dataProcessingLogs,
  data_quality_documentation: dataQualityDocumentation,
  data_validation_records: dataValidationRecords,
  deficiency_management_records: deficiencyManagementRecords,
  disposal_records: disposalRecords,
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
  privacy_notice: privacyNotice,
  recovery_records: recoveryRecords,
  retention_schedules: retentionSchedules,
  risk_assessment_documentation: riskAssessmentDocumentation,
  risk_identification_records: riskIdentificationRecords,
  technology_control_records: technologyControlRecords,
  uptime_reports: uptimeReports,
  vendor_risk_assessment_records: vendorRiskAssessmentRecords
};

// src/templates/controls/data/access-authentication.ts
var accessAuthentication = {
  id: "access_authentication",
  name: "Access Authentication",
  description: "Prior to issuing system credentials and granting system access, the organization registers and authorizes new internal and external users.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "access_control_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "authentication_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514753b4054f1a632e7"
    }
  ]
};

// src/templates/controls/data/access-removal.ts
var accessRemoval = {
  id: "access_removal",
  name: "Access Removal",
  description: "The organization removes access to protected information assets when appropriate.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "access_control_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "access_removal_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514753b4054f1a632e7"
    }
  ]
};

// src/templates/controls/data/access-restrictions.ts
var accessRestrictions = {
  id: "access_restrictions",
  name: "Access Restrictions",
  description: "The organization restricts physical access to facilities and protected information assets.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "access_control_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "physical_access_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514753b4054f1a632e7"
    }
  ]
};

// src/templates/controls/data/access-restrictions-for-confidential-data.ts
var accessRestrictionsForConfidentialData = {
  id: "access_restrictions_for_confidential_data",
  name: "Access Restrictions for Confidential Data",
  description: "The entity restricts access to confidential information on a need-to-know basis.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "classification_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "access_logs"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514ae9bac0ace4829ae"
    }
  ]
};

// src/templates/controls/data/access-review.ts
var accessReview = {
  id: "access_review",
  name: "Access Review",
  description: "The organization evaluates and manages access to protected information assets on a periodic basis.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "access_control_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "access_review_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514753b4054f1a632e7"
    }
  ]
};

// src/templates/controls/data/access-security.ts
var accessSecurity = {
  id: "access_security",
  name: "Access Security",
  description: "The organization implements logical access security software, infrastructure, and architectures over protected information assets to protect them from security events.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "access_control_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "access_control_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514753b4054f1a632e7"
    }
  ]
};

// src/templates/controls/data/accuracy-and-completeness.ts
var accuracyAndCompleteness = {
  id: "accuracy_and_completeness",
  name: "Accuracy and Completeness",
  description: "The entity ensures data is processed accurately and completely.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "information_security_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "data_validation_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e85145df1606ef144c69c"
    }
  ]
};

// src/templates/controls/data/board-oversight.ts
var boardOversight = {
  id: "board_oversight",
  name: "Board Oversight",
  description: "The board of directors demonstrates independence from management and exercises oversight of the development and performance of internal control.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "corporate_governance_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "board_meeting_documentation"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514b7a9c5278ada8527"
    }
  ]
};

// src/templates/controls/data/change-management-risk.ts
var changeManagementRisk = {
  id: "change_management_risk",
  name: "Change Management Risk",
  description: "The organization identifies and assesses changes that could significantly impact the system of internal control.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "change_management_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "change_risk_documentation"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514f62bb35319068677"
    }
  ]
};

// src/templates/controls/data/choice-and-consent.ts
var choiceAndConsent = {
  id: "choice_and_consent",
  name: "Choice and Consent",
  description: "The entity obtains consent for personal information where required by policy or law.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "privacy_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "consent_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514e2ebc08069c2c862"
    }
  ]
};

// src/templates/controls/data/code-of-conduct.ts
var codeOfConduct = {
  id: "code_of_conduct",
  name: "Code of Conduct",
  description: "The organization demonstrates a commitment to integrity and ethical values.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "code_of_conduct_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "ethics_compliance_documentation"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514778fd2238a33c121"
    }
  ]
};

// src/templates/controls/data/confidential-data-disposal.ts
var confidentialDataDisposal = {
  id: "confidential_data_disposal",
  name: "Confidential Data Disposal",
  description: "The entity securely disposes of confidential information when no longer needed.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "classification_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "disposal_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514ae9bac0ace4829ae"
    }
  ]
};

// src/templates/controls/data/confidential-information-classification.ts
var confidentialInformationClassification = {
  id: "confidential_information_classification",
  name: "Confidential Information Classification",
  description: "The entity classifies information to identify and protect confidential information.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "classification_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "data_classification_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514ae9bac0ace4829ae"
    }
  ]
};

// src/templates/controls/data/control-monitoring.ts
var controlMonitoring = {
  id: "control_monitoring",
  name: "Control Monitoring",
  description: "The organization selects, develops, and performs ongoing and/or separate evaluations to ascertain whether the components of internal control are present and functioning.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "information_security_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "control_testing_documentation"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514cba3ce1991f9d6c8"
    }
  ]
};

// src/templates/controls/data/control-selection.ts
var controlSelection = {
  id: "control_selection",
  name: "Control Selection",
  description: "The organization selects and develops control activities that contribute to the mitigation of risks to the achievement of objectives to acceptable levels.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "information_security_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "control_implementation_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e85140e8b698d7154d43e"
    }
  ]
};

// src/templates/controls/data/data-retention-and-disposal.ts
var dataRetentionAndDisposal = {
  id: "data_retention_and_disposal",
  name: "Data Retention and Disposal",
  description: "The entity retains personal information for only as long as needed and disposes of it securely.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "privacy_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "retention_schedules"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514e2ebc08069c2c862"
    }
  ]
};

// src/templates/controls/data/deficiency-management.ts
var deficiencyManagement = {
  id: "deficiency_management",
  name: "Deficiency Management",
  description: "The organization evaluates and communicates internal control deficiencies in a timely manner to those responsible for taking corrective action, including senior management and the board of directors, as appropriate.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "risk_management_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "deficiency_management_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514cba3ce1991f9d6c8"
    }
  ]
};

// src/templates/controls/data/exception-handling.ts
var exceptionHandling = {
  id: "exception_handling",
  name: "Exception Handling",
  description: "The entity identifies and resolves processing exceptions in a timely manner.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "information_security_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "exception_logs"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e85145df1606ef144c69c"
    }
  ]
};

// src/templates/controls/data/external-communication.ts
var externalCommunication = {
  id: "external_communication",
  name: "External Communication",
  description: "The organization communicates with external parties regarding matters affecting the functioning of internal control.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "corporate_governance_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "external_communication_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e85140854c64019d53422"
    }
  ]
};

// src/templates/controls/data/fraud-risk-assessment.ts
var fraudRiskAssessment = {
  id: "fraud_risk_assessment",
  name: "Fraud Risk Assessment",
  description: "The organization considers the potential for fraud in assessing risks to the achievement of objectives.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "risk_management_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "fraud_risk_documentation"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514f62bb35319068677"
    }
  ]
};

// src/templates/controls/data/information-asset-changes.ts
var informationAssetChanges = {
  id: "information_asset_changes",
  name: "Information Asset Changes",
  description: "The organization manages changes to system components to minimize the risk of unauthorized changes.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "change_management_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "change_management_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514753b4054f1a632e7"
    }
  ]
};

// src/templates/controls/data/information-quality.ts
var informationQuality = {
  id: "information_quality",
  name: "Information Quality",
  description: "The organization obtains or generates and uses relevant, quality information to support the functioning of internal control.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "information_security_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "data_quality_documentation"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e85140854c64019d53422"
    }
  ]
};

// src/templates/controls/data/infrastructure-monitoring.ts
var infrastructureMonitoring = {
  id: "infrastructure_monitoring",
  name: "Infrastructure Monitoring",
  description: "To detect and act upon security events in a timely manner, the organization monitors system capacity, security threats, and vulnerabilities.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "information_security_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "infrastructure_monitoring_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e851403a5c3114dc746ba"
    }
  ]
};

// src/templates/controls/data/input-processing-and-output-controls.ts
var inputProcessingAndOutputControls = {
  id: "input_processing_and_output_controls",
  name: "Input, Processing, and Output Controls",
  description: "The entity validates the completeness and accuracy of data throughout processing.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "information_security_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "data_processing_logs"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e85145df1606ef144c69c"
    }
  ]
};

// src/templates/controls/data/internal-communication.ts
var internalCommunication = {
  id: "internal_communication",
  name: "Internal Communication",
  description: "The organization internally communicates information, including objectives and responsibilities for internal control.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "corporate_governance_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "communication_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e85140854c64019d53422"
    }
  ]
};

// src/templates/controls/data/malicious-software-prevention.ts
var maliciousSoftwarePrevention = {
  id: "malicious_software_prevention",
  name: "Malicious Software Prevention",
  description: "The organization implements controls to prevent or detect and act upon the introduction of unauthorized or malicious software.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "information_security_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "malware_prevention_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514753b4054f1a632e7"
    }
  ]
};

// src/templates/controls/data/management-philosophy.ts
var managementPhilosophy = {
  id: "management_philosophy",
  name: "Management Philosophy",
  description: "Management establishes, with board oversight, structures, reporting lines, and appropriate authorities and responsibilities in the pursuit of objectives.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "corporate_governance_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "management_structure_documentation"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514778fd2238a33c121"
    }
  ]
};

// src/templates/controls/data/organizational-structure.ts
var organizationalStructure = {
  id: "organizational_structure",
  name: "Organizational Structure",
  description: "The organization demonstrates a commitment to attract, develop, and retain competent individuals in alignment with objectives.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "human_resources_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "hr_documentation"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514778fd2238a33c121"
    }
  ]
};

// src/templates/controls/data/personnel-policies.ts
var personnelPolicies = {
  id: "personnel_policies",
  name: "Personnel Policies",
  description: "The organization holds individuals accountable for their internal control responsibilities in the pursuit of objectives.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "human_resources_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "personnel_compliance_documentation"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514778fd2238a33c121"
    }
  ]
};

// src/templates/controls/data/policy-implementation.ts
var policyImplementation = {
  id: "policy_implementation",
  name: "Policy Implementation",
  description: "The organization selects and develops control activities that contribute to the mitigation of risks to the achievement of objectives to acceptable levels.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "corporate_governance_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "policy_implementation_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e85140e8b698d7154d43e"
    }
  ]
};

// src/templates/controls/data/privacy-notice.ts
var privacyNotice2 = {
  id: "privacy_notice",
  name: "Privacy Notice",
  description: "The entity provides notice about the collection, use, and disclosure of personal information.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "privacy_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "privacy_notice"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514e2ebc08069c2c862"
    }
  ]
};

// src/templates/controls/data/risk-assessment-process.ts
var riskAssessmentProcess = {
  id: "risk_assessment_process",
  name: "Risk Assessment Process",
  description: "The organization specifies objectives with sufficient clarity to enable the identification and assessment of risks relating to objectives.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "risk_management_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "risk_assessment_documentation"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514f62bb35319068677"
    }
  ]
};

// src/templates/controls/data/risk-identification.ts
var riskIdentification = {
  id: "risk_identification",
  name: "Risk Identification",
  description: "The organization identifies risks to the achievement of its objectives across the entity and analyzes risks as a basis for determining how the risks should be managed.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "risk_management_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "risk_identification_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514f62bb35319068677"
    }
  ]
};

// src/templates/controls/data/security-event-analysis.ts
var securityEventAnalysis = {
  id: "security_event_analysis",
  name: "Security Event Analysis",
  description: "The organization implements incident response activities to identify root causes of security incidents and develop remediation plans.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "incident_response_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "incident_analysis_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e851403a5c3114dc746ba"
    }
  ]
};

// src/templates/controls/data/security-event-communication.ts
var securityEventCommunication = {
  id: "security_event_communication",
  name: "Security Event Communication",
  description: "The organization identifies, develops, and implements activities to communicate security incidents to affected parties.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "incident_response_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "incident_communication_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e851403a5c3114dc746ba"
    }
  ]
};

// src/templates/controls/data/security-event-recovery.ts
var securityEventRecovery = {
  id: "security_event_recovery",
  name: "Security Event Recovery",
  description: "The organization implements recovery procedures to ensure timely restoration of systems or assets affected by security incidents.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "business_continuity_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "recovery_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e851403a5c3114dc746ba"
    }
  ]
};

// src/templates/controls/data/security-event-response.ts
var securityEventResponse = {
  id: "security_event_response",
  name: "Security Event Response",
  description: "The organization designs, develops, and implements policies and procedures to respond to security incidents and breaches.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "incident_response_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "incident_response_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e851403a5c3114dc746ba"
    }
  ]
};

// src/templates/controls/data/system-account-management.ts
var systemAccountManagement = {
  id: "system_account_management",
  name: "System Account Management",
  description: "The organization identifies and authenticates system users, devices, and other systems before allowing access.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "access_control_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "account_management_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e8514753b4054f1a632e7"
    }
  ]
};

// src/templates/controls/data/technology-controls.ts
var technologyControls = {
  id: "technology_controls",
  name: "Technology Controls",
  description: "The organization selects and develops general control activities over technology to support the achievement of objectives.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "information_security_policy"
    }
  ],
  mappedTasks: [
    {
      taskId: "technology_control_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "frk_682734f304cbbfdb3a9d4f44",
      requirementId: "frk_rq_681e85140e8b698d7154d43e"
    }
  ]
};

// src/templates/controls/index.ts
var controls = [
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
  privacyNotice2,
  choiceAndConsent,
  dataRetentionAndDisposal
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  controls,
  frameworks,
  policies,
  requirements,
  soc2Requirements,
  tasks,
  trainingVideos
});

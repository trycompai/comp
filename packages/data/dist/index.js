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
  evidence: () => evidence,
  frameworks: () => frameworks,
  gdprRequirements: () => gdprRequirements,
  policies: () => policies,
  requirements: () => requirements,
  soc2Requirements: () => soc2Requirements,
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
  },
  {
    id: "gdpr-1",
    title: "GDPR Training - Part 1",
    description: "GDPR Training - Part 1",
    youtubeId: "abIdLAtkerE",
    url: "https://www.youtube.com/watch?v=abIdLAtkerE"
  },
  {
    id: "gdpr-2",
    title: "GDPR Training - Part 2",
    description: "GDPR Training - Part 2",
    youtubeId: "_geX33YzVuY",
    url: "https://www.youtube.com/watch?v=_geX33YzVuY"
  },
  {
    id: "gdpr-3",
    title: "GDPR Training - Part 3",
    description: "GDPR Training - Part 3",
    youtubeId: "lNbc0Ob2bA0",
    url: "https://www.youtube.com/watch?v=lNbc0Ob2bA0"
  },
  {
    id: "gdpr-4",
    title: "GDPR Training - Part 4",
    description: "GDPR Training - Part 4",
    youtubeId: "ErW11Ym3dlg",
    url: "https://www.youtube.com/watch?v=ErW11Ym3dlg"
  },
  {
    id: "gdpr-5",
    title: "GDPR Training - Part 5",
    description: "GDPR Training - Part 5",
    youtubeId: "abIdLAtkerE",
    url: "https://www.youtube.com/watch?v=abIdLAtkerE"
  }
];

// src/static/frameworks/data/frameworks.ts
var frameworks = {
  soc2: {
    name: "SOC 2",
    version: "2025",
    description: "SOC 2 is a framework for assessing the security and reliability of information systems."
  },
  gdpr: {
    name: "GDPR",
    version: "2016",
    description: "GDPR regulates how organizations, both within and outside the EU, handle the personal data of individuals residing in the EU."
  }
};

// src/static/requirements/data/gdpr.ts
var gdprRequirements = {
  A4: {
    name: "Article 4: Data protection by design and by default",
    description: "Requires controllers to implement data protection principles from the outset of designing processing activities and to ensure data minimization by default."
  },
  A5: {
    name: "Article 5: Principles relating to processing of personal data",
    description: "Ensures personal data is processed lawfully, fairly, transparently, for specific purposes, is minimized, accurate, stored for limited time, and secured."
  },
  A6: {
    name: "Article 6: Lawfulness of processing",
    description: "Defines the legal grounds for processing personal data, including consent, contract necessity, legal obligation, vital interests, public task, and legitimate interests."
  },
  A7: {
    name: "Article 7: Conditions for consent",
    description: "Specifies requirements for valid consent, ensuring it is freely given, specific, informed, unambiguous, and easily withdrawable."
  },
  A12: {
    name: "Article 12: Transparent communication",
    description: "Requires controllers to provide information to data subjects in a concise, transparent, intelligible, and easily accessible form using clear and plain language."
  },
  A13: {
    name: "Article 13: Information collected from data subject",
    description: "Mandates providing specific information to data subjects when their personal data is collected directly from them."
  },
  A14: {
    name: "Article 14: Information not obtained from data subject",
    description: "Mandates providing specific information to data subjects when their personal data is obtained from other sources."
  },
  A15: {
    name: "Article 15: Right of access",
    description: "Grants data subjects the right to access their personal data and receive information about how it is processed."
  },
  A16: {
    name: "Article 16: Right to rectification",
    description: "Allows data subjects to request the correction of inaccurate personal data concerning them."
  },
  A17: {
    name: "Article 17: Right to erasure ('right to be forgotten')",
    description: "Entitles data subjects to request the deletion of their personal data under specific circumstances."
  },
  A18: {
    name: "Article 18: Right to restriction of processing",
    description: "Gives data subjects the right to request the limitation of processing of their personal data under certain conditions."
  },
  A19: {
    name: "Article 19: Right to notification of erasure",
    description: "Requires controllers to notify the data subject when their personal data has been deleted."
  },
  A20: {
    name: "Article 20: Right to data portability",
    description: "Allows data subjects to receive their personal data in a structured, commonly used, machine-readable format and transmit it to another controller."
  },
  A21: {
    name: "Article 21: Right to object",
    description: "Grants data subjects the right to object to the processing of their personal data, including for direct marketing purposes."
  },
  A25: {
    name: "Article 25: Data protection by design and by default",
    description: "Requires controllers to implement data protection principles from the outset of designing processing activities and to ensure data minimization by default."
  },
  A30: {
    name: "Article 30: Records of processing activities",
    description: "Obliges controllers and processors to maintain detailed records of their data processing activities."
  },
  A32: {
    name: "Article 32: Security of processing",
    description: "Mandates controllers and processors to implement appropriate technical and organizational measures to ensure data security."
  },
  A33: {
    name: "Article 33: Breach notification to supervisory authority",
    description: "Requires controllers to notify the relevant supervisory authority of a personal data breach within 72 hours."
  },
  A34: {
    name: "Article 34: Breach communication to data subject",
    description: "Requires controllers to communicate a personal data breach to the affected data subjects without undue delay if it poses a high risk."
  },
  A35: {
    name: "Article 35: Data Protection Impact Assessment (DPIA)",
    description: "Mandates conducting a DPIA for processing activities likely to result in a high risk to individuals' rights and freedoms."
  }
};

// src/static/requirements/data/soc2.ts
var soc2Requirements = {
  CC1: {
    name: "CC1: Control Environment",
    description: "This criterion ensures that the organization demonstrates commitment to integrity and ethical values, establishes board oversight, creates appropriate organizational structures, and shows commitment to competence."
  },
  CC2: {
    name: "CC2: Communication and Information",
    description: "This criterion focuses on how the organization obtains and uses relevant quality information to support the functioning of internal control, and communicates internal control information internally and externally."
  },
  CC3: {
    name: "CC3: Risk Assessment",
    description: "This criterion evaluates how the organization specifies suitable objectives, identifies and analyzes risk, and assesses fraud risk and significant change that could impact the system of internal control."
  },
  CC4: {
    name: "CC4: Monitoring Activities",
    description: "This criterion assesses how the organization selects, develops and performs ongoing evaluations to determine whether controls are present and functioning, and communicates internal control deficiencies."
  },
  CC5: {
    name: "CC5: Control Activities",
    description: "This criterion evaluates how the organization selects and develops control activities that contribute to the mitigation of risks, and deploys them through policies and procedures."
  },
  CC6: {
    name: "CC6: Logical and Physical Access Controls",
    description: "This criterion focuses on how the organization implements controls over system boundaries, user identification and authentication, data security, and physical access to facilities and assets."
  },
  CC7: {
    name: "CC7: System Operations",
    description: "This criterion assesses how the organization manages system operations, detects and mitigates processing deviations, and implements recovery plans and business continuity procedures."
  },
  CC8: {
    name: "CC8: Change Management",
    description: "This criterion evaluates how the organization manages changes to infrastructure, data, software and procedures including change authorization and documentation."
  },
  CC9: {
    name: "CC9: Risk Mitigation",
    description: "This criterion assesses how the organization identifies, selects and develops risk mitigation activities for risks arising from potential business disruptions and the use of vendors and business partners."
  },
  A1: {
    name: "A1: Availability",
    description: "This criterion ensures that systems and data are available for operation and use as committed or agreed, including availability of information processing facilities and backup capabilities."
  },
  C1: {
    name: "C1: Confidentiality",
    description: "This criterion ensures that information designated as confidential is protected according to policy and procedures as committed or agreed, including encryption, access controls and secure disposal."
  },
  PI1: {
    name: "PI1: Processing Integrity",
    description: "This criterion ensures that system processing is complete, valid, accurate, timely and authorized to meet the entity's objectives."
  },
  P1: {
    name: "P1: Privacy",
    description: "This criterion ensures that personal information is collected, used, retained, disclosed and disposed of in conformity with commitments in the entity's privacy notice and criteria set forth in Generally Accepted Privacy Principles."
  }
};

// src/static/requirements/index.ts
var requirements = {
  soc2: soc2Requirements,
  gdpr: gdprRequirements
  // iso27001: {},
  // gdpr: {},
};

// src/templates/policies/data/access-control.policy.ts
var accessControlPolicy = {
  type: "doc",
  metadata: {
    id: "access_control",
    slug: "access-control-policy",
    name: "Access Control Policy",
    description: "This policy defines the requirements for granting, monitoring, and revoking access to the organization's information systems and data based on the principle of least privilege.",
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
    slug: "application-security-policy",
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
    slug: "availability-policy",
    name: "Availability Policy",
    description: "This policy outlines the requirements for proper controls to protect the availability of the organization's information systems.",
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
    slug: "business-continuity-dr-policy",
    name: "Business Continuity & Disaster Recovery Policy",
    description: "This policy outlines the strategies and procedures for ensuring the availability of critical systems and data during and after a disruptive event.",
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
    slug: "change-management-policy",
    name: "Change Management Policy",
    description: "This policy defines the process for requesting, reviewing, approving, and documenting changes to the organization's information systems and infrastructure.",
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
    id: "data_classification",
    slug: "data-classification-policy",
    name: "Data Classification Policy",
    description: "This policy outlines the requirements for data classification.",
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
    slug: "code-of-conduct",
    name: "Code of Conduct Policy",
    description: "This policy outlines the expected behavior from employees towards their colleagues, supervisors, and the organization as a whole.",
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
    slug: "confidentiality",
    name: "Confidentiality Policy",
    description: "This policy outlines the requirements for maintaining the confidentiality of sensitive and proprietary information within the organization.",
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
    slug: "corporate-governance-policy",
    name: "Corporate Governance Policy",
    description: "This policy defines the overall governance framework including board oversight, management responsibilities, and organizational structure to ensure effective oversight and accountability.",
    frequency: "yearly",
    department: "admin"
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
    slug: "cyber-risk",
    name: "Cyber Risk Assessment Policy",
    description: "This policy outlines the requirements for conducting cyber risk assessments to identify, evaluate, and mitigate cybersecurity threats to the organization.",
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

// src/templates/policies/data/data-breach-register.policy.ts
var dataBreachRegisterPolicy = {
  type: "doc",
  metadata: {
    id: "data_breach_register",
    slug: "data-breach-register",
    name: "Data Breach Register",
    description: "This document serves as the internal register for recording all personal data breaches, as required by Article 33(5) of the General Data Protection Regulation (GDPR).",
    frequency: "yearly",
    department: "it"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Data Breach Register" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Register Information" }]
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableHeader",
              content: [
                { type: "text", text: "Last Review Date" }
              ]
            },
            {
              type: "tableHeader",
              content: [
                { type: "text", text: "Review Frequency" }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "text",
                  text: "Register Maintained By"
                }
              ]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                { type: "text", text: "{{organization}}" }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Annually" }]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "[DPO/Compliance Team]" }
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
      content: [{ type: "text", text: "1. Purpose and Scope" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The purpose of this register is to maintain a comprehensive internal record of all personal data breaches experienced by {{organization}}, regardless of whether notification to the Supervisory Authority or data subjects was required. This fulfills the documentation requirement under GDPR Article 33(5)."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This register applies to any incident qualifying as a personal data breach under GDPR Article 4(12), affecting personal data for which {{organization}} acts as a data controller or data processor."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "2. Breach Log" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Each personal data breach must be recorded in the table below promptly after discovery and assessment."
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
              type: "tableHeader",
              content: [{ type: "text", text: "Breach ID" }]
            },
            {
              type: "tableHeader",
              content: [
                { type: "text", text: "Date Discovered" }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "text",
                  text: "Date(s) of Breach (if known)"
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                { type: "text", text: "Facts of the Breach" }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "text",
                  text: "Categories of Personal Data Concerned"
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "text",
                  text: "Approx. No. Data Subjects Concerned"
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "text",
                  text: "Likely Consequences / Effects"
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "text",
                  text: "Remedial Actions Taken"
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "text",
                  text: "SA Notified? (Yes/No/N/A)"
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "text",
                  text: "Date SA Notified / Reason Not Notified"
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "text",
                  text: "Data Subjects Notified? (Yes/No/N/A)"
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "text",
                  text: "Date DS Notified / Reason Not Notified"
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "text",
                  text: "Status (Ongoing/Resolved)"
                }
              ]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Date Resolved" }]
            }
          ]
        },
        // Placeholder Row - Add actual breach entries here
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[Unique ID, e.g., BR2024-001]"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "[YYYY-MM-DD HH:MM]" }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[YYYY-MM-DD to YYYY-MM-DD or 'Unknown']"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[Description of how the breach occurred, systems involved, nature (confidentiality, integrity, availability)]"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[e.g., Contact details, Credentials, Financial data, Health information]"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "[Number or 'Unknown']" }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[Assessment of potential harm, e.g., risk of identity theft, financial loss]"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[Containment steps, mitigation, recovery actions, preventative measures implemented]"
                }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "[Yes/No]" }]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[YYYY-MM-DD or Justification if 'No' (e.g., unlikely risk)]"
                }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "[Yes/No]" }]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[YYYY-MM-DD or Justification if 'No' (e.g., high risk unlikely, disproportionate effort, specific exception)]"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "[Ongoing/Resolved]" }
              ]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "[YYYY-MM-DD or N/A]" }
              ]
            }
          ]
        }
        // Add more rows for subsequent breaches
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "3. Guidance Notes" }]
    },
    {
      type: "bulletList",
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
                  marks: [{ type: "bold" }],
                  text: "Recording Requirement:"
                },
                {
                  type: "text",
                  text: " All personal data breaches must be recorded, irrespective of the assessed risk level or whether notification obligations were triggered."
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
                  text: "Timeliness:"
                },
                {
                  type: "text",
                  text: " Entries should be made without undue delay after the breach has been identified and preliminary facts are established. The record should be updated as more information becomes available and remedial actions are taken."
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
                  text: "Sufficiency of Detail:"
                },
                {
                  type: "text",
                  text: " The information recorded must be sufficient to allow the Supervisory Authority to verify compliance with notification obligations under GDPR Article 33."
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
                  text: "Justification:"
                },
                {
                  type: "text",
                  text: " Where notification to the Supervisory Authority or data subjects was not made, clear justification based on the risk assessment and GDPR criteria (Art 33(1) and Art 34(3)) must be documented in the relevant columns."
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
      content: [{ type: "text", text: "4. Roles and Responsibilities" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[Data Protection Officer (DPO) / Designated Compliance Lead]:"
        },
        {
          type: "text",
          text: " Responsible for overseeing the maintenance of this register, ensuring its accuracy and completeness, and conducting periodic reviews."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[Incident Response Team (IRT) / Relevant Personnel]:"
        },
        {
          type: "text",
          text: " Responsible for providing timely and accurate information regarding breach facts, effects, and remedial actions to the DPO/Designated Lead for inclusion in the register."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        { type: "text", text: "5. Register Review and Retention" }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This register will be formally reviewed at least annually by the [DPO/Compliance Team] to ensure ongoing accuracy and identify any trends or systemic issues. Entries within the register should be retained in accordance with {{organization}}'s data retention policy and relevant legal requirements."
        }
      ]
    }
  ]
};

// src/templates/policies/data/data-breach-response.policy.ts
var dataBreachResponsePolicy = {
  type: "doc",
  metadata: {
    id: "data_breach_response",
    slug: "data-breach-response-procedure",
    name: "Data Breach Response and Notification Procedure",
    description: "This procedure outlines the steps for identifying, assessing, containing, mitigating, notifying relevant parties about, and reviewing personal data breaches in accordance with GDPR Articles 4, 33, and 34.",
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
          text: "Data Breach Response and Notification Procedure"
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
              type: "tableHeader",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableHeader",
              content: [
                { type: "text", text: "Review Frequency" }
              ]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                { type: "text", text: "{{organization}}" }
              ]
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
                {
                  type: "text",
                  text: "[DPO/CISO/Relevant Authority]"
                }
              ]
              // Placeholder for approval role
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
            }
          ]
        }
      ]
    },
    // Introduction Section
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "1. Introduction and Purpose" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This procedure details the actions to be taken by {{organization}} in the event of a personal data breach. Its purpose is to ensure a timely and effective response to mitigate potential harm to data subjects and to comply with legal obligations under the General Data Protection Regulation (GDPR), specifically Articles 4, 33, and 34."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "2. Scope" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This procedure applies to all employees, contractors, and third-party service providers of {{organization}} who process personal data on behalf of the company. It covers breaches affecting personal data for which {{organization}} is the data controller or data processor."
        }
      ]
    },
    // Definitions Section (Based on GDPR Art 4)
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "3. Definitions" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Personal Data Breach (GDPR Art 4(12)):"
        },
        {
          type: "text",
          text: " A breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to, personal data transmitted, stored or otherwise processed. This includes incidents affecting the confidentiality, integrity, or availability of personal data."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Personal Data (GDPR Art 4(1)):"
        },
        {
          type: "text",
          text: ' Any information relating to an identified or identifiable natural person ("data subject").'
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Supervisory Authority:"
        },
        {
          type: "text",
          text: " The independent public authority responsible for monitoring the application of the GDPR (e.g., the ICO in the UK, CNIL in France)."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Data Protection Officer (DPO):"
        },
        {
          type: "text",
          text: " The individual designated (if applicable) to oversee data protection strategy and implementation."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Incident Response Team (IRT):"
        },
        {
          type: "text",
          text: " A designated group responsible for managing the response to security incidents, including data breaches."
        }
      ]
    },
    // Procedure Steps Section
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        { type: "text", text: "4. Data Breach Response Procedure" }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        { type: "text", text: "4.1. Identification and Reporting" }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Any employee or contractor who discovers or suspects a personal data breach must immediately report it to [Specify reporting channel, e.g., the IT Helpdesk, Security Team, or DPO] using [Specify method, e.g., dedicated email, reporting form, phone number]."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Initial reports should include as much detail as possible, such as: date/time of discovery, nature of the suspected breach, types of data potentially involved, systems affected, and any initial actions taken."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "4.2. Assessment and Triage" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Upon receiving a report, the [IRT/Designated Role] will conduct a preliminary assessment to:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "Confirm whether a personal data breach has occurred."
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
                  text: "Determine the nature and scope of the breach (e.g., type of data, number of individuals affected, systems involved)."
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
                  text: "Assess the immediate risk."
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
                  text: "Activate the full Incident Response Team (IRT) if necessary."
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
      content: [{ type: "text", text: "4.3. Containment and Recovery" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The IRT will take immediate steps to contain the breach and limit its impact. Actions may include:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "Isolating affected systems."
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
                  text: "Revoking compromised credentials."
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
                  text: "Securing physical areas."
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
                  text: "Preventing further unauthorized access or disclosure."
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
                  text: "Initiating recovery procedures (e.g., restoring data from backups)."
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
      content: [{ type: "text", text: "4.4. Risk Assessment" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The IRT, in consultation with the DPO (if applicable) and legal counsel, will assess the risks posed by the breach to the rights and freedoms of data subjects. This assessment considers:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "The type and sensitivity of the personal data involved."
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
                  text: "The likelihood and severity of potential harm (e.g., identity theft, financial loss, reputational damage, discrimination)."
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
                  text: "The number of individuals affected."
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
                  text: "The nature of the recipients if data was disclosed."
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
                  text: "Any mitigation measures taken."
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
          text: "This risk assessment determines the notification obligations under GDPR Articles 33 and 34."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        {
          type: "text",
          text: "4.5. Notification to Supervisory Authority (GDPR Art 33)"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Timing:"
        },
        {
          type: "text",
          text: " If the breach is likely to result in a risk to the rights and freedoms of natural persons, {{organization}} must notify the relevant Supervisory Authority without undue delay, and where feasible, not later than 72 hours after having become aware of it. If notification is delayed beyond 72 hours, reasons for the delay must be provided."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Threshold:"
        },
        {
          type: "text",
          text: " Notification is NOT required if the breach is unlikely to result in a risk to the rights and freedoms of natural persons (determined during the Risk Assessment). The justification for not notifying must be documented."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Content:"
        },
        {
          type: "text",
          text: " The notification must, at a minimum:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "Describe the nature of the personal data breach including, where possible, the categories and approximate number of data subjects concerned and the categories and approximate number of personal data records concerned."
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
                  text: "Communicate the name and contact details of the DPO or other contact point where more information can be obtained."
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
                  text: "Describe the likely consequences of the personal data breach."
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
                  text: "Describe the measures taken or proposed to be taken by the controller to address the personal data breach, including, where appropriate, measures to mitigate its possible adverse effects."
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
          text: "If all information is not available at once, it can be provided in phases without undue further delay."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The [DPO/Legal/Designated Role] is responsible for making the notification."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        {
          type: "text",
          text: "4.6. Communication to Data Subjects (GDPR Art 34)"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Timing:"
        },
        {
          type: "text",
          text: " If the breach is likely to result in a HIGH risk to the rights and freedoms of natural persons, {{organization}} must communicate the breach to the affected data subjects without undue delay."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Threshold:"
        },
        {
          type: "text",
          text: " Communication is required when the risk assessment indicates a high risk. This threshold is higher than for notification to the Supervisory Authority."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Content:"
        },
        {
          type: "text",
          text: " The communication must be in clear and plain language and describe:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "The nature of the personal data breach."
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
                  text: "The name and contact details of the DPO or other contact point."
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
                  text: "The likely consequences of the breach."
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
                  text: "The measures taken or proposed to address the breach and mitigate adverse effects."
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
                  text: "Recommendations for individuals to protect themselves (e.g., change passwords)."
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
          marks: [{ type: "bold" }],
          text: "Exceptions:"
        },
        {
          type: "text",
          text: " Communication to data subjects is NOT required if:"
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
                  text: "Appropriate technical and organizational protection measures were implemented (e.g., encryption making the data unintelligible)."
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
                  text: "Subsequent measures have been taken which ensure that the high risk is no longer likely to materialize."
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
                  text: "It would involve disproportionate effort (in which case, a public communication or similar measure must be made instead)."
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
          text: "The [DPO/Legal/Marketing/Designated Role] is responsible for drafting and coordinating the communication."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "4.7. Post-Incident Review" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "After the breach has been contained and resolved, the IRT will conduct a post-incident review to:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "Analyze the cause(s) of the breach."
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
                  text: "Evaluate the effectiveness of the response."
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
                  text: "Identify lessons learned."
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
                  text: "Recommend improvements to security controls, policies, and procedures to prevent recurrence."
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
          text: "Findings and recommendations will be documented and reported to senior management."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "4.8. Record Keeping" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "{{organization}} will maintain an internal register of all personal data breaches, regardless of whether notification was required. This register must document:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "The facts relating to the breach."
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
                  text: "Its effects."
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
                  text: "The remedial action taken."
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
                  text: "Justification for decisions made (e.g., not notifying the SA or data subjects)."
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
          text: "This documentation enables the Supervisory Authority to verify compliance."
        }
      ]
    },
    // Roles and Responsibilities Section
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "5. Roles and Responsibilities" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "All Employees/Contractors:"
        },
        { type: "text", text: " Report suspected breaches promptly." }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[Incident Response Team/Designated Role]:"
        },
        {
          type: "text",
          text: " Lead assessment, containment, recovery, risk assessment, and post-incident review."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Data Protection Officer (DPO) / Legal Counsel:"
        },
        {
          type: "text",
          text: " Provide guidance on legal obligations, risk assessment, and oversee notifications."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[Relevant Department Heads]:"
        },
        {
          type: "text",
          text: " Cooperate with the IRT and implement corrective actions."
        }
      ]
    },
    // Policy Review Section
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "6. Policy Review" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This procedure will be reviewed at least annually and updated as necessary to reflect changes in regulations, technology, or business processes."
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
    slug: "data-center",
    name: "Data Center Policy",
    description: "This policy outlines the requirements for the organization's data center facilities to ensure protection, availability, and reliability of critical systems and data.",
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
    slug: "data-classification-policy",
    name: "Data Classification Policy",
    description: "This policy establishes a framework for classifying data based on sensitivity and defines handling requirements for each classification level.",
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

// src/templates/policies/data/data-protection.policy.ts
var dataProtectionPolicy = {
  type: "doc",
  metadata: {
    id: "data_protection",
    slug: "data-protection-policy",
    name: "Data Protection Policy",
    description: "This policy outlines the technical and organizational measures implemented to ensure and demonstrate compliance with the General Data Protection Regulation (GDPR), specifically Article 24.",
    frequency: "yearly",
    department: "admin"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Data Protection Policy" }]
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
              content: [
                { type: "text", text: "Review Frequency" }
              ]
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
              content: [
                { type: "text", text: "{{organization}}" }
              ]
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
                {
                  type: "text",
                  text: "Data Protection Officer / Legal"
                }
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
              content: [
                { type: "text", text: "Initial version" }
              ]
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
          text: "The purpose of this policy is to establish the framework for ensuring and demonstrating compliance with the General Data Protection Regulation (GDPR), particularly Article 24 ('Responsibility of the controller'). It outlines the technical and organizational measures {{organization}} implements to protect personal data processed."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This policy applies to all processing of personal data conducted by {{organization}}, including data related to customers, employees, partners, and other individuals whose data we process. It applies to all employees, contractors, and third-party service providers acting on behalf of {{organization}}."
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
          text: "GDPR Article 24 requires data controllers like {{organization}} to implement appropriate technical and organizational measures to ensure and be able to demonstrate that processing is performed in accordance with the regulation. These measures must consider the nature, scope, context, and purposes of processing, as well as the risks to the rights and freedoms of individuals. This policy details these measures."
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
        { type: "text", text: "Technical and Organizational Measures" }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "{{organization}} shall implement and maintain appropriate technical and organizational measures, including but not limited to:"
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
                  marks: [{ type: "bold" }],
                  text: "Data Minimization:"
                },
                {
                  type: "text",
                  text: " Collecting and processing only the personal data necessary for specified, explicit, and legitimate purposes."
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
                  text: "Access Control:"
                },
                {
                  type: "text",
                  text: " Implementing role-based access controls and the principle of least privilege to limit data access to authorized personnel (Ref: Access Control Policy)."
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
                  text: "Encryption and Pseudonymization:"
                },
                {
                  type: "text",
                  text: " Utilizing encryption for data at rest and in transit, and pseudonymization where appropriate, to protect data confidentiality."
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
                  text: "Data Security:"
                },
                {
                  type: "text",
                  text: " Maintaining robust security measures, including regular vulnerability scanning, penetration testing, and security monitoring (Ref: Information Security Policy, Application Security Policy)."
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
                  text: "Data Integrity and Availability:"
                },
                {
                  type: "text",
                  text: " Ensuring data accuracy and implementing backup and disaster recovery procedures (Ref: Availability Policy, Business Continuity Policy, Disaster Recovery Policy)."
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
                  text: "Regular Review:"
                },
                {
                  type: "text",
                  text: " Regularly testing, assessing, and evaluating the effectiveness of technical and organizational measures."
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
      content: [
        {
          type: "text",
          text: "Data Protection by Design and by Default"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "{{organization}} shall integrate data protection principles into all stages of processing activities, from design to implementation and operation. This includes:"
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
                  text: "Conducting Data Protection Impact Assessments (DPIAs) for processing activities likely to result in a high risk to individuals' rights and freedoms."
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
                  text: "Implementing measures to ensure that, by default, only personal data necessary for each specific purpose are processed."
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
                  text: "Considering data protection implications during the development or procurement of new systems or services (Ref: Software Development Policy, Vendor Risk Management Policy)."
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
      content: [{ type: "text", text: "Demonstrating Compliance" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "{{organization}} shall maintain records and documentation to demonstrate compliance, including:"
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
                  text: "Records of Processing Activities (ROPA) as required by GDPR Article 30."
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
                  text: "Documentation of implemented technical and organizational measures."
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
                  text: "Results of DPIAs, audits, and assessments."
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
                  text: "Data Processing Agreements (DPAs) with third-party processors."
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
                  text: "Records of data breaches and notifications (Ref: Incident Response Policy)."
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
                  text: "Records of staff training on data protection."
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
      content: [{ type: "text", text: "Data Subject Rights" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "{{organization}} shall establish procedures to facilitate the exercise of data subject rights (access, rectification, erasure, restriction, portability, objection) as outlined in the GDPR and the Privacy Policy."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Training and Awareness" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "All personnel with access to personal data shall receive regular training on data protection principles, policies, and procedures."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Responsibilities" }]
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
                  marks: [{ type: "bold" }],
                  text: "Data Protection Officer (DPO) / Legal Department:"
                },
                {
                  type: "text",
                  text: " Oversees the implementation and maintenance of this policy, provides guidance, monitors compliance, and acts as the contact point for supervisory authorities."
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
                  text: "Management:"
                },
                {
                  type: "text",
                  text: " Ensures adequate resources are allocated for data protection and promotes a culture of data privacy."
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
                  text: "All Employees and Contractors:"
                },
                {
                  type: "text",
                  text: " Adhere to this policy and associated data protection procedures in their daily work."
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
              content: [
                {
                  type: "text",
                  text: "General Data Protection Regulation (GDPR), Article 24"
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
                { type: "text", text: "Access Control Policy" }
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
                  text: "Information Security Policy"
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
                  text: "Application Security Policy"
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
                { type: "text", text: "Availability Policy" }
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
                  text: "Business Continuity Policy"
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
                  text: "Disaster Recovery Policy"
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
                  text: "Incident Response Policy"
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
              content: [{ type: "text", text: "Privacy Policy" }]
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
                  text: "Software Development Policy"
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
                  text: "Vendor Risk Management Policy"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// src/templates/policies/data/data-retention-notice.policy.ts
var dataRetentionNoticePolicy = {
  type: "doc",
  metadata: {
    id: "data_retention_notice",
    slug: "data-retention-notice",
    name: "Data Retention Notice",
    description: "This notice explains how long we retain personal data, the reasons for retention, and your rights regarding data erasure, in compliance with GDPR Articles 5, 13, 17, and 30.",
    frequency: "yearly",
    department: "it"
    // Or IT/Compliance
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Data Retention Notice" }]
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
              content: [{ type: "text", text: "Effective Date" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Updated" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Contact" }]
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
              content: [
                { type: "text", text: "{{organization}}" }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
              // Effective Date
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
              // Last Updated Date
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Data Protection Officer / Legal Department"
                  // Or specific contact
                }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Public" }]
              // Or Internal/Confidential depending on audience
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "1. Introduction" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "{{organization}} ('we', 'us', 'our') is committed to processing personal data responsibly and transparently. This Data Retention Notice explains our policies regarding how long we keep your personal data, the criteria used to determine these periods, and your rights under the General Data Protection Regulation (GDPR), specifically addressing requirements from Articles 5 (Principles relating to processing), 13 (Information to be provided), 17 (Right to erasure), and 30 (Records of processing activities)."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This notice applies to all personal data processed by us, including data from customers, employees, contractors, and website visitors."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "2. Data Controller Information" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The data controller responsible for your personal data is {{organization}}, located at [Your Company Address]. You can contact our Data Protection Officer (DPO) or Legal Department for questions regarding this notice or your data privacy rights at [DPO/Legal Contact Email/Address]."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "3. Principles of Data Retention (GDPR Art. 5)"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Our data retention practices are guided by the core principles of the GDPR:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  marks: [{ type: "bold" }],
                  text: "Purpose Limitation:"
                },
                {
                  type: "text",
                  text: " Personal data is collected for specified, explicit, and legitimate purposes and not further processed in a manner incompatible with those purposes."
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
                  text: "Data Minimisation:"
                },
                {
                  type: "text",
                  text: " We only process personal data that is adequate, relevant, and limited to what is necessary in relation to the purposes for which it is processed."
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
                  text: "Storage Limitation:"
                },
                {
                  type: "text",
                  text: " Personal data is kept in a form which permits identification of data subjects for no longer than is necessary for the purposes for which the personal data is processed. Longer retention periods may apply for archiving purposes in the public interest, scientific or historical research purposes, or statistical purposes, subject to appropriate safeguards."
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
                  text: "Integrity and Confidentiality:"
                },
                {
                  type: "text",
                  text: " Personal data is processed in a manner that ensures appropriate security, including protection against unauthorised or unlawful processing and against accidental loss, destruction, or damage, using appropriate technical or organisational measures."
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
        {
          type: "text",
          text: "4. Information on Retention Periods (GDPR Art. 13)"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "As required by GDPR Article 13, when we collect your personal data, we provide information about the period for which the personal data will be stored, or if that is not possible, the criteria used to determine that period. This information is typically provided in specific privacy notices relevant to the context of data collection (e.g., Customer Privacy Notice, Employee Privacy Notice)."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Retention periods are determined based on:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "The purpose for which the data was collected."
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
                  text: "Legal and regulatory requirements (e.g., tax laws, employment laws, industry regulations)."
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
                  text: "Contractual obligations."
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
                  text: "Business needs (e.g., maintaining service history, managing accounts, defending legal claims)."
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
                  text: "Statutory limitation periods for potential legal claims."
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
        {
          type: "text",
          text: "5. Right to Erasure ('Right to be Forgotten') (GDPR Art. 17)"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "You have the right to request the erasure of your personal data without undue delay under certain circumstances, as outlined in GDPR Article 17. These include situations where:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "The personal data is no longer necessary for the purpose for which it was collected."
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
                  text: "You withdraw consent on which the processing is based, and there is no other legal ground for processing."
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
                  text: "You object to the processing pursuant to Article 21(1) and there are no overriding legitimate grounds, or you object pursuant to Article 21(2) (direct marketing)."
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
                  text: "The personal data has been unlawfully processed."
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
                  text: "The personal data must be erased for compliance with a legal obligation."
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
          text: "However, the right to erasure is not absolute. We may be required to retain certain data to comply with legal obligations, for the establishment, exercise, or defence of legal claims, or for other reasons permitted by the GDPR."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "If you request erasure, we will assess whether any exceptions apply. If data can be erased, we will do so securely and confirm completion. If we cannot erase the data due to an exception, we will inform you of the reason."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "6. Records of Processing Activities (GDPR Art. 30)"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "As required by GDPR Article 30, {{organization}} maintains internal records of its data processing activities. These records include, where applicable:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "The purposes of the processing."
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
                  text: "A description of the categories of data subjects and personal data."
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
                  text: "The categories of recipients to whom data has been or will be disclosed."
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
                  text: "The envisaged time limits for erasure of the different categories of data (our retention schedules)."
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
                  text: "A general description of the technical and organisational security measures."
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
          text: "These records help us manage data processing effectively and demonstrate compliance, including adherence to our retention policies."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "7. General Retention Schedules Overview"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Below is a general overview of retention periods for common categories of data. Specific retention periods may vary and are detailed in our internal Records of Processing Activities (RoPA) and relevant specific privacy notices."
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
              content: [{ type: "text", text: "Data Category" }]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "General Retention Guideline"
                }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Basis" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Customer Account Data (Active)"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Duration of customer relationship/contract"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Contractual necessity, business need"
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
              content: [
                {
                  type: "text",
                  text: "Customer Account Data (Inactive)"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Defined period after last activity or contract termination + statutory limitation periods (e.g., [X] years)"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Legal obligations, defense of legal claims, business need"
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
              content: [
                {
                  type: "text",
                  text: "Financial & Transaction Records"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "As required by financial/tax law (e.g., [Y] years)"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "Legal obligation" }
              ]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                { type: "text", text: "Employee Records" }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Duration of employment + period required by employment/tax law and statutory limitation periods (e.g., [Z] years post-termination)"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Legal obligation, contractual necessity, defense of legal claims"
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
              content: [
                {
                  type: "text",
                  text: "Recruitment Data (Unsuccessful Applicants)"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Short period after recruitment process (e.g., [e.g., 6 months]), unless consent for longer retention is obtained."
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Legitimate interest (defense against discrimination claims), consent"
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
              content: [
                {
                  type: "text",
                  text: "System Logs / Audit Trails"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Defined period based on security needs and regulations (e.g., [e.g., 12 months])"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Legitimate interest (security), legal/regulatory obligation"
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
              content: [
                {
                  type: "text",
                  text: "Marketing Data (Consent-Based)"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Until consent is withdrawn or data becomes outdated/irrelevant."
                }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Consent" }]
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
          marks: [{ type: "italic" }],
          text: "Note: [X], [Y], [Z], etc., represent specific timeframes defined by the organization based on legal analysis and business requirements."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        { type: "text", text: "8. Secure Deletion and Anonymization" }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "When personal data reaches the end of its retention period, or upon a valid erasure request, we will securely delete or anonymize it in accordance with our data handling procedures and applicable standards. Anonymization means altering the data so that individuals can no longer be identified from it."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "9. Your Rights" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "In addition to the Right to Erasure (Article 17), you have other rights regarding your personal data, including the right to access, rectify, restrict processing, and data portability. Please refer to our main Privacy Policy or contact our DPO/Legal Department for more information on how to exercise your rights."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "10. Changes to this Notice" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "We may update this Data Retention Notice periodically to reflect changes in legal requirements or our data handling practices. We encourage you to review this notice regularly. Significant changes will be communicated through appropriate channels."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "11. Contact Information" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "For any questions about this notice or our data retention practices, please contact:"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Data Protection Officer / Legal Department"
        },
        { type: "hardBreak" },
        { type: "text", text: "{{organization}}" },
        { type: "hardBreak" },
        { type: "text", text: "[Your Company Address]" },
        { type: "hardBreak" },
        { type: "text", text: "[DPO/Legal Contact Email/Address]" }
      ]
    }
  ]
};

// src/templates/policies/data/data-retention-schedule.policy.ts
var dataRetentionSchedulePolicy = {
  type: "doc",
  metadata: {
    id: "data_retention_schedule",
    slug: "data-retention-schedule",
    name: "Data Retention Schedule",
    description: "This schedule details the retention periods for various categories of personal data processed by the organization, as required by GDPR Article 30.",
    frequency: "yearly",
    department: "it"
    // Or IT/Compliance/Legal
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Data Retention Schedule" }]
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
              content: [{ type: "text", text: "Effective Date" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Updated" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Contact" }]
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
              content: [
                { type: "text", text: "{{organization}}" }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
              // Effective Date
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
              // Last Updated Date
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Data Protection Officer / Legal Department"
                  // Or specific contact
                }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Internal" }]
              // Typically internal or restricted
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "1. Introduction and Purpose" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This Data Retention Schedule is maintained by {{organization}} ('we', 'us', 'our') in accordance with GDPR Article 30 (Records of processing activities) and complements our overall Data Retention Policy/Notice. It outlines the standard periods for which different categories of personal data are retained and the basis for these retention periods."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Retention periods are determined based on legal, regulatory, contractual, and legitimate business requirements. Data is retained for no longer than necessary for the purposes for which it was processed."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "2. Retention Schedule"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The following table details the retention periods for key data categories. Specific retention periods might be adjusted based on overriding legal obligations or specific contexts detailed in relevant privacy notices."
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
              content: [{ type: "text", text: "Data Category" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Examples" }]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Standard Retention Period"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Basis for Retention / Deletion Trigger"
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
              content: [
                {
                  type: "text",
                  text: "Customer Account & Contact Data"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Name, email, address, phone, company, login credentials, contract details."
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Duration of active contract/service + [X] years post-termination/inactivity."
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Contractual necessity, legitimate interest (account management, support), legal obligation (statutory limitation periods for claims). Deletion triggered after [X] years of inactivity post-contract."
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
              content: [
                {
                  type: "text",
                  text: "Customer Service & Support Records"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Support tickets, email correspondence, chat logs, call recordings (if applicable)."
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Duration of active contract/service + [Y] years post-interaction."
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Legitimate interest (service improvement, dispute resolution), contractual necessity (providing support). Deletion triggered after [Y] years."
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
              content: [
                {
                  type: "text",
                  text: "Financial & Transaction Records"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Invoices, payment details (masked/tokenized), order history, tax information."
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "As required by applicable financial/tax law (e.g., [Z] years after the end of the financial year)."
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Legal obligation (tax, accounting laws). Deletion triggered after statutory period expires."
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
              content: [
                {
                  type: "text",
                  text: "System & Security Logs"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Access logs, audit trails, error logs, IP addresses."
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[A] months/days (rolling basis)."
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Legitimate interest (security monitoring, troubleshooting, compliance), potential legal obligations. Automatic deletion/overwrite after [A] period."
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
              content: [
                {
                  type: "text",
                  text: "Marketing & Communication Data (Consent-Based)"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Email addresses for newsletters, marketing preferences, communication history."
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Until consent is withdrawn or data becomes inactive/outdated (e.g., after [B] years of no engagement)."
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Consent. Deletion triggered by consent withdrawal or inactivity/periodic review."
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
              content: [
                {
                  type: "text",
                  text: "Employee Records"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Employment contracts, payroll data, performance reviews, HR files."
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Duration of employment + [C] years post-termination (as required by labor/tax laws and statutory limitations)."
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Legal obligation (employment, tax laws), contractual necessity, defense of legal claims. Deletion triggered after statutory/policy period expires."
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
              content: [
                {
                  type: "text",
                  text: "Recruitment Data (Unsuccessful Applicants)"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "CVs, application forms, interview notes."
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[D] months after the recruitment process concludes, unless consent for longer retention (e.g., talent pool) is obtained."
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Legitimate interest (defense against discrimination claims), consent (for talent pool). Deletion triggered after [D] months or upon consent withdrawal."
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
              content: [
                {
                  type: "text",
                  text: "Backup Data"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Copies of operational data stored for disaster recovery."
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Typically shorter, rolling periods (e.g., [E] days/weeks), aligned with backup strategy and recovery point objectives. Not intended for primary data access."
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Legitimate interest (business continuity, disaster recovery). Subject to overwrite/deletion cycles based on backup policy."
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
          marks: [{ type: "italic" }],
          text: "Note: [X], [Y], [Z], [A], [B], [C], [D], [E] represent specific timeframes defined by the organization based on detailed legal analysis, regulatory requirements, and business needs. These should be documented internally."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "3. Secure Disposal"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Upon expiry of the retention period, personal data will be securely disposed of (deleted or anonymized) in accordance with our data security policies and procedures."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "4. Review and Updates"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This Data Retention Schedule is reviewed at least annually and updated as necessary to reflect changes in legal obligations, business practices, or data processing activities. The 'Last Updated' date indicates the latest revision."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "5. Contact Information" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "For questions regarding this schedule or our data retention practices, please contact the Data Protection Officer / Legal Department at [DPO/Legal Contact Email/Address]."
        }
      ]
    }
  ]
};

// src/templates/policies/data/data-subject-consent-form.policy.ts
var dataSubjectConsentFormPolicy = {
  type: "doc",
  metadata: {
    id: "data_subject_consent_form",
    slug: "data-subject-consent-form",
    name: "Data Subject Consent Form",
    description: "A template for obtaining explicit consent from data subjects for processing personal data, including sensitive data, in compliance with GDPR Articles 6, 7, and 9.",
    frequency: "yearly",
    department: "admin"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Data Subject Consent Form" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Consent Information" }]
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
                  type: "text",
                  text: "Organization (Data Controller)"
                }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Date Issued" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Version" }]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "Contact for Queries" }
              ]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                { type: "text", text: "{{organization}}" }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
              // Date form is provided
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "1.0" }]
              // Version number
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[DPO/Legal Contact Email/Address]"
                  // Specific contact
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
      content: [{ type: "text", text: "1. Introduction" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This form is provided by {{organization}} ('we', 'us', 'our'). We are committed to protecting your privacy and processing your personal data transparently and securely in compliance with the General Data Protection Regulation (GDPR)."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "We are asking for your consent to collect and process your personal data for the specific purpose(s) outlined below. Please read this form carefully before providing your consent."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "2. Purpose(s) of Data Processing"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "We request your consent to process your personal data for the following specific purpose(s):"
        }
      ]
    },
    {
      type: "bulletList",
      // Use bullet points for clarity
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
                  text: "[Clearly describe Purpose 1, e.g., To provide you with access to our SaaS platform features.]"
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
                  text: "[Clearly describe Purpose 2, e.g., To send you marketing communications about relevant products and services.]"
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
                  text: "[Add more purposes as needed...]"
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
        {
          type: "text",
          text: "3. Categories of Personal Data Processed"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "With your consent, we intend to process the following categories of personal data:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  marks: [{ type: "bold" }],
                  text: "Standard Personal Data:"
                },
                {
                  type: "text",
                  text: " [List specific data, e.g., Name, Email Address, IP Address, Company Name, Usage Data]."
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
                  text: "Special Categories of Personal Data (Sensitive Data, if applicable):"
                },
                {
                  type: "text",
                  text: " [List specific sensitive data requiring explicit consent under Art. 9, e.g., Health Information, Biometric Data - specify *why* this is needed for the purpose]. If none, state 'We do not intend to process special categories of personal data based on this consent.'"
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
      content: [{ type: "text", text: "4. Legal Basis for Processing" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The legal basis for processing the personal data listed above is your explicit consent, provided in accordance with GDPR Article 6(1)(a)."
        }
      ]
    },
    {
      type: "paragraph",
      // Add this only if processing sensitive data
      content: [
        {
          type: "text",
          text: "For any special categories of personal data (sensitive data) listed, the legal basis is your explicit consent provided in accordance with GDPR Article 9(2)(a)."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "5. Your Rights" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Under GDPR, you have several rights regarding your personal data, including:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "The right to access your data."
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
                  text: "The right to rectification of inaccurate data."
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
                  text: "The right to erasure ('right to be forgotten')."
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
                  text: "The right to restrict processing."
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
                  text: "The right to data portability."
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
                  text: "The right to object to processing."
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
                  text: "The right to withdraw consent at any time."
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
          text: "To exercise any of these rights, please contact us at [DPO/Legal Contact Email/Address]."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "6. Withdrawal of Consent" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "You have the right to withdraw your consent at any time. Withdrawing consent is as easy as giving it. You can withdraw consent by [Clearly describe the method, e.g., clicking the unsubscribe link in emails, changing settings in your account profile, contacting us directly at [Specific Email/Link]]."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Please note that withdrawing consent will not affect the lawfulness of any processing carried out before you withdrew your consent. Once consent is withdrawn, we will cease processing your data for the purpose(s) you originally consented to, unless we have another legitimate legal basis for doing so."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "7. Data Retention" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Your personal data will be retained only for as long as necessary to fulfill the purpose(s) stated above, or as required by law. For more details, please refer to our Data Retention Policy/Schedule available at [Link to Policy/Schedule or contact info]."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      // Adjust numbering if Data Transfers section is added
      content: [{ type: "text", text: "8. Declaration of Consent" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "By signing/checking below, I confirm that I have read and understood the information provided in this form regarding the processing of my personal data by {{organization}}."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "I hereby freely give my specific, informed, and unambiguous consent to the processing of my personal data for the purpose(s) described above."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "____________________________" }
        // Placeholder for signature or digital confirmation marker
      ]
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Full Name: [Data Subject Name]" }]
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Date: {{date}}" }]
      // Date consent given
    }
  ]
};

// src/templates/policies/data/disaster_recovery.policy.ts
var disasterRecoveryPolicy = {
  type: "doc",
  metadata: {
    id: "disaster_recovery",
    slug: "disaster-recovery-policy",
    name: "Disaster Recovery Policy",
    description: "This policy outlines the requirements for disaster recovery planning to ensure the organization can recover from disruptive events.",
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

// src/templates/policies/data/dpia-register.policy.ts
var dpiaRegisterPolicy = {
  type: "doc",
  metadata: {
    id: "dpia_register",
    slug: "dpia-register",
    name: "Data Protection Impact Assessment (DPIA) Register",
    description: "Register to document Data Protection Impact Assessments (DPIAs) conducted in accordance with GDPR Article 35, particularly for processing likely to result in a high risk to the rights and freedoms of natural persons.",
    frequency: "yearly",
    department: "admin"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [
        {
          type: "text",
          text: "Data Protection Impact Assessment (DPIA) Register"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "In accordance with Article 35 of the General Data Protection Regulation (GDPR), this register documents Data Protection Impact Assessments (DPIAs). A DPIA is required for processing operations that are likely to result in a high risk to the rights and freedoms of natural persons, particularly those involving new technologies, or considering the nature, scope, context, and purposes of the processing. This register provides a systematic description of the envisaged processing operations, an assessment of the necessity and proportionality, an assessment of the risks to data subjects, and the measures envisaged to address these risks."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "DPIA Register Entries" }]
    },
    {
      type: "table",
      content: [
        // Header Row
        {
          type: "tableRow",
          content: [
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "ID" }]
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Processing Activity Description"
                    }
                  ]
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Date of Assessment"
                    }
                  ]
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Data Controller / Department"
                    }
                  ]
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Purpose(s) of Processing"
                    }
                  ]
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Categories of Personal Data"
                    }
                  ]
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Categories of Data Subjects"
                    }
                  ]
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Data Recipients"
                    }
                  ]
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Necessity & Proportionality Assessment"
                    }
                  ]
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Risk Identification & Assessment"
                    }
                  ]
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Measures to Address Risks"
                    }
                  ]
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Consultation" }
                  ]
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Approval (DPO/Lead) & Date"
                    }
                  ]
                }
              ]
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Next Review Date"
                    }
                  ]
                }
              ]
            }
          ]
        },
        // Example/Placeholder Row (Users should add new rows below this)
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
                      text: "[DPIA-YYYY-NN]"
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
                      text: "[Systematic description of the processing operation, e.g., Implementation of new AI-powered customer support tool]"
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
                    { type: "text", text: "{{date}}" }
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
                      text: "[e.g., {{organization}} / Customer Success Dept.]"
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
                      text: "[Specific purposes, e.g., Improve response times, automate query resolution, analyze support trends]"
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
                      text: "[e.g., User contact info, support ticket content, usage metadata, potentially special category data if applicable]"
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
                      text: "[e.g., Customers, support agents]"
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
                      text: "[Internal teams, third-party tool provider (Sub-processor), auditors]"
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
                      text: "[Assessment summary: Is processing necessary for the purpose? Are the means proportionate? Alternatives considered?]"
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
                      text: "[Identify risks to data subjects (e.g., unauthorized access, inaccurate profiling, lack of transparency). Assess likelihood and impact.]"
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
                      text: "[Technical (e.g., encryption, access controls) and Organisational (e.g., policies, training, DPA with vendor) measures planned or in place.]"
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
                      text: "[Record of consultation with DPO, data subjects (if applicable), Supervisory Authority (if required under Art. 36)]"
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
                      text: "[Name/Title & {{date}}]"
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
                      text: "[Date or condition for review, e.g., Annually, or upon significant change]"
                    }
                  ]
                }
              ]
            }
          ]
        }
        // Add more rows here for each DPIA conducted
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "Guidance on Completing the DPIA Register"
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
                  marks: [{ type: "bold" }],
                  text: "ID:"
                },
                {
                  type: "text",
                  text: " Assign a unique identifier for tracking (e.g., DPIA-YYYY-NN)."
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
                  text: "Processing Activity:"
                },
                {
                  type: "text",
                  text: " Clearly describe the project, system, or process involving personal data."
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
                  text: "Necessity & Proportionality:"
                },
                {
                  type: "text",
                  text: " Justify why the processing is required and proportionate to achieve the stated purposes."
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
                  text: "Risk Identification:"
                },
                {
                  type: "text",
                  text: " Consider potential impacts on data subjects' rights (confidentiality, integrity, availability, non-discrimination, etc.). Evaluate likelihood and severity."
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
                  text: "Measures:"
                },
                {
                  type: "text",
                  text: " Detail specific controls (technical and organizational) to mitigate identified risks."
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
                  text: "Consultation:"
                },
                {
                  type: "text",
                  text: " Document who was consulted (DPO is mandatory). If risks remain high after mitigation, consultation with the Supervisory Authority may be required (Art. 36)."
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
                  text: "Review:"
                },
                {
                  type: "text",
                  text: " DPIAs should be reviewed periodically, especially if the processing context or risks change."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// src/templates/policies/data/employee-privacy-notice.policy.ts
var employeePrivacyNoticePolicy = {
  type: "doc",
  metadata: {
    id: "employee_privacy_notice",
    slug: "employee-privacy-notice",
    name: "Employee Privacy Notice",
    description: "This notice explains how we collect, use, and protect the personal data of our employees, workers, and contractors in compliance with GDPR Articles 12, 13, and 14.",
    frequency: "yearly",
    department: "hr"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Employee Privacy Notice" }]
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
              content: [{ type: "text", text: "Effective Date" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Updated" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Contact" }]
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
              content: [
                { type: "text", text: "{{organization}}" }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
              // Effective Date
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
              // Last Updated Date
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "HR Department / Data Protection Officer"
                  // Or specific contact email
                }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Confidential" }]
              // Usually confidential for internal use
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "1. Introduction" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "{{organization}} ('we', 'us', 'our') is committed to protecting the privacy and security of your personal data. This Employee Privacy Notice describes how we collect and use personal data about you during and after your working relationship with us, in accordance with the General Data Protection Regulation (GDPR) and other applicable data protection laws."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This notice applies to current and former employees, workers, and contractors. It addresses the requirements of GDPR Articles 12 (Transparent Information), 13 (Information collected from the data subject), and 14 (Information not obtained from the data subject)."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "2. Data Controller Information" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The data controller responsible for your personal data is {{organization}}, located at [Your Company Address]. You can contact our Data Protection Officer (DPO) or the HR Department for privacy-related questions at [HR/DPO Contact Email/Address]."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        { type: "text", text: "3. Information We Collect About You" }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "We collect and process a range of personal data about you. This includes:"
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
                  marks: [{ type: "bold" }],
                  text: "Data You Provide Directly (Art. 13):"
                },
                {
                  type: "text",
                  text: " Information you provide during the recruitment process, onboarding, and throughout your employment."
                },
                {
                  type: "bulletList",
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
                              text: "Personal Contact Details: Name, title, addresses, telephone numbers, and personal email addresses."
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
                              text: "Identification Data: Date of birth, gender, marital status, dependents, next of kin, emergency contact information."
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
                              text: "Recruitment Information: CVs, cover letters, references, qualifications, right-to-work documentation."
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
                              text: "Employment Records: Job titles, work history, working hours, training records, performance information, disciplinary and grievance information."
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
                              text: "Compensation and Benefits Information: Salary, bank account details, payroll records, tax status information, pension and benefits information."
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
                              text: "Leave Information: Holiday records, sickness absence records (including potentially sensitive health data where necessary and legally permitted)."
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
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Data Collected Automatically:"
                },
                {
                  type: "text",
                  text: " Information collected through your use of company systems and premises."
                },
                {
                  type: "bulletList",
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
                              text: "IT System Usage: Information about your use of our information and communication systems (e.g., login data, access logs, email usage, internet access data) as permitted by law and relevant policies (e.g., Acceptable Use Policy)."
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
                              text: "Security Monitoring: Information gathered through security systems (e.g., CCTV footage in specific areas for security purposes, access control records)."
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
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Data Obtained from Third Parties (Art. 14):"
                },
                {
                  type: "text",
                  text: " Information from other sources."
                },
                {
                  type: "bulletList",
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
                              text: "Recruitment Agencies: Information provided during the hiring process."
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
                              text: "Background Check Providers: Information obtained during pre-employment screening (where applicable and legally permitted, with your consent)."
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
                              text: "Former Employers: References provided by former employers."
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
                              text: "Public Sources: Information from publicly available sources (e.g., LinkedIn for recruitment/verification)."
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
                              text: "Government Agencies: Information related to tax or social security."
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  type: "text",
                  text: " When we obtain personal data about you from third parties, we will provide you with the information required under GDPR Article 14 (e.g., source, categories of data) unless an exception applies (e.g., providing the information is impossible, involves disproportionate effort, or is subject to legal/professional secrecy obligations)."
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
                  text: "Special Categories of Personal Data:"
                },
                {
                  type: "text",
                  text: " We may also collect, store, and use 'special categories' of more sensitive personal data where necessary and legally permitted (e.g., information about health for sick pay or reasonable adjustments, race/ethnic origin for equality monitoring). We will ensure additional safeguards and specific legal bases apply to such processing."
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
        {
          type: "text",
          text: "4. How We Use Your Personal Data (Purposes of Processing)"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "We use your personal data for purposes necessary for the performance of our employment contract with you, to comply with legal obligations, and for our legitimate interests. These purposes include:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "Making recruitment decisions and determining terms of engagement."
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
                  text: "Administering the employment contract, including payroll, benefits, and pensions."
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
                  text: "Business management and planning, including accounting and auditing."
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
                  text: "Conducting performance reviews, managing performance, and determining performance requirements."
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
                  text: "Making decisions about salary reviews and compensation."
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
                  text: "Assessing qualifications for a particular job or task, including decisions about promotions."
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
                  text: "Gathering evidence for grievance or disciplinary hearings."
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
                  text: "Making decisions about your continued employment or engagement."
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
                  text: "Arranging cessation of the working relationship."
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
                  text: "Education, training, and development requirements."
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
                  text: "Dealing with legal disputes involving you, or other employees, workers, and contractors."
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
                  text: "Complying with health and safety obligations."
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
                  text: "Preventing fraud."
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
                  text: "Monitoring your use of our information and communication systems to ensure compliance with our IT policies (subject to applicable laws)."
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
                  text: "Ensuring network and information security."
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
                  text: "Equal opportunities monitoring."
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
      content: [{ type: "text", text: "5. Legal Basis for Processing" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "We process your personal data based on the following legal grounds under GDPR:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  marks: [{ type: "bold" }],
                  text: "Contractual Necessity (Art. 6(1)(b)):"
                },
                {
                  type: "text",
                  text: " Processing necessary to perform the employment contract between you and us."
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
                  text: "Legal Obligation (Art. 6(1)(c)):"
                },
                {
                  type: "text",
                  text: " Processing necessary to comply with our legal or regulatory obligations (e.g., tax, social security, health and safety, right-to-work checks)."
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
                  text: "Legitimate Interests (Art. 6(1)(f)):"
                },
                {
                  type: "text",
                  text: " Processing necessary for our legitimate interests (or those of a third party), such as running our business efficiently, managing our workforce, ensuring security, and preventing fraud, provided these interests are not overridden by your fundamental rights and freedoms."
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
                  text: "Consent (Art. 6(1)(a)):"
                },
                {
                  type: "text",
                  text: " In limited circumstances, we may rely on your explicit consent for specific processing activities (e.g., certain types of background checks, using your image for marketing). You have the right to withdraw consent at any time."
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
                  text: "Processing Special Categories of Data (Art. 9):"
                },
                {
                  type: "text",
                  text: " We process special categories of data (e.g., health data) primarily based on legal obligations in employment law (Art. 9(2)(b)), for assessing working capacity (Art. 9(2)(h)), or with your explicit consent (Art. 9(2)(a)) where appropriate."
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
      content: [{ type: "text", text: "6. Data Sharing and Disclosure" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "We may need to share your personal data internally (e.g., with HR, managers, IT staff if access is necessary for their roles) and with third parties. This may include:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  marks: [{ type: "bold" }],
                  text: "Service Providers (Processors):"
                },
                {
                  type: "text",
                  text: " Third-party service providers who perform functions on our behalf, such as payroll providers, benefits administration providers, IT service providers, cloud hosting providers, background check agencies (where applicable). They are required to respect the security of your data and treat it in accordance with the law."
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
                  text: "Other Third Parties:"
                },
                {
                  type: "text",
                  text: " Professional advisors (e.g., lawyers, accountants, auditors), regulatory bodies (e.g., tax authorities), government agencies, law enforcement."
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
                  text: "Business Transfers:"
                },
                {
                  type: "text",
                  text: " In connection with a merger, acquisition, reorganization, or sale of assets, your data may be transferred."
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
        { type: "text", text: "7. International Data Transfers" }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Some of our third-party service providers may be based outside the European Economic Area (EEA). If we transfer your personal data out of the EEA, we ensure a similar degree of protection is afforded to it by ensuring at least one of the following safeguards is implemented:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "Transfers to countries deemed adequate by the European Commission."
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
                  text: "Use of specific contracts approved by the European Commission (Standard Contractual Clauses - SCCs)."
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
                  text: "Other valid transfer mechanisms permitted under GDPR."
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
          text: "Please contact us if you want further information on the specific mechanism used when transferring your personal data out of the EEA."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "8. Data Retention" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "We will only retain your personal data for as long as necessary to fulfil the purposes we collected it for, including for the purposes of satisfying any legal, accounting, or reporting requirements. Generally, we will retain HR records for the duration of your employment plus a period of [Specify Period, e.g., 6 years] after termination, subject to legal or regulatory requirements."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Retention periods may vary depending on the type of data and the specific legal context. For example, recruitment information for unsuccessful candidates may be held for a shorter period (e.g., [Specify Period, e.g., 6 months])."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "9. Your Data Protection Rights" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Under GDPR, you have several rights regarding your personal data:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  marks: [{ type: "bold" }],
                  text: "Right of Access:"
                },
                {
                  type: "text",
                  text: " Request a copy of the personal data we hold about you."
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
                  text: "Right to Rectification:"
                },
                {
                  type: "text",
                  text: " Request correction of inaccurate or incomplete data."
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
                  text: "Right to Erasure ('Right to be Forgotten'):"
                },
                {
                  type: "text",
                  text: " Request deletion of your personal data where there is no good reason for us continuing to process it."
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
                  text: "Right to Restriction of Processing:"
                },
                {
                  type: "text",
                  text: " Request suspension of the processing of your personal data in certain circumstances."
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
                  text: "Right to Data Portability:"
                },
                {
                  type: "text",
                  text: " Request the transfer of your personal data to you or a third party in a structured, commonly used, machine-readable format (applies to data processed based on consent or contract)."
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
                  text: "Right to Object:"
                },
                {
                  type: "text",
                  text: " Object to processing based on legitimate interests (or for direct marketing)."
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
                  text: "Right to Withdraw Consent:"
                },
                {
                  type: "text",
                  text: " Withdraw consent at any time where processing is based on consent."
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
          text: "To exercise any of these rights, please contact the HR Department or DPO using the details in Section 2. We may need to request specific information from you to help us confirm your identity."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "You also have the right to lodge a complaint with the relevant supervisory authority for data protection issues (e.g., the Information Commissioner's Office (ICO) in the UK, or the equivalent authority in your EU member state)."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "10. Data Security" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "We have put in place appropriate technical and organizational security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed. Access to your personal data is limited to those employees, agents, contractors and other third parties who have a business need to know. They will only process your personal data on our instructions and they are subject to a duty of confidentiality. We have procedures to deal with any suspected data security breach and will notify you and any applicable regulator of a suspected breach where we are legally required to do so."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        { type: "text", text: "11. Changes to this Privacy Notice" }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "We reserve the right to update this privacy notice at any time. We will provide you with a new privacy notice when we make any substantial updates. We may also notify you in other ways from time to time about the processing of your personal data."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "12. Contact Information" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "If you have any questions about this privacy notice or how we handle your personal data, please contact the HR Department or the Data Protection Officer (DPO) at:"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "{{organization}}" },
        { type: "hardBreak" },
        { type: "text", text: "[Your Company Address]" },
        { type: "hardBreak" },
        { type: "text", text: "[HR/DPO Contact Email/Address]" }
      ]
    }
  ]
};

// src/templates/policies/data/human_resources.policy.ts
var humanResourcesPolicy = {
  type: "doc",
  metadata: {
    id: "human_resources",
    slug: "human-resources-policy",
    name: "Human Resources Policy",
    description: "This policy outlines the principles and practices for recruitment, employee management, performance evaluations, and the enforcement of internal control responsibilities.",
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
    slug: "incident-response-policy",
    name: "Incident Response Policy",
    description: "This policy establishes the framework and procedures for detecting, responding to, and recovering from security incidents.",
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
    slug: "information-security-policy",
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
    slug: "password-policy",
    name: "Password Policy",
    description: "This policy outlines the requirements for passwords used by employees.",
    frequency: "yearly",
    department: "it"
  },
  content: []
};

// src/templates/policies/data/privacy-notice.policy.ts
var privacyNoticePolicy = {
  type: "doc",
  metadata: {
    id: "privacy_notice",
    slug: "privacy-notice",
    name: "Privacy Notice",
    description: "This document explains how we collect, use, and protect your personal data in compliance with GDPR Articles 12, 13, and 14.",
    frequency: "yearly",
    // Or as needed based on changes
    department: "admin"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Privacy Notice" }]
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
              content: [{ type: "text", text: "Effective Date" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Last Updated" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Contact" }]
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
              content: [
                { type: "text", text: "{{organization}}" }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
              // Effective Date
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
              // Last Updated Date
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Data Protection Officer / Legal Department"
                  // Or specific contact email
                }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Public" }]
              // Usually public
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "1. Introduction" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "{{organization}} ('we', 'us', 'our') is committed to protecting your privacy. This Privacy Notice explains how we collect, use, disclose, and safeguard your personal data when you use our services ('Services'). It also describes your rights regarding your personal data and how you can exercise them."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "We process personal data in accordance with the General Data Protection Regulation (GDPR) and other applicable data protection laws. This notice addresses the requirements of GDPR Articles 12, 13, and 14."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "2. Data Controller Information" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The data controller responsible for your personal data is {{organization}}, located at [Your Company Address]. You can contact our Data Protection Officer (DPO) or the relevant department for privacy matters at [Your Privacy Contact Email/Address]."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "3. Information We Collect" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "We collect personal data through various means, including:"
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
                  marks: [{ type: "bold" }],
                  text: "Data You Provide Directly (Art. 13):"
                },
                {
                  type: "text",
                  text: " This includes information you provide when you register for an account, use our Services, subscribe to newsletters, fill out forms, contact support, or communicate with us. Examples include:"
                },
                {
                  type: "bulletList",
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
                              text: "Contact Information: Name, email address, phone number, company name, job title."
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
                              text: "Account Information: Username, password, profile information."
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
                              text: "Payment Information: Billing details, credit card information (processed securely by third-party payment processors)."
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
                              text: "Communications: Records of your correspondence with us."
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
                              text: "User Content: Data you upload or submit while using the Services."
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
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Data Collected Automatically:"
                },
                {
                  type: "text",
                  text: " When you use our Services, we may automatically collect certain information about your device and usage. Examples include:"
                },
                {
                  type: "bulletList",
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
                              text: "Log Data: IP address, browser type, operating system, access times, pages viewed, referring URLs."
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
                              text: "Usage Data: Features used, actions taken within the application, performance metrics."
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
                              text: "Cookies and Similar Technologies: We use cookies to enhance user experience, analyze usage, and for authentication. [Link to Cookie Policy, if separate]"
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
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Data Obtained from Third Parties (Art. 14):"
                },
                {
                  type: "text",
                  text: " We may occasionally receive information about you from third-party sources, such as:"
                },
                {
                  type: "bulletList",
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
                              text: "Integration Partners: If you integrate third-party services with our platform."
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
                              text: "Publicly Available Sources: Data from public databases or websites (e.g., company information)."
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
                              text: "Marketing Partners: Data from partners assisting with marketing efforts (where legally permitted)."
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  type: "text",
                  text: " When we obtain data from third parties, we will inform you about the source and categories of data collected, unless providing such information proves impossible or would involve a disproportionate effort, or where obtaining or disclosure is expressly laid down by law, or where the personal data must remain confidential subject to an obligation of professional secrecy."
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
        {
          type: "text",
          text: "4. How We Use Your Information (Purposes of Processing)"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "We use the collected personal data for the following purposes:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "To Provide and Manage Services: Operate, maintain, and improve our Services, authenticate users, process transactions."
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
                  text: "To Communicate With You: Respond to inquiries, send service-related announcements, provide customer support, send marketing communications (with consent where required)."
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
                  text: "For Personalization: Customize your experience and content."
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
                  text: "For Security and Compliance: Protect against fraud and abuse, enforce our terms, comply with legal obligations, respond to legal requests."
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
                  text: "For Analytics and Improvement: Understand how users interact with our Services to improve them."
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
      content: [{ type: "text", text: "5. Legal Basis for Processing" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "We process your personal data based on the following legal grounds under GDPR:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  marks: [{ type: "bold" }],
                  text: "Consent (Art. 6(1)(a)):"
                },
                {
                  type: "text",
                  text: " Where you have given explicit consent for specific purposes (e.g., marketing emails). You can withdraw consent at any time."
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
                  text: "Contractual Necessity (Art. 6(1)(b)):"
                },
                {
                  type: "text",
                  text: " Processing necessary to perform a contract with you (e.g., providing the Services you signed up for) or to take steps at your request before entering into a contract."
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
                  text: "Legal Obligation (Art. 6(1)(c)):"
                },
                {
                  type: "text",
                  text: " Processing necessary to comply with a legal obligation (e.g., tax laws, responding to lawful requests)."
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
                  text: "Legitimate Interests (Art. 6(1)(f)):"
                },
                {
                  type: "text",
                  text: " Processing necessary for our legitimate interests (e.g., improving services, security, preventing fraud), provided these interests are not overridden by your fundamental rights and freedoms."
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
      content: [{ type: "text", text: "6. Data Sharing and Disclosure" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "We do not sell your personal data. We may share your information with the following categories of recipients:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  marks: [{ type: "bold" }],
                  text: "Service Providers (Processors):"
                },
                {
                  type: "text",
                  text: " Third-party vendors who perform services on our behalf, such as cloud hosting, payment processing, analytics, customer support, and marketing assistance. These processors are bound by contractual obligations to protect your data and use it only for the purposes we specify."
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
                  text: "Legal Requirements:"
                },
                {
                  type: "text",
                  text: " If required by law, regulation, legal process, or governmental request."
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
                  text: "Business Transfers:"
                },
                {
                  type: "text",
                  text: " In connection with a merger, acquisition, sale of assets, or other business transition, your data may be transferred as part of the transaction."
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
                  text: "Protection of Rights:"
                },
                {
                  type: "text",
                  text: " To protect the rights, property, or safety of {{organization}}, our users, or others."
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
                  text: "With Your Consent:"
                },
                {
                  type: "text",
                  text: " We may share your data with third parties when we have your explicit consent to do so."
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
        { type: "text", text: "7. International Data Transfers" }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Your personal data may be transferred to, stored, and processed in countries other than your own, including countries outside the European Economic Area (EEA) where data protection laws may differ. We ensure that such transfers comply with GDPR by implementing appropriate safeguards, such as:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "Transfers to countries deemed adequate by the European Commission."
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
                  text: "Use of Standard Contractual Clauses (SCCs) approved by the European Commission."
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
                  text: "Other valid transfer mechanisms permitted under GDPR."
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
          text: "You can request more information about the safeguards we use for international transfers."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "8. Data Retention" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "We retain your personal data only for as long as necessary to fulfill the purposes for which it was collected, including for the purposes of satisfying any legal, accounting, or reporting requirements. The criteria used to determine retention periods include:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "The duration of your relationship with us and the provision of Services."
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
                  text: "Legal obligations to retain data for certain periods."
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
                  text: "The potential risk of harm from unauthorized use or disclosure."
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
                  text: "Whether we can achieve the purposes through other means."
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
          text: "Once retention periods expire, we will securely delete or anonymize your personal data."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "9. Your Data Protection Rights" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Under GDPR, you have the following rights regarding your personal data:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  marks: [{ type: "bold" }],
                  text: "Right of Access:"
                },
                {
                  type: "text",
                  text: " Request access to the personal data we hold about you."
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
                  text: "Right to Rectification:"
                },
                {
                  type: "text",
                  text: " Request correction of inaccurate or incomplete data."
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
                  text: "Right to Erasure ('Right to be Forgotten'):"
                },
                {
                  type: "text",
                  text: " Request deletion of your personal data under certain conditions."
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
                  text: "Right to Restriction of Processing:"
                },
                {
                  type: "text",
                  text: " Request restriction of processing under certain conditions."
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
                  text: "Right to Data Portability:"
                },
                {
                  type: "text",
                  text: " Request transfer of your data to another organization or directly to you, where technically feasible."
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
                  text: "Right to Object:"
                },
                {
                  type: "text",
                  text: " Object to processing based on legitimate interests or for direct marketing."
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
                  text: "Right to Withdraw Consent:"
                },
                {
                  type: "text",
                  text: " Withdraw consent at any time where processing is based on consent."
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
                  text: "Right to Lodge a Complaint:"
                },
                {
                  type: "text",
                  text: " Lodge a complaint with a supervisory authority (data protection authority) in your country of residence."
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
          text: "To exercise these rights, please contact us using the details provided in Section 2. We will respond to your request in accordance with applicable data protection laws, usually within one month."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "10. Data Security" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "We implement appropriate technical and organizational measures to protect your personal data against accidental or unlawful destruction, loss, alteration, unauthorized disclosure, or access. These measures include [mention general measures like encryption, access controls, regular security assessments - reference relevant security policies if applicable]. However, no method of transmission over the Internet or electronic storage is 100% secure."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "11. Children's Privacy" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Our Services are not intended for individuals under the age of [Specify age, e.g., 16 or 13 depending on jurisdiction and service]. We do not knowingly collect personal data from children. If we become aware that we have collected personal data from a child without parental consent, we will take steps to delete that information."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        { type: "text", text: "12. Changes to this Privacy Notice" }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "We may update this Privacy Notice from time to time to reflect changes in our practices or legal requirements. We will notify you of any material changes by posting the updated notice on our website or through other communication channels. We encourage you to review this notice periodically."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "13. Contact Information" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "If you have any questions, concerns, or requests regarding this Privacy Notice or our data protection practices, please contact us at:"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "{{organization}}" },
        { type: "hardBreak" },
        { type: "text", text: "[Your Company Address]" },
        { type: "hardBreak" },
        { type: "text", text: "[Your Privacy Contact Email/Address]" },
        { type: "hardBreak" },
        { type: "text", text: "[Link to DPO contact if applicable]" }
      ]
    }
  ]
};

// src/templates/policies/data/privacy.policy.ts
var privacyPolicy = {
  type: "doc",
  metadata: {
    id: "privacy",
    slug: "privacy-policy",
    name: "Privacy Policy",
    description: "This policy describes how the organization collects, uses, discloses, and protects personal information in compliance with applicable privacy regulations.",
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

// src/templates/policies/data/records-of-processing-activities.policy.ts
var recordsOfProcessingActivitiesPolicy = {
  type: "doc",
  metadata: {
    id: "records_of_processing_activities",
    slug: "records-of-processing-activities-ropa",
    name: "Records of Processing Activities (RoPA) Template",
    description: "Template for documenting processing activities as required by Article 30 of the GDPR. This applies to both Controllers and Processors (with specific sections for each).",
    frequency: "yearly",
    // RoPA should be kept up-to-date, reviewed periodically
    department: "admin"
    // Often managed by DPO/Compliance/Legal
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [
        {
          type: "text",
          text: "Records of Processing Activities (RoPA) - GDPR Article 30"
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "Part 1: Controller Records (GDPR Article 30(1))"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Each controller (or controller's representative) shall maintain a record of processing activities under its responsibility. That record shall contain all of the following information:"
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        {
          type: "text",
          text: "a) Name and Contact Details"
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
              content: [
                { type: "text", text: "Controller Name" }
              ]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "{{organization}}" }
              ]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Controller Representative (if applicable)"
                }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "[Name/Contact]" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Joint Controller(s) (if applicable)"
                }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "[Name/Contact]" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Data Protection Officer (DPO)"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[Name/Contact Details]"
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
      content: [
        {
          type: "text",
          text: "b) Purposes of the Processing"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "[List and describe the specific purposes for which personal data is processed, e.g., Customer relationship management, Employee administration, Marketing communications, Service provision, Security monitoring, Analytics]. Link to specific processing activities documented below."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        {
          type: "text",
          text: "c) Description of Categories of Data Subjects and Personal Data"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "[For each processing purpose/activity, describe the categories of individuals whose data is processed (e.g., Customers, Employees, Website Visitors, Suppliers) and the categories of personal data processed (e.g., Contact details, Financial data, Usage data, Health information - specify if special categories). Detailed mapping often done per activity below]."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        {
          type: "text",
          text: "d) Categories of Recipients"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "[List the categories of recipients to whom the personal data have been or will be disclosed (e.g., Internal departments (HR, IT), Payment processors, Cloud hosting providers, Marketing automation platforms, Auditors, Legal advisors, Government authorities)]."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        {
          type: "text",
          text: "e) Transfers of Personal Data to Third Countries or International Organisations"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "[Where applicable, identify the third countries or international organisations to which data is transferred and document the safeguards in place (e.g., Adequacy decision, Standard Contractual Clauses (SCCs), Binding Corporate Rules (BCRs), Derogations under Art. 49)]."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        {
          type: "text",
          text: "f) Envisaged Time Limits for Erasure (Retention Periods)"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "[Where possible, provide the planned retention periods for the different categories of data. Link to or reference the Data Retention Schedule/Policy]."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        {
          type: "text",
          text: "g) General Description of Technical and Organisational Security Measures (Art. 32(1))"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "[Where possible, provide a general description of the security measures implemented (e.g., Pseudonymisation, Encryption, Access controls, Confidentiality measures, Integrity checks, Availability/resilience measures, Backup/recovery processes, Regular security testing). Reference relevant security policies/documentation]."
        }
      ]
    },
    // Detailed Processing Activities Section (Optional but recommended structure)
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "Detailed Processing Activities (Controller)"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "(Repeat this section for each distinct processing activity)"
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
              type: "tableHeader",
              attrs: { colspan: 2 },
              content: [
                {
                  type: "text",
                  text: "Processing Activity ID & Name"
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
              content: [
                {
                  type: "text",
                  text: "Activity Description & Department"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[e.g., Managing customer subscriptions - Sales/Finance]"
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
              content: [{ type: "text", text: "Purpose(s)" }]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[Specific purpose for this activity, e.g., Process payments, provide access, communicate service updates]"
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
              content: [
                { type: "text", text: "Lawful Basis (Art. 6)" }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[e.g., Contractual Necessity (6(1)(b)), Legal Obligation (6(1)(c)), Legitimate Interest (6(1)(f) - specify interest), Consent (6(1)(a))]"
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
              content: [
                {
                  type: "text",
                  text: "Categories of Data Subjects"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[e.g., Paying Customers]"
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
              content: [
                {
                  type: "text",
                  text: "Categories of Personal Data"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[e.g., Name, Email, Company, Billing Address, Payment Info (last 4 digits), Subscription plan]"
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
              content: [
                {
                  type: "text",
                  text: "Special Category Data (Art. 9)? Lawful Basis?"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[Yes/No. If Yes, specify basis]"
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
              content: [{ type: "text", text: "Recipients" }]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[Internal: Sales, Finance. External: Payment Processor [Name], Cloud Provider [Name]]"
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
              content: [
                {
                  type: "text",
                  text: "Third Country Transfers? Safeguards?"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[Yes/No. If Yes, specify country/org and safeguard, e.g., USA (Payment Processor) - SCCs]"
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
              content: [
                { type: "text", text: "Retention Period" }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[e.g., Duration of contract + 7 years (financial records)]"
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
              content: [
                {
                  type: "text",
                  text: "Security Measures (General Ref)"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "[Refer to general measures in g) or specific policy, e.g., Encryption at rest/transit, Access controls based on role]"
                }
              ]
            }
          ]
        }
      ]
    },
    // Part 2: Processor Records
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "Part 2: Processor Records (GDPR Article 30(2))"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "(Applicable if {{organization}} acts as a data processor for other controllers). Each processor (or processor's representative) shall maintain a record of all categories of processing activities carried out on behalf of a controller, containing:"
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        {
          type: "text",
          text: "a) Name and Contact Details"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Processor Name/Contact: {{organization}} [Contact Details]"
        },
        { type: "hardBreak" },
        {
          type: "text",
          text: "Processor Representative (if applicable): [Name/Contact]"
        },
        { type: "hardBreak" },
        {
          type: "text",
          text: "Controller Name/Contact (for each controller): [List Controller(s) Name/Contact]"
        },
        { type: "hardBreak" },
        {
          type: "text",
          text: "Controller Representative (if applicable): [Name/Contact]"
        },
        { type: "hardBreak" },
        {
          type: "text",
          text: "DPO Name/Contact (Processor & Controller): [Details]"
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        {
          type: "text",
          text: "b) Categories of Processing carried out on behalf of each Controller"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "[Describe the categories of processing, e.g., Data hosting, Application support, Email delivery]"
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        {
          type: "text",
          text: "c) Transfers of Personal Data to Third Countries or International Organisations"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "[Where applicable, identify third countries/organisations and document safeguards (authorised by the Controller)]"
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        {
          type: "text",
          text: "d) General Description of Technical and Organisational Security Measures (Art. 32(1))"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "[Provide a general description of security measures implemented. Reference relevant policies/documentation]."
        }
      ]
    },
    // Maintenance and Review
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "Part 3: Maintenance and Review"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The records must be in writing, including in electronic form."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This RoPA must be kept up-to-date and reflect current processing activities. It shall be reviewed at least annually by the [DPO/Compliance Team] and updated whenever significant changes to processing occur."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The controller or the processor and, where applicable, the controller's or the processor's representative, shall make the record available to the supervisory authority on request."
        }
      ]
    }
  ]
};

// src/templates/policies/data/right-of-access.policy.ts
var rightOfAccessPolicy = {
  type: "doc",
  metadata: {
    id: "right_of_access",
    slug: "right-of-access-procedure",
    name: "Data Subject Access Request (DSAR) Procedure",
    description: "This procedure outlines the steps for handling requests from individuals exercising their right of access to their personal data under GDPR Article 15.",
    frequency: "yearly",
    department: "it"
  },
  content: [
    // Policy Information Header
    {
      type: "heading",
      attrs: { level: 1 },
      content: [
        {
          type: "text",
          text: "Data Subject Access Request (DSAR) Procedure"
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
              type: "tableHeader",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableHeader",
              content: [
                { type: "text", text: "Review Frequency" }
              ]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                { type: "text", text: "{{organization}}" }
              ]
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
                {
                  type: "text",
                  text: "[DPO/Legal Head/Relevant Authority]"
                }
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
    // Introduction and Purpose
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "1. Introduction and Purpose" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This procedure outlines the process for responding to Data Subject Access Requests (DSARs) received by {{organization}}. The purpose is to ensure that individuals can exercise their right of access under Article 15 of the General Data Protection Regulation (GDPR) effectively and that {{organization}} complies with its legal obligations."
        }
      ]
    },
    // Scope
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "2. Scope" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This procedure applies to all personal data processed by {{organization}} and covers all DSARs received from data subjects (or their authorized representatives) whose personal data is processed by the company."
        }
      ]
    },
    // Definitions
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "3. Definitions" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Data Subject Access Request (DSAR):"
        },
        {
          type: "text",
          text: " A request made by a data subject to access their personal data held by {{organization}} and receive information about how it is processed."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Personal Data (GDPR Art 4(1)):"
        },
        {
          type: "text",
          text: ' Any information relating to an identified or identifiable natural person ("data subject").'
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Data Subject:"
        },
        {
          type: "text",
          text: " An identified or identifiable natural person."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Data Protection Officer (DPO):"
        },
        {
          type: "text",
          text: " The individual designated (if applicable) responsible for overseeing data protection compliance."
        }
      ]
    },
    // Procedure Steps
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "4. DSAR Handling Procedure" }]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "4.1. Receiving the Request" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Data subjects can submit DSARs through designated channels, such as [Specify channels, e.g., dedicated email address (privacy@{{organization}}.com), online portal, postal mail to registered address]."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Requests received through other channels should be promptly forwarded to the [DPO/Designated Team, e.g., Legal or Privacy Team]."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        {
          type: "text",
          text: "4.2. Logging and Acknowledging the Request"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "All DSARs must be logged upon receipt in the DSAR Register [Link or reference to the Register]. The log should include the date received, requester details, request summary, and deadline for response (one month from receipt)."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Acknowledge receipt of the request to the data subject promptly, typically within [e.g., 5 working days]. The acknowledgement should confirm receipt and inform them of the response timeline and any potential need for identity verification."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        { type: "text", text: "4.3. Verifying Requester Identity" }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Reasonable steps must be taken to verify the identity of the requester before processing the DSAR, especially if the request is made electronically or if there are doubts about the identity."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Request only the minimum information necessary for verification. Avoid asking for excessive personal data. Verification methods may include [e.g., asking for account details, recent activity, checking against existing records, requesting a copy of ID in specific circumstances]."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The one-month response period starts upon receipt of the request, but can be paused while awaiting necessary identity verification."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        { type: "text", text: "4.4. Locating and Compiling Data" }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The [DPO/Designated Team] will coordinate a search across all relevant systems and departments where the data subject's personal data might be stored. This includes [List examples relevant to a SaaS company, e.g., CRM, user database, support tickets, logs, marketing platforms, backups]."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "All personal data relating to the identified data subject must be compiled."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "4.5. Reviewing the Data" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Review the compiled data to:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "Confirm it relates to the data subject."
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
                  text: "Identify any data belonging to third parties (which may need redaction or consent to disclose)."
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
                  text: "Assess if any exemptions apply (e.g., legal privilege, confidential references, disproportionate effort). Exemptions must be applied carefully and documented."
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
      content: [{ type: "text", text: "4.6. Preparing the Response" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The response must include:"
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
                  text: "Confirmation of whether personal data concerning the data subject is being processed."
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
                  text: "A copy of the personal data undergoing processing."
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
                  text: "The following information (as per GDPR Art 15(1) and 15(2)):"
                },
                {
                  type: "bulletList",
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
                              text: "Purposes of processing."
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
                              text: "Categories of personal data concerned."
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
                              text: "Recipients or categories of recipients (especially in third countries)."
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
                              text: "Envisaged retention period or criteria used to determine it."
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
                              text: "Existence of the right to request rectification, erasure, restriction, or objection."
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
                              text: "Right to lodge a complaint with a supervisory authority."
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
                              text: "Source of the data (if not collected directly from the data subject)."
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
                              text: "Existence of automated decision-making, including profiling (and meaningful information about the logic involved, significance, and consequences)."
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
                              text: "Safeguards applied if data is transferred to a third country."
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
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The information should be provided in a concise, transparent, intelligible, and easily accessible form, using clear and plain language."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "If no personal data is held, inform the data subject accordingly."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "4.7. Delivering the Response" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Provide the response within one month of receiving the request (or from successful identity verification if applicable)."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Deliver the response electronically (e.g., via secure email or portal) unless the data subject requests otherwise or made the request by non-electronic means."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The first copy of the data is generally provided free of charge. A reasonable fee based on administrative costs may be charged for further copies."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        {
          type: "text",
          text: "4.8. Handling Extensions and Complex Requests"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The response period may be extended by up to two further months where necessary, considering the complexity and number of requests."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "If an extension is needed, inform the data subject within the first month, explaining the reasons for the delay."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        {
          type: "text",
          text: "4.9. Handling Unfounded or Excessive Requests"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "If a request is manifestly unfounded or excessive (e.g., repetitive), {{organization}} may:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "Charge a reasonable fee considering administrative costs; OR"
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
                  text: "Refuse to act on the request."
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
          text: "The burden of demonstrating the manifestly unfounded or excessive character rests with {{organization}}. The data subject must be informed of the reason for the fee or refusal and their right to complain to the Supervisory Authority."
        }
      ]
    },
    // Roles and Responsibilities
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "5. Roles and Responsibilities" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Data Protection Officer (DPO) / Designated Team [e.g., Legal, Privacy]:"
        },
        {
          type: "text",
          text: " Oversee the DSAR process, log requests, coordinate data gathering, review data, prepare responses, ensure compliance, and handle complex cases or escalations."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "IT Department:"
        },
        {
          type: "text",
          text: " Assist in locating and retrieving data from relevant systems."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Relevant Department Heads/Data Owners:"
        },
        {
          type: "text",
          text: " Cooperate with the DPO/Designated Team to locate and provide relevant data within their remit."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "All Staff:"
        },
        {
          type: "text",
          text: " Forward any received DSARs to the appropriate channel immediately."
        }
      ]
    },
    // Record Keeping
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "6. Record Keeping" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "All DSARs, related correspondence, identity verification details, data provided, details of any fees charged or refusals, and reasons for delays must be documented and maintained in the DSAR Register for [Specify retention period, e.g., 2 years after request closure] or as per the data retention policy."
        }
      ]
    },
    // Policy Review
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "7. Policy Review" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This procedure will be reviewed at least annually by the [DPO/Legal Team] and updated as necessary to reflect changes in regulations, best practices, or business operations."
        }
      ]
    }
  ]
};

// src/templates/policies/data/right-to-data-portability.policy.ts
var rightToDataPortabilityPolicy = {
  type: "doc",
  metadata: {
    id: "right_to_data_portability",
    slug: "right-to-data-portability-policy",
    name: "Right to Data Portability Policy and Procedure",
    description: "Outlines the procedure for handling requests from data subjects to receive their personal data in a portable format or transmit it to another controller, in compliance with GDPR Article 20.",
    frequency: "yearly",
    department: "admin"
    // Or 'it' / 'legal' depending on company structure
  },
  content: [
    // Heading 1
    {
      type: "heading",
      attrs: { level: 1 },
      content: [
        {
          type: "text",
          text: "Right to Data Portability Policy and Procedure"
        }
      ]
    },
    // Policy Information Table
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
              type: "tableHeader",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableHeader",
              content: [
                { type: "text", text: "Review Frequency" }
              ]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                { type: "text", text: "{{organization}}" }
              ]
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
                {
                  type: "text",
                  text: "[DPO/Compliance Lead/Relevant Authority]"
                }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Internal" }]
            }
          ]
        }
      ]
    },
    // 1. Introduction and Purpose
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "1. Introduction and Purpose" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Article 20 of the General Data Protection Regulation (GDPR) grants data subjects the right to data portability. This allows individuals to receive personal data they have provided to a controller in a structured, commonly used, and machine-readable format, and to transmit that data to another controller without hindrance, where the processing is based on consent (Art 6(1)(a) or Art 9(2)(a)) or on a contract (Art 6(1)(b)), and the processing is carried out by automated means."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The purpose of this policy and procedure is to ensure that {{organization}} handles requests for data portability in a compliant, secure, and efficient manner, upholding the rights of data subjects."
        }
      ]
    },
    // 2. Scope
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "2. Scope" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This procedure applies to all personal data processed by {{organization}} as a data controller where the processing is based on consent or contract and carried out by automated means. It covers all employees, contractors, and relevant third parties involved in handling data subject requests or managing systems containing such personal data."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This right applies only to data provided by the data subject (actively or observed, e.g., usage data), not to inferred or derived data created by {{organization}}."
        }
      ]
    },
    // 3. Definitions
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "3. Definitions" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Personal Data (GDPR Art 4(1)):"
        },
        {
          type: "text",
          text: ' Any information relating to an identified or identifiable natural person ("data subject").'
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Processing (GDPR Art 4(2)):"
        },
        {
          type: "text",
          text: " Any operation performed on personal data by automated means, such as collection, recording, organization, structuring, storage, adaptation or alteration, retrieval, consultation, use, disclosure by transmission, dissemination or otherwise making available, alignment or combination, restriction, erasure or destruction."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Controller (GDPR Art 4(7)):"
        },
        {
          type: "text",
          text: " The natural or legal person, public authority, agency or other body which, alone or jointly with others, determines the purposes and means of the processing of personal data."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Data Subject:"
        },
        {
          type: "text",
          text: " The identified or identifiable natural person to whom personal data relates."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Data Portability:"
        },
        {
          type: "text",
          text: " The right for data subjects to receive their personal data in a specific format and transmit it."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Structured, Commonly Used, and Machine-Readable Format:"
        },
        {
          type: "text",
          text: " Formats like CSV, JSON, XML that allow data to be easily processed by other systems."
        }
      ]
    },
    // 4. Procedure for Handling Data Portability Requests
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "4. Procedure for Handling Data Portability Requests"
        }
      ]
    },
    // 4.1 Receiving the Request
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "4.1. Receiving the Request" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Data subjects can exercise their right to data portability by submitting a request through [Specify channels, e.g., dedicated email address privacy@{{organization}}.com, customer account settings, specific web form]."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The request should clearly identify the data subject. It may also specify whether they wish to receive the data themselves or have it transmitted directly to another controller (if technically feasible)."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "All requests received must be logged promptly in the [Specify system, e.g., Data Subject Request Log]."
        }
      ]
    },
    // 4.2 Verification of Identity
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "4.2. Verification of Identity" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "{{organization}} must take reasonable steps to verify the identity of the individual making the request before processing it. The level of verification should be proportionate to the nature of the data."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Verification methods may include [Specify methods, e.g., asking for information previously provided, using secure account login procedures, requesting a form of ID if necessary and proportionate]."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "If unable to verify identity, inform the requester promptly, explaining why and requesting additional information if possible."
        }
      ]
    },
    // 4.3 Assessing the Request
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "4.3. Assessing the Request" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Once identity is verified, the [Designated Role/Team, e.g., Privacy Team, DPO] will assess the request:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "Confirm the personal data in question relates to the data subject."
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
                  text: "Verify the legal basis for processing: Is it based on consent (Art 6(1)(a) or 9(2)(a)) or contract (Art 6(1)(b))?"
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
                  text: "Confirm the processing is carried out by automated means."
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
                  text: "Determine the scope of data provided by the data subject that falls under the request."
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
                  text: "Assess if fulfilling the request adversely affects the rights and freedoms of others (e.g., contains personal data of third parties that cannot be easily redacted)."
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
                  text: "Consider if the request is manifestly unfounded or excessive (GDPR Art 12(5)). If so, {{organization}} may refuse to act or charge a reasonable fee."
                }
              ]
            }
          ]
        }
      ]
    },
    // 4.4 Data Compilation and Formatting
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        { type: "text", text: "4.4. Data Compilation and Formatting" }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "If the request is valid, the [Responsible Team, e.g., IT Department, Engineering] will compile the relevant personal data provided by the data subject."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The data must be provided in a structured, commonly used, and machine-readable format. [Specify formats offered, e.g., JSON, CSV]. The choice of format should aim for interoperability."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Ensure that only the data subject's personal data is included, or that data pertaining to others is appropriately removed or anonymized if possible."
        }
      ]
    },
    // 4.5 Providing the Data
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "4.5. Providing the Data" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Timing:"
        },
        {
          type: "text",
          text: " The data must be provided without undue delay, and at the latest within one month of receipt of the request."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Extension:"
        },
        {
          type: "text",
          text: " This period may be extended by two further months where necessary, taking into account the complexity and number of requests. The data subject must be informed of any such extension within one month of receipt of the request, together with the reasons for the delay (GDPR Art 12(3))."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Delivery:"
        },
        {
          type: "text",
          text: " The data should be transmitted securely to the data subject using [Specify method, e.g., secure download link via email, direct download from user account]."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Inform the data subject once the data is available."
        }
      ]
    },
    // 4.6 Transmission to Another Controller
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        {
          type: "text",
          text: "4.6. Transmission to Another Controller"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Where the data subject requests direct transmission to another controller, {{organization}} must comply if technically feasible."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "{{organization}} is not obligated to adopt or maintain processing systems that are technically compatible with those of other controllers. Assessment of technical feasibility will be done on a case-by-case basis."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "If direct transmission is not feasible, inform the data subject, providing the data directly to them instead."
        }
      ]
    },
    // 4.7 Refusing a Request
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "4.7. Refusing a Request" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "A request can be refused if:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "The conditions for data portability are not met (e.g., legal basis is not consent or contract, processing is not automated)."
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
                  text: "The request is manifestly unfounded or excessive."
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
                  text: "Fulfilling the request would adversely affect the rights and freedoms of others."
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
                  text: "Identity cannot be verified."
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
          text: "If the request is refused, the [Designated Role/Team] must inform the data subject without undue delay, and at the latest within one month, explaining the reasons for the refusal and informing them of their right to lodge a complaint with a supervisory authority and to seek a judicial remedy (GDPR Art 12(4))."
        }
      ]
    },
    // 5. Roles and Responsibilities
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "5. Roles and Responsibilities" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Data Subjects:"
        },
        {
          type: "text",
          text: " Responsible for providing accurate information when submitting a request and for cooperating with identity verification."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[Customer Support / Designated Intake Channel]:"
        },
        {
          type: "text",
          text: " Responsible for receiving requests, initial logging, and potentially initial identity verification."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[Privacy Team / DPO]:"
        },
        {
          type: "text",
          text: " Responsible for overseeing the process, assessing requests eligibility, coordinating verification, managing communication with data subjects, handling refusals, and advising on technical feasibility."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[IT Department / Engineering Teams]:"
        },
        {
          type: "text",
          text: " Responsible for identifying, extracting, compiling, and formatting the relevant data in a machine-readable format, ensuring secure transmission, and assessing technical feasibility for direct transmission."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[Legal Counsel]:"
        },
        {
          type: "text",
          text: " Provide advice on complex requests, refusals, legal interpretation, and potential impacts on the rights of others."
        }
      ]
    },
    // 6. Record Keeping
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "6. Record Keeping" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "A record of all data portability requests must be maintained in the [Specify system, e.g., Data Subject Request Log]. This log should include:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "Date request received."
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
                  text: "Data subject identification details (and verification method)."
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
                  text: "Assessment details (eligibility criteria met/not met)."
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
                  text: "Date(s) of actions taken (compilation, delivery/transmission, communication)."
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
                  text: "Format in which data was provided."
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
                  text: "Details of direct transmission (if applicable, including recipient controller)."
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
                  text: "Information provided to the data subject."
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
                  text: "Justification if request was refused or deadline extended."
                }
              ]
            }
          ]
        }
      ]
    },
    // 7. Policy Review
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "7. Policy Review" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This policy and procedure will be reviewed at least annually by the [DPO/Compliance Lead] and updated as necessary to reflect changes in legal requirements, business operations, technology, or best practices."
        }
      ]
    }
  ]
};

// src/templates/policies/data/right-to-erasure.policy.ts
var rightToErasurePolicy = {
  type: "doc",
  metadata: {
    id: "right_to_erasure",
    slug: "right-to-erasure-policy",
    name: "Right to Erasure ('Right to be Forgotten') Policy and Procedure",
    description: "Outlines the procedure for handling requests from data subjects to erase their personal data, in compliance with GDPR Article 17.",
    frequency: "yearly",
    department: "admin"
    // Or 'legal' / 'privacy' depending on company structure
  },
  content: [
    // Heading 1
    {
      type: "heading",
      attrs: { level: 1 },
      content: [
        {
          type: "text",
          text: "Right to Erasure ('Right to be Forgotten') Policy and Procedure"
        }
      ]
    },
    // Policy Information Table
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
              type: "tableHeader",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableHeader",
              content: [
                { type: "text", text: "Review Frequency" }
              ]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                { type: "text", text: "{{organization}}" }
              ]
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
                {
                  type: "text",
                  text: "[DPO/Compliance Lead/Relevant Authority]"
                }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Internal" }]
            }
          ]
        }
      ]
    },
    // 1. Introduction and Purpose
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "1. Introduction and Purpose" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Article 17 of the General Data Protection Regulation (GDPR) grants data subjects the 'right to be forgotten'. This means individuals have the right to obtain the erasure of personal data concerning them from the controller without undue delay, under specific circumstances."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The purpose of this policy and procedure is to ensure that {{organization}} handles requests for erasure in a compliant, secure, and efficient manner, respecting the rights of data subjects while recognizing applicable exceptions."
        }
      ]
    },
    // 2. Scope
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "2. Scope" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This procedure applies to all personal data processed by {{organization}} as a data controller and covers all employees, contractors, and relevant third parties involved in handling data subject requests or managing systems containing personal data."
        }
      ]
    },
    // 3. Definitions
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "3. Definitions" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Personal Data (GDPR Art 4(1)):"
        },
        {
          type: "text",
          text: ' Any information relating to an identified or identifiable natural person ("data subject").'
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Processing (GDPR Art 4(2)):"
        },
        {
          type: "text",
          text: " Any operation performed on personal data, such as collection, recording, organization, structuring, storage, adaptation or alteration, retrieval, consultation, use, disclosure by transmission, dissemination or otherwise making available, alignment or combination, restriction, erasure or destruction."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Controller (GDPR Art 4(7)):"
        },
        {
          type: "text",
          text: " The natural or legal person, public authority, agency or other body which, alone or jointly with others, determines the purposes and means of the processing of personal data."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Data Subject:"
        },
        {
          type: "text",
          text: " The identified or identifiable natural person to whom personal data relates."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Erasure:"
        },
        {
          type: "text",
          text: " The permanent deletion or irreversible anonymization of personal data."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Recipient (GDPR Art 4(9)):"
        },
        {
          type: "text",
          text: " A natural or legal person, public authority, agency or another body, to which the personal data are disclosed, whether a third party or not."
        }
      ]
    },
    // 4. Grounds for Erasure (Art 17(1))
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "4. Grounds for Erasure" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The right to erasure applies in the following circumstances (Article 17(1)):"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "a) The personal data are no longer necessary in relation to the purposes for which they were collected or otherwise processed."
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
                  text: "b) The data subject withdraws consent on which the processing is based according to point (a) of Article 6(1), or point (a) of Article 9(2), and where there is no other legal ground for the processing."
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
                  text: "c) The data subject objects to the processing pursuant to Article 21(1) (based on legitimate interests or public task) and there are no overriding legitimate grounds for the processing, or the data subject objects to the processing pursuant to Article 21(2) (direct marketing)."
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
                  text: "d) The personal data have been unlawfully processed."
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
                  text: "e) The personal data have to be erased for compliance with a legal obligation in Union or Member State law to which the controller is subject."
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
                  text: "f) The personal data have been collected in relation to the offer of information society services referred to in Article 8(1) (consent of a child)."
                }
              ]
            }
          ]
        }
      ]
    },
    // 5. Exceptions to Erasure (Art 17(3))
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "5. Exceptions to Erasure" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The right to erasure is not absolute. Erasure is not required to the extent that processing is necessary (Article 17(3)):"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "a) For exercising the right of freedom of expression and information."
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
                  text: "b) For compliance with a legal obligation which requires processing by Union or Member State law to which the controller is subject or for the performance of a task carried out in the public interest or in the exercise of official authority vested in the controller."
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
                  text: "c) For reasons of public interest in the area of public health in accordance with points (h) and (i) of Article 9(2) as well as Article 9(3)."
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
                  text: "d) For archiving purposes in the public interest, scientific or historical research purposes or statistical purposes in accordance with Article 89(1) in so far as the right referred to in paragraph 1 is likely to render impossible or seriously impair the achievement of the objectives of that processing."
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
                  text: "e) For the establishment, exercise or defence of legal claims."
                }
              ]
            }
          ]
        }
      ]
    },
    // 6. Procedure for Handling Erasure Requests
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "6. Procedure for Handling Erasure Requests"
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "6.1. Receiving the Request" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Data subjects can exercise their right to erasure by submitting a request through [Specify channels, e.g., dedicated email address privacy@{{organization}}.com, customer portal, specific web form]."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The request should clearly identify the data subject. While not mandatory, requests may include the specific data to be erased and the grounds for erasure."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "All requests received must be logged promptly in the [Specify system, e.g., Data Subject Request Log]."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "6.2. Verification of Identity" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "{{organization}} must take reasonable steps to verify the identity of the individual making the request before processing it."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Verification methods may include [Specify methods, e.g., asking for information previously provided, using secure account login procedures]. Only request minimum information needed."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "If unable to verify identity, inform the requester promptly."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "6.3. Assessing the Request" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Once identity is verified, the [Designated Role/Team, e.g., Privacy Team, DPO] will assess the request:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "Locate the personal data concerning the data subject across relevant systems."
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
                  text: "Determine if any of the grounds for erasure listed in Section 4 apply."
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
                  text: "Determine if any of the exceptions listed in Section 5 apply, which would justify retaining the data (or some of it)."
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
                  text: "Consider if the request is manifestly unfounded or excessive (GDPR Art 12(5))."
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
      content: [{ type: "text", text: "6.4. Performing Erasure" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Timing:"
        },
        {
          type: "text",
          text: " Erasure must be performed without undue delay, and at the latest within one month of receipt of the request (subject to identity verification)."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Extension:"
        },
        {
          type: "text",
          text: " This period may be extended by two further months where necessary (complexity/number of requests). The data subject must be informed of the extension and reasons within one month."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Action:"
        },
        {
          type: "text",
          text: " If the request is valid and no exceptions apply, the [Responsible Team, e.g., IT Department, Engineering] will:"
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
                  text: "Securely delete the relevant personal data from all live systems."
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
                  text: "Ensure the data is put beyond use or scheduled for deletion from backup systems according to backup cycles and policies (data in backups does not need immediate deletion if technically infeasible, but must not be restored to live systems)."
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
                  text: "Consider if anonymization is an appropriate alternative to deletion where applicable."
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
      content: [
        {
          type: "text",
          text: "6.5. Communication to Recipients (GDPR Art 19)"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Where {{organization}} has made the personal data public, it must take reasonable steps, including technical measures, to inform controllers processing the data that the data subject has requested erasure of any links to, or copy or replication of, that personal data."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "{{organization}} must also communicate any erasure of personal data to each recipient to whom the data have been disclosed, unless this proves impossible or involves disproportionate effort."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "{{organization}} shall inform the data subject about those recipients if the data subject requests it."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        { type: "text", text: "6.6. Informing the Data Subject" }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Once erasure is complete (or if the request is refused/partially fulfilled), the [Designated Role/Team] must inform the data subject without undue delay, and at the latest within one month (or the extended period)."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The communication should confirm that the data has been erased."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "If the request is refused (due to exceptions, unfounded/excessive nature, or inability to verify identity), the communication must explain the reasons and inform the data subject of their right to lodge a complaint with a supervisory authority and to seek a judicial remedy (GDPR Art 12(4))."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "If the request is partially fulfilled (some data erased, some retained due to exceptions), clearly explain what has been erased and the justification for retaining the remaining data."
        }
      ]
    },
    // Roles and Responsibilities Section
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "7. Roles and Responsibilities" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Data Subjects:"
        },
        {
          type: "text",
          text: " Responsible for submitting requests and cooperating with identity verification."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[Customer Support / Designated Intake Channel]:"
        },
        {
          type: "text",
          text: " Responsible for receiving requests, initial logging, routing."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[Privacy Team / DPO]:"
        },
        {
          type: "text",
          text: " Responsible for overseeing the process, assessing requests (grounds and exceptions), coordinating verification and erasure, managing communications."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[IT Department / Engineering Teams]:"
        },
        {
          type: "text",
          text: " Responsible for locating and technically performing the secure erasure from live and backup systems upon instruction."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[Legal Counsel]:"
        },
        {
          type: "text",
          text: " Provide advice on complex requests, interpretation of exceptions, and legal risks."
        }
      ]
    },
    // Record Keeping Section
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "8. Record Keeping" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "A record of all erasure requests must be maintained in the [Specify system, e.g., Data Subject Request Log]. This log should include details of the request, verification, assessment (grounds/exceptions), action taken (including date), communications with recipients, and communication with the data subject, including justifications for refusals or extensions."
        }
      ]
    },
    // Policy Review Section
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "9. Policy Review" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This policy and procedure will be reviewed at least annually by the [DPO/Compliance Lead] and updated as necessary."
        }
      ]
    }
  ]
};

// src/templates/policies/data/right-to-object.policy.ts
var rightToObjectPolicy = {
  type: "doc",
  metadata: {
    id: "right_to_object",
    slug: "right-to-object-policy",
    name: "Right to Object Policy and Procedure",
    description: "Outlines the procedure for handling requests from data subjects to object to the processing of their personal data, in compliance with GDPR Article 21.",
    frequency: "yearly",
    department: "admin"
    // Or 'legal' depending on company structure
  },
  content: [
    // Heading 1
    {
      type: "heading",
      attrs: { level: 1 },
      content: [
        {
          type: "text",
          text: "Right to Object Policy and Procedure"
        }
      ]
    },
    // Policy Information Table
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
              type: "tableHeader",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableHeader",
              content: [
                { type: "text", text: "Review Frequency" }
              ]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                { type: "text", text: "{{organization}}" }
              ]
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
                {
                  type: "text",
                  text: "[DPO/Compliance Lead/Relevant Authority]"
                }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Internal" }]
            }
          ]
        }
      ]
    },
    // 1. Introduction and Purpose
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "1. Introduction and Purpose" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Article 21 of the General Data Protection Regulation (GDPR) grants data subjects the right to object, on grounds relating to their particular situation, to the processing of personal data concerning them which is based on point (e) (public task) or (f) (legitimate interests) of Article 6(1). Data subjects also have an absolute right to object to processing for direct marketing purposes."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The purpose of this policy and procedure is to ensure that {{organization}} handles objections in a compliant, timely, and consistent manner, respecting the rights of data subjects."
        }
      ]
    },
    // 2. Scope
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "2. Scope" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This procedure applies to all personal data processed by {{organization}} as a data controller where the processing is based on legitimate interests (Art 6(1)(f)), public task (Art 6(1)(e)), or for direct marketing purposes. It covers all employees, contractors, and relevant third parties involved in handling data subject requests or data processing activities."
        }
      ]
    },
    // 3. Definitions
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "3. Definitions" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Personal Data (GDPR Art 4(1)):"
        },
        {
          type: "text",
          text: ' Any information relating to an identified or identifiable natural person ("data subject").'
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Processing (GDPR Art 4(2)):"
        },
        {
          type: "text",
          text: " Any operation performed on personal data, such as collection, recording, organization, structuring, storage, adaptation or alteration, retrieval, consultation, use, disclosure by transmission, dissemination or otherwise making available, alignment or combination, restriction, erasure or destruction."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Controller (GDPR Art 4(7)):"
        },
        {
          type: "text",
          text: " The natural or legal person, public authority, agency or other body which, alone or jointly with others, determines the purposes and means of the processing of personal data."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Data Subject:"
        },
        {
          type: "text",
          text: " The identified or identifiable natural person to whom personal data relates."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Objection:"
        },
        {
          type: "text",
          text: " A data subject's formal expression of opposition to the processing of their personal data under specific circumstances."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Legitimate Interests (GDPR Art 6(1)(f)):"
        },
        {
          type: "text",
          text: " Processing necessary for the purposes of the legitimate interests pursued by the controller or by a third party, except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Direct Marketing:"
        },
        {
          type: "text",
          text: " Communication of any advertising or marketing material directed to particular individuals."
        }
      ]
    },
    // 4. Procedure for Handling Objections
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        { type: "text", text: "4. Procedure for Handling Objections" }
      ]
    },
    // 4.1 Receiving the Objection
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "4.1. Receiving the Objection" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Data subjects can exercise their right to object by submitting a request through [Specify channels, e.g., dedicated email address privacy@{{organization}}.com, unsubscribe links in marketing emails, customer account settings, specific web form]."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Objections related to processing based on legitimate interests or public task (Art 6(1)(e) or (f)) must include grounds relating to the data subject's particular situation."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Objections related to direct marketing do not require justification."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "All objections received must be logged promptly in the [Specify system, e.g., Data Subject Request Log / Marketing Suppression List]."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Data subjects must be informed of their right to object explicitly and separately from other information, at the latest at the time of the first communication."
        }
      ]
    },
    // 4.2 Verification of Identity
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "4.2. Verification of Identity" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "{{organization}} must take reasonable steps to verify the identity of the individual making the objection before processing it, particularly for objections not related to direct marketing. The level of verification should be proportionate."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Verification methods may include [Specify methods, e.g., asking for information previously provided, using secure account login procedures]. ID may not be necessary unless reasonable doubts exist."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "If unable to verify identity, inform the requester promptly, explaining why and requesting additional information if possible."
        }
      ]
    },
    // 4.3 Assessing the Objection
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "4.3. Assessing the Objection" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Once identity is verified (if necessary), the [Designated Role/Team, e.g., Privacy Team, DPO, Marketing Team] will assess the objection:"
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 4 },
      content: [
        {
          type: "text",
          text: "4.3.1 Objection to Processing based on Legitimate Interests / Public Task (Art 6(1)(e) or (f))"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "{{organization}} must stop processing the personal data unless it can demonstrate compelling legitimate grounds for the processing which override the interests, rights, and freedoms of the data subject, or for the establishment, exercise or defense of legal claims."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The assessment involves balancing the organization's legitimate interests against the data subject's specific situation and grounds for objection."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Consultation with [Legal Counsel/DPO] may be required."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 4 },
      content: [
        {
          type: "text",
          text: "4.3.2 Objection to Processing for Direct Marketing Purposes"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This is an absolute right. If a data subject objects to processing for direct marketing purposes (including profiling related to direct marketing), the personal data shall no longer be processed for such purposes."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "No balancing test is required."
        }
      ]
    },
    // 4.4 Acting on the Objection
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "4.4. Acting on the Objection" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Timing:"
        },
        {
          type: "text",
          text: " Action must be taken without undue delay, and at the latest within one month of receipt of the request."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Extension:"
        },
        {
          type: "text",
          text: " This period may be extended by two further months where necessary, taking into account the complexity and number of requests. The data subject must be informed of any such extension within one month of receipt of the request, together with the reasons for the delay (GDPR Art 12(3))."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Action:"
        },
        {
          type: "text",
          text: " If the objection is upheld (mandatory for direct marketing, or if legitimate grounds do not override for other processing), the [Responsible Team, e.g., IT, Marketing, Engineering] will:"
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
                  text: "Cease the specific processing activities objected to."
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
                  text: "For direct marketing, ensure the data subject is added to a suppression list to prevent future marketing communications."
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
                  text: "Note: Stopping processing based on objection does not automatically mean the data must be erased unless requested under Article 17 (Right to Erasure) and conditions are met."
                }
              ]
            }
          ]
        }
      ]
    },
    // 4.5 Informing the Data Subject
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        { type: "text", text: "4.5. Informing the Data Subject" }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The [Designated Role/Team] must inform the data subject about the action taken in response to their objection (or the reasons for not taking action) without undue delay, and at the latest within one month (or the extended period)."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "If the objection is upheld, confirm that the processing has ceased."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "If the objection related to legitimate interests/public task is overridden, explain the compelling legitimate grounds."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "In all cases where the request is refused or overridden, inform the data subject of their right to lodge a complaint with a supervisory authority and to seek a judicial remedy (GDPR Art 12(4))."
        }
      ]
    },
    // 5. Roles and Responsibilities
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "5. Roles and Responsibilities" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Data Subjects:"
        },
        {
          type: "text",
          text: " Responsible for submitting objections through designated channels and providing grounds for objection where required."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[Customer Support / Designated Intake Channel]:"
        },
        {
          type: "text",
          text: " Responsible for receiving objections, initial logging, routing to the appropriate team, and potentially initial identity verification."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[Privacy Team / DPO]:"
        },
        {
          type: "text",
          text: " Responsible for overseeing the process, assessing objections related to legitimate interests/public task, coordinating verification, managing communication with data subjects, and advising on compliance."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[Marketing Team]:"
        },
        {
          type: "text",
          text: " Responsible for handling objections to direct marketing, ensuring prompt cessation of marketing communications, and managing suppression lists."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[IT Department / Engineering Teams]:"
        },
        {
          type: "text",
          text: " Responsible for technically implementing the cessation of processing or suppression upon instruction."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[Legal Counsel]:"
        },
        {
          type: "text",
          text: " Provide advice on complex objections, assessment of compelling legitimate grounds, and legal interpretation."
        }
      ]
    },
    // 6. Record Keeping
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "6. Record Keeping" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "A record of all objections must be maintained in the [Specify system, e.g., Data Subject Request Log / Suppression List]. This log should include:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "Date objection received."
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
                  text: "Data subject identification details (and verification method, if used)."
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
                  text: "Type of objection (direct marketing or other processing)."
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
                  text: "Grounds provided by the data subject (if applicable)."
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
                  text: "Date(s) of actions taken (assessment, cessation/suppression, communication)."
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
                  text: "Information provided to the data subject."
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
                  text: "Justification if objection was overridden or deadline extended."
                }
              ]
            }
          ]
        }
      ]
    },
    // 7. Policy Review
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "7. Policy Review" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This policy and procedure will be reviewed at least annually by the [DPO/Compliance Lead] and updated as necessary to reflect changes in legal requirements, business operations, processing activities, or best practices."
        }
      ]
    }
  ]
};

// src/templates/policies/data/right-to-rectification.policy.ts
var rightToRectificationPolicy = {
  type: "doc",
  metadata: {
    id: "right_to_rectification",
    slug: "right-to-rectification-policy",
    name: "Right to Rectification Policy and Procedure",
    description: "Outlines the procedure for handling requests from data subjects to rectify inaccurate or incomplete personal data, in compliance with GDPR Article 16.",
    frequency: "yearly",
    department: "admin"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [
        {
          type: "text",
          text: "Right to Rectification Policy and Procedure"
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
              type: "tableHeader",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableHeader",
              content: [
                { type: "text", text: "Review Frequency" }
              ]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                { type: "text", text: "{{organization}}" }
              ]
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
                {
                  type: "text",
                  text: "[DPO/Compliance Lead/Relevant Authority]"
                }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Internal" }]
            }
          ]
        }
      ]
    },
    // Introduction Section
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "1. Introduction and Purpose" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Under Article 16 of the General Data Protection Regulation (GDPR), data subjects have the right to obtain the rectification of inaccurate personal data concerning them from the controller without undue delay. They also have the right to have incomplete personal data completed."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The purpose of this policy and procedure is to ensure that {{organization}} handles requests for rectification in a timely, compliant, and consistent manner, respecting the rights of data subjects."
        }
      ]
    },
    // Scope Section
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "2. Scope" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This procedure applies to all personal data processed by {{organization}} as a data controller and covers all employees, contractors, and relevant third parties involved in handling data subject requests or managing systems containing personal data."
        }
      ]
    },
    // Definitions Section
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "3. Definitions" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Personal Data (GDPR Art 4(1)):"
        },
        {
          type: "text",
          text: ' Any information relating to an identified or identifiable natural person ("data subject").'
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Processing (GDPR Art 4(2)):"
        },
        {
          type: "text",
          text: " Any operation performed on personal data, such as collection, recording, organization, structuring, storage, adaptation or alteration, retrieval, consultation, use, disclosure by transmission, dissemination or otherwise making available, alignment or combination, restriction, erasure or destruction."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Controller (GDPR Art 4(7)):"
        },
        {
          type: "text",
          text: " The natural or legal person, public authority, agency or other body which, alone or jointly with others, determines the purposes and means of the processing of personal data."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Data Subject:"
        },
        {
          type: "text",
          text: " The identified or identifiable natural person to whom personal data relates."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Rectification:"
        },
        {
          type: "text",
          text: " The correction of inaccurate personal data or the completion of incomplete personal data."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Recipient (GDPR Art 4(9)):"
        },
        {
          type: "text",
          text: " A natural or legal person, public authority, agency or another body, to which the personal data are disclosed, whether a third party or not."
        }
      ]
    },
    // Procedure Section
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "4. Procedure for Handling Rectification Requests"
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "4.1. Receiving the Request" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Data subjects can exercise their right to rectification by submitting a request through [Specify channels, e.g., dedicated email address privacy@{{organization}}.com, customer portal, specific web form]."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The request should clearly identify the data subject and specify the personal data considered inaccurate or incomplete, along with the proposed correction or completion."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "All requests received must be logged promptly in the [Specify system, e.g., Data Subject Request Log]."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "4.2. Verification of Identity" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "{{organization}} must take reasonable steps to verify the identity of the individual making the request before processing it. The level of verification should be proportionate to the nature of the data."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Verification methods may include [Specify methods, e.g., asking for information previously provided, using secure account login procedures, requesting a form of ID if necessary and proportionate]."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "If unable to verify identity, inform the requester promptly, explaining why and requesting additional information if possible."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "4.3. Assessing the Request" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Once identity is verified, the [Designated Role/Team, e.g., Privacy Team, DPO] will assess the request:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "Locate the personal data in question within {{organization}}'s systems."
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
                  text: "Evaluate whether the data is indeed inaccurate or incomplete for the purposes for which it is processed."
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
                  text: "Consider if the request is manifestly unfounded or excessive (GDPR Art 12(5)), particularly if repetitive. If so, {{organization}} may refuse to act or charge a reasonable fee."
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
                  text: "If the accuracy is contested and cannot be immediately verified, processing of the contested data may need to be restricted (GDPR Art 18) pending verification."
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
      content: [{ type: "text", text: "4.4. Performing Rectification" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Timing:"
        },
        {
          type: "text",
          text: " Rectification must be performed without undue delay, and at the latest within one month of receipt of the request."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Extension:"
        },
        {
          type: "text",
          text: " This period may be extended by two further months where necessary, taking into account the complexity and number of the requests. The data subject must be informed of any such extension within one month of receipt of the request, together with the reasons for the delay (GDPR Art 12(3))."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Action:"
        },
        {
          type: "text",
          text: " If the request is deemed valid, the [Responsible Team, e.g., IT Department, Customer Support] will:"
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
                  text: "Correct the inaccurate personal data in all relevant systems where it is stored."
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
                  text: "Complete incomplete personal data, potentially including by means of a supplementary statement provided by the data subject."
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
      content: [
        {
          type: "text",
          text: "4.5. Communication to Recipients (GDPR Art 19)"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "{{organization}} must communicate any rectification of personal data to each recipient to whom the personal data have been disclosed, unless this proves impossible or involves disproportionate effort."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The [Designated Role/Team] will identify relevant recipients (e.g., third-party processors, integrated services) based on data processing records and notify them of the rectification."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "{{organization}} shall inform the data subject about those recipients if the data subject requests it."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        { type: "text", text: "4.6. Informing the Data Subject" }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Once the rectification is complete (or if the request is refused), the [Designated Role/Team] must inform the data subject without undue delay, and at the latest within one month (or the extended period)."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The communication should confirm that the data has been rectified/completed."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "If the request is refused (e.g., deemed manifestly unfounded/excessive, or accuracy cannot be disproven), the communication must explain the reasons for the refusal and inform the data subject of their right to lodge a complaint with a supervisory authority and to seek a judicial remedy (GDPR Art 12(4))."
        }
      ]
    },
    // Roles and Responsibilities Section
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "5. Roles and Responsibilities" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Data Subjects:"
        },
        {
          type: "text",
          text: " Responsible for providing accurate information when submitting a request and for cooperating with identity verification."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[Customer Support / Designated Intake Channel]:"
        },
        {
          type: "text",
          text: " Responsible for receiving requests, initial logging, and potentially initial identity verification."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[Privacy Team / DPO]:"
        },
        {
          type: "text",
          text: " Responsible for overseeing the process, assessing requests, coordinating verification and rectification, managing communication with recipients and data subjects, and handling refusals."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[IT Department / Engineering Teams]:"
        },
        {
          type: "text",
          text: " Responsible for locating and technically performing the rectification or completion of data in relevant systems upon instruction."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[Legal Counsel]:"
        },
        {
          type: "text",
          text: " Provide advice on complex requests, refusals, and legal interpretation."
        }
      ]
    },
    // Record Keeping Section
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "6. Record Keeping" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "A record of all rectification requests must be maintained in the [Specify system, e.g., Data Subject Request Log]. This log should include:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "Date request received."
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
                  text: "Data subject identification details (and verification method)."
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
                  text: "Details of the inaccurate/incomplete data and the requested correction."
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
                  text: "Date(s) of actions taken (assessment, rectification, communication)."
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
                  text: "Information provided to the data subject."
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
                  text: "Details of communications with recipients (if applicable)."
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
                  text: "Justification if request was refused or deadline extended."
                }
              ]
            }
          ]
        }
      ]
    },
    // Policy Review Section
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "7. Policy Review" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This policy and procedure will be reviewed at least annually by the [DPO/Compliance Lead] and updated as necessary to reflect changes in legal requirements, business operations, or best practices."
        }
      ]
    }
  ]
};

// src/templates/policies/data/right-to-restriction.policy.ts
var rightToRestrictionPolicy = {
  type: "doc",
  metadata: {
    id: "right_to_restriction",
    slug: "right-to-restriction-policy",
    name: "Right to Restriction of Processing Policy and Procedure",
    description: "Outlines the procedure for handling requests from data subjects to restrict the processing of their personal data, in compliance with GDPR Article 18.",
    frequency: "yearly",
    department: "admin"
    // Or 'legal' / 'privacy'
  },
  content: [
    // Heading 1
    {
      type: "heading",
      attrs: { level: 1 },
      content: [
        {
          type: "text",
          text: "Right to Restriction of Processing Policy and Procedure"
        }
      ]
    },
    // Policy Information Table
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
              type: "tableHeader",
              content: [{ type: "text", text: "Organization" }]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Last Review" }]
            },
            {
              type: "tableHeader",
              content: [
                { type: "text", text: "Review Frequency" }
              ]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Approved By" }]
            },
            {
              type: "tableHeader",
              content: [{ type: "text", text: "Classification" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                { type: "text", text: "{{organization}}" }
              ]
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
                {
                  type: "text",
                  text: "[DPO/Compliance Lead/Relevant Authority]"
                }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Internal" }]
            }
          ]
        }
      ]
    },
    // 1. Introduction and Purpose
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "1. Introduction and Purpose" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Article 18 of the General Data Protection Regulation (GDPR) grants data subjects the right to obtain from the controller restriction of processing of their personal data under certain circumstances. When processing is restricted, such personal data shall, with the exception of storage, only be processed with the data subject's consent or for specific legal reasons."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The purpose of this policy and procedure is to ensure that {{organization}} handles requests for restriction of processing in a compliant, secure, and efficient manner, respecting the rights of data subjects."
        }
      ]
    },
    // 2. Scope
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "2. Scope" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This procedure applies to all personal data processed by {{organization}} as a data controller and covers all employees, contractors, and relevant third parties involved in handling data subject requests or managing systems containing personal data."
        }
      ]
    },
    // 3. Definitions
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "3. Definitions" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Personal Data (GDPR Art 4(1)):"
        },
        {
          type: "text",
          text: ' Any information relating to an identified or identifiable natural person ("data subject").'
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Processing (GDPR Art 4(2)):"
        },
        {
          type: "text",
          text: " Any operation performed on personal data."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Controller (GDPR Art 4(7)):"
        },
        {
          type: "text",
          text: " Determines the purposes and means of processing."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Data Subject:"
        },
        {
          type: "text",
          text: " The individual to whom personal data relates."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Restriction of Processing (GDPR Art 4(3)):"
        },
        {
          type: "text",
          text: " The marking of stored personal data with the aim of limiting their processing in the future."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Recipient (GDPR Art 4(9)):"
        },
        {
          type: "text",
          text: " A natural or legal person, public authority, agency or another body, to which the personal data are disclosed."
        }
      ]
    },
    // 4. Grounds for Restriction (Art 18(1))
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "4. Grounds for Restriction" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The data subject has the right to obtain restriction of processing where one of the following applies (Article 18(1)):"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "a) The accuracy of the personal data is contested by the data subject, for a period enabling the controller to verify the accuracy of the personal data."
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
                  text: "b) The processing is unlawful and the data subject opposes the erasure of the personal data and requests the restriction of their use instead."
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
                  text: "c) The controller no longer needs the personal data for the purposes of the processing, but they are required by the data subject for the establishment, exercise or defence of legal claims."
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
                  text: "d) The data subject has objected to processing pursuant to Article 21(1) pending the verification whether the legitimate grounds of the controller override those of the data subject."
                }
              ]
            }
          ]
        }
      ]
    },
    // 5. Effects of Restriction (Art 18(2))
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "5. Effects of Restriction" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Where processing has been restricted, such personal data shall, with the exception of storage, only be processed:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "With the data subject's consent;"
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
                  text: "For the establishment, exercise or defence of legal claims;"
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
                  text: "For the protection of the rights of another natural or legal person; or"
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
                  text: "For reasons of important public interest of the Union or of a Member State."
                }
              ]
            }
          ]
        }
      ]
    },
    // 6. Procedure for Handling Restriction Requests
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "6. Procedure for Handling Restriction Requests"
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "6.1. Receiving the Request" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Data subjects can exercise their right to restriction by submitting a request through [Specify channels, e.g., dedicated email address privacy@{{organization}}.com, customer portal, specific web form]."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The request should clearly identify the data subject and the specific grounds for requesting restriction."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "All requests received must be logged promptly in the [Specify system, e.g., Data Subject Request Log]."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "6.2. Verification of Identity" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "{{organization}} must take reasonable steps to verify the identity of the individual making the request before processing it."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Verification methods may include [Specify methods]. Only request minimum information needed."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "If unable to verify identity, inform the requester promptly."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "6.3. Assessing the Request" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Once identity is verified, the [Designated Role/Team, e.g., Privacy Team, DPO] will assess the request:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "Locate the relevant personal data."
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
                  text: "Determine if any of the grounds for restriction listed in Section 4 apply."
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
                  text: "Consider if the request is manifestly unfounded or excessive (GDPR Art 12(5))."
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
      content: [
        {
          type: "text",
          text: "6.4. Implementing Restriction"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Timing:"
        },
        {
          type: "text",
          text: " Restriction must be implemented without undue delay, and at the latest within one month of receipt of the request (subject to identity verification)."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Extension:"
        },
        {
          type: "text",
          text: " This period may be extended by two further months where necessary (complexity/number of requests). The data subject must be informed of the extension and reasons within one month."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Action:"
        },
        {
          type: "text",
          text: " If the request is valid, the [Responsible Team, e.g., IT Department, Engineering] will implement technical and/or organizational measures to restrict processing. Methods may include:"
        }
      ]
    },
    {
      type: "bulletList",
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
                  text: "Temporarily moving the selected data to another processing system."
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
                  text: "Making the selected data unavailable to users."
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
                  text: "Temporarily removing published data from a website."
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
                  text: "Using flags or markers in the system to indicate restricted data."
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
          text: "The fact that processing is restricted should be clearly indicated in the system."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        {
          type: "text",
          text: "6.5. Communication to Recipients (GDPR Art 19)"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "{{organization}} must communicate any restriction of processing carried out to each recipient to whom the personal data have been disclosed, unless this proves impossible or involves disproportionate effort."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The [Designated Role/Team] will identify relevant recipients and notify them."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "{{organization}} shall inform the data subject about those recipients if the data subject requests it."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        { type: "text", text: "6.6. Informing the Data Subject" }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Once restriction is implemented (or if the request is refused), the [Designated Role/Team] must inform the data subject without undue delay, and at the latest within one month (or the extended period)."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The communication should confirm that processing has been restricted and explain the effects."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "If the request is refused (e.g., grounds not met, unfounded/excessive), explain the reasons and inform the data subject of their right to lodge a complaint with a supervisory authority and to seek a judicial remedy (GDPR Art 12(4))."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [
        {
          type: "text",
          text: "6.7. Lifting the Restriction (Art 18(3))"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Before the restriction of processing is lifted (e.g., accuracy verified, legal claim concluded), {{organization}} must inform the data subject."
        }
      ]
    },
    // Roles and Responsibilities Section
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "7. Roles and Responsibilities" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Data Subjects:"
        },
        {
          type: "text",
          text: " Responsible for submitting requests and cooperating with verification."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[Customer Support / Designated Intake Channel]:"
        },
        {
          type: "text",
          text: " Responsible for receiving requests, logging, routing."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[Privacy Team / DPO]:"
        },
        {
          type: "text",
          text: " Responsible for overseeing, assessing requests, coordinating implementation and lifting of restrictions, managing communications."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[IT Department / Engineering Teams]:"
        },
        {
          type: "text",
          text: " Responsible for technically implementing and lifting restrictions in relevant systems upon instruction."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "[Legal Counsel]:"
        },
        {
          type: "text",
          text: " Provide advice on complex requests, legal grounds, and interpretation."
        }
      ]
    },
    // Record Keeping Section
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "8. Record Keeping" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "A record of all restriction requests must be maintained in the [Specify system, e.g., Data Subject Request Log]. This log should include details of the request, verification, assessment (grounds met/not met), action taken (implementation/lifting dates), communications with recipients, and communication with the data subject, including justifications for refusals or extensions."
        }
      ]
    },
    // Policy Review Section
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "9. Policy Review" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This policy and procedure will be reviewed at least annually by the [DPO/Compliance Lead] and updated as necessary."
        }
      ]
    }
  ]
};

// src/templates/policies/data/risk-assessment.policy.ts
var riskAssessmentPolicy = {
  type: "doc",
  metadata: {
    id: "risk_assessment",
    slug: "risk-assessment",
    name: "Risk Assessment Policy",
    description: "This policy outlines the requirements for conducting risk assessments to identify, evaluate, and mitigate risks associated with the organization's information systems, operations, and assets.",
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
    slug: "risk-management-policy",
    name: "Risk Management Policy",
    description: "This policy defines the process for identifying, assessing, and mitigating risks to the organization's objectives and information assets.",
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
    slug: "software-development",
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

// src/templates/policies/data/supplier-data-processing-agreement.policy.ts
var supplierDataProcessingAgreementPolicy = {
  type: "doc",
  metadata: {
    id: "supplier_data_processing_agreement",
    slug: "supplier-data-processing-agreement",
    name: "Supplier Data Processing Agreement (DPA)",
    description: "Template agreement outlining the terms for processing personal data by a supplier (Processor) on behalf of the organization (Controller), ensuring compliance with GDPR Articles 28, 32, and 82.",
    frequency: "yearly",
    department: "admin"
  },
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [
        {
          type: "text",
          text: "Supplier Data Processing Agreement (DPA)"
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Agreement Information" }]
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
                  type: "text",
                  text: "Data Controller (Organization)"
                }
              ]
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "text",
                  text: "Data Processor (Supplier)"
                }
              ]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Effective Date" }]
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "Version" }]
            }
          ]
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                { type: "text", text: "{{organization}}" }
              ]
            },
            {
              type: "tableCell",
              content: [
                { type: "text", text: "{{supplier_name}}" }
              ]
              // Placeholder for Supplier Name
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "{{date}}" }]
              // Effective date of the DPA
            },
            {
              type: "tableCell",
              content: [{ type: "text", text: "1.0" }]
              // Version number
            }
          ]
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "1. Introduction and Scope" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This Data Processing Agreement ('DPA') is entered into between {{organization}} ('Controller') and {{supplier_name}} ('Processor') and supplements any existing service agreement ('Main Agreement') between the parties."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This DPA governs the Processing of Personal Data by the Processor on behalf of the Controller in the course of providing the services specified in the Main Agreement. It ensures compliance with the General Data Protection Regulation (EU) 2016/679 ('GDPR') and other applicable data protection laws."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "2. Definitions" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Terms such as 'Personal Data', 'Processing', 'Data Subject', 'Controller', 'Processor', 'Sub-processor', 'Personal Data Breach', and 'Supervisory Authority' shall have the meanings ascribed to them in GDPR Article 4."
        }
      ]
    },
    // Add specific definitions if needed
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "3. Details of Processing (As required by GDPR Art. 28(3))"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "a. Subject Matter:"
        },
        {
          type: "text",
          text: " The subject matter of the Processing is the provision of [Specify services provided by Supplier, e.g., cloud hosting, CRM services, analytics platform] as defined in the Main Agreement."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "b. Duration:"
        },
        {
          type: "text",
          text: " The Processing will continue for the duration of the Main Agreement, unless terminated earlier in accordance with this DPA."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "c. Nature and Purpose:"
        },
        {
          type: "text",
          text: " The nature and purpose of the Processing are [Describe the processing activities, e.g., storing customer data, processing user activity logs, sending transactional emails] necessary to provide the agreed services to the Controller."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "d. Types of Personal Data:"
        },
        {
          type: "text",
          text: " The types of Personal Data subject to Processing may include [List categories, e.g., contact details (name, email, phone), user credentials, IP addresses, usage data, potentially special categories if applicable - specify clearly]. See Annex 1 for details."
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "e. Categories of Data Subjects:"
        },
        {
          type: "text",
          text: " The categories of Data Subjects whose Personal Data may be Processed include [List categories, e.g., Controller's employees, Controller's customers/end-users, website visitors]. See Annex 1 for details."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "4. Processor Obligations (GDPR Art. 28)"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "The Processor warrants and agrees to:" }
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
                  marks: [{ type: "bold" }],
                  text: "a. Instructions:"
                },
                {
                  type: "text",
                  text: " Process Personal Data only on documented instructions from the Controller (including with regard to transfers), unless required to do so by Union or Member State law to which the Processor is subject. In such a case, the Processor shall inform the Controller of that legal requirement before Processing, unless that law prohibits such information on important grounds of public interest."
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
                  text: "b. Confidentiality:"
                },
                {
                  type: "text",
                  text: " Ensure that persons authorised to Process the Personal Data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality."
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
                  text: "c. Security (GDPR Art. 32):"
                },
                {
                  type: "text",
                  text: " Implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk, taking into account the state of the art, the costs of implementation and the nature, scope, context and purposes of Processing as well as the risk of varying likelihood and severity for the rights and freedoms of natural persons. These measures shall include, as appropriate: (i) pseudonymisation and encryption of Personal Data; (ii) the ability to ensure the ongoing confidentiality, integrity, availability and resilience of Processing systems and services; (iii) the ability to restore the availability and access to Personal Data in a timely manner in the event of a physical or technical incident; (iv) a process for regularly testing, assessing and evaluating the effectiveness of technical and organisational measures for ensuring the security of the Processing. Specific measures are detailed in Annex 2."
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
                  text: "d. Sub-processing:"
                },
                {
                  type: "text",
                  text: " Not engage another processor (Sub-processor) without prior specific or general written authorisation of the Controller. In the case of general written authorisation, the Processor shall inform the Controller of any intended changes concerning the addition or replacement of other processors, thereby giving the Controller the opportunity to object to such changes. Where the Processor engages a Sub-processor, it shall do so only by way of a written contract which imposes on the Sub-processor the same data protection obligations as set out in this DPA. The Processor remains fully liable to the Controller for the performance of the Sub-processor's obligations. A list of approved Sub-processors is in Annex 3."
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
                  text: "e. Data Subject Rights Assistance:"
                },
                {
                  type: "text",
                  text: " Taking into account the nature of the Processing, assist the Controller by appropriate technical and organisational measures, insofar as this is possible, for the fulfilment of the Controller's obligation to respond to requests for exercising the Data Subject's rights laid down in Chapter III of the GDPR."
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
                  text: "f. Controller Assistance:"
                },
                {
                  type: "text",
                  text: " Assist the Controller in ensuring compliance with the obligations pursuant to GDPR Articles 32 to 36 (Security, Breach Notification, DPIA, Prior Consultation), taking into account the nature of Processing and the information available to the Processor."
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
                  text: "g. Data Return/Deletion:"
                },
                {
                  type: "text",
                  text: " At the choice of the Controller, delete or return all the Personal Data to the Controller after the end of the provision of services relating to Processing, and delete existing copies unless Union or Member State law requires storage of the Personal Data."
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
                  text: "h. Audits:"
                },
                {
                  type: "text",
                  text: " Make available to the Controller all information necessary to demonstrate compliance with the obligations laid down in Article 28 and allow for and contribute to audits, including inspections, conducted by the Controller or another auditor mandated by the Controller. The Processor shall immediately inform the Controller if, in its opinion, an instruction infringes GDPR or other Union or Member State data protection provisions."
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
      content: [{ type: "text", text: "5. Controller Obligations" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The Controller warrants and agrees that:"
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
                  text: "a. Its instructions for the Processing of Personal Data shall comply with applicable data protection laws."
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
                  text: "b. It has established a lawful basis for the Processing activities covered by this DPA."
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
      content: [{ type: "text", text: "6. Data Transfers" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The Processor shall not transfer Personal Data to any country outside the European Economic Area (EEA) or the UK without the prior written consent of the Controller and unless appropriate safeguards are in place (e.g., adequacy decision, Standard Contractual Clauses (SCCs), Binding Corporate Rules (BCRs)) ensuring an adequate level of data protection as required by GDPR. [Specify agreed transfer mechanism if known, e.g., 'Transfers will be governed by the EU Standard Contractual Clauses, incorporated herein by reference.']"
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "7. Personal Data Breaches" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The Processor shall notify the Controller without undue delay, and where feasible within [Specify timeframe, e.g., 48 hours], after becoming aware of a Personal Data Breach affecting the Controller's data. The notification shall include details required by GDPR Article 33(3)."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "8. Liability and Indemnity (GDPR Art. 82)"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Liability between the parties arising from this DPA shall be governed by the liability provisions of the Main Agreement, subject to the mandatory provisions of GDPR Article 82 concerning liability towards Data Subjects. The Processor shall be liable for the damage caused by Processing only where it has not complied with obligations of GDPR specifically directed to processors or where it has acted outside or contrary to lawful instructions of the Controller. [Parties may wish to include specific indemnity clauses]."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "9. Term and Termination" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This DPA commences on the Effective Date and remains in effect until the termination or expiry of the Main Agreement. Termination of the Main Agreement automatically terminates this DPA. Upon termination, the Processor shall comply with the data return or deletion obligations outlined in Section 4(g)."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        { type: "text", text: "10. Governing Law and Jurisdiction" }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This DPA shall be governed by [Specify governing law, e.g., the laws of Ireland / the laws of the Member State where the Controller is established]. The parties agree to submit to the exclusive jurisdiction of the courts of [Specify jurisdiction]."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "11. Miscellaneous" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This DPA constitutes the entire agreement between the parties with respect to the subject matter hereof. Any modifications must be in writing and signed by both parties. If any provision is held invalid, the remainder remains in effect."
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Signatures" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Agreed by the parties through their authorized representatives:"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "For {{organization}} (Controller):" }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Signature: ____________________" }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Name: [Controller Signatory Name]" }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Title: [Controller Signatory Title]" }
      ]
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Date: {{date}}" }]
    },
    { type: "paragraph" },
    // Spacer
    {
      type: "paragraph",
      content: [
        { type: "text", text: "For {{supplier_name}} (Processor):" }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Signature: ____________________" }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Name: [Processor Signatory Name]" }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Title: [Processor Signatory Title]" }
      ]
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Date: {{date}}" }]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Annex 1: Details of Processing" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "[Provide specific details agreed with the Supplier regarding Subject Matter, Duration, Nature/Purpose, Data Types, Data Subject Categories, supplementing Section 3]"
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "Annex 2: Technical and Organisational Security Measures"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "[Describe the specific TOMs implemented by the Processor, referencing their security documentation or certifications if applicable. Ensure these align with GDPR Art. 32 requirements mentioned in Section 4(c). Examples: Access control, encryption standards, backup procedures, incident response, physical security, etc.]"
        }
      ]
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        { type: "text", text: "Annex 3: Approved Sub-processors" }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "[List all Sub-processors approved by the Controller for use by the Processor, including their location and the purpose of their sub-processing activities, as required by Section 4(d)]"
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
    slug: "system-change-policy",
    name: "System Change Policy",
    description: "This policy outlines the requirements for system changes.",
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
    id: "thirdparty",
    slug: "thirdparty",
    name: "Third-Party Management Policy",
    description: "This policy defines the rules for relationships with the organization's Information Technology (IT) third-parties and partners.",
    frequency: "yearly",
    department: "gov"
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

// src/templates/policies/data/workstation.policy.ts
var workstationPolicy = {
  type: "doc",
  metadata: {
    id: "workstation",
    slug: "workstation",
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
  records_of_processing_activities_policy: recordsOfProcessingActivitiesPolicy
};

// src/templates/evidence/data/access_control_records.ts
var accessControlRecords = {
  id: "access_control_records",
  name: "Access Control Records",
  description: "Access control configurations, firewall logs, and system access review reports. Provide Access Management Procedures document that outlines granting, monitoring, and revoking system access including access logging and periodic reviews.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/evidence/data/access_logs.ts
var accessLogs = {
  id: "access_logs",
  name: "Access Logs",
  description: "System and application access logs showing user authentication and authorization activities.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/access_removal_records.ts
var accessRemovalRecords = {
  id: "access_removal_records",
  name: "Access Removal Records",
  description: "Documentation of access removal for terminated employees or role changes.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/access_review_records.ts
var accessReviewRecords = {
  id: "access_review_records",
  name: "Access Review Records",
  description: "Documentation of periodic access reviews and approvals.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/evidence/data/account_management_records.ts
var accountManagementRecords = {
  id: "account_management_records",
  name: "Account Management Records",
  description: "Records of account creation, modification, and deletion activities.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/authentication_records.ts
var authenticationRecords = {
  id: "authentication_records",
  name: "Authentication Records",
  description: "Authentication system logs and configuration documentation.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/board_meeting_documentation.ts
var boardMeetingDocumentation = {
  id: "board_meeting_documentation",
  name: "Board Meeting Documentation",
  description: "Minutes and documentation from board meetings discussing security and compliance matters.",
  frequency: "quarterly",
  department: "gov"
};

// src/templates/evidence/data/business_continuity_and_disaster_recovery_testing_records.ts
var businessContinuityAndDisasterRecoveryTestingRecords = {
  id: "business_continuity_and_disaster_recovery_testing_records",
  name: "Business Continuity and Disaster Recovery Testing Records",
  description: "Documentation of BCDR testing activities and results.",
  frequency: "yearly",
  department: "it"
};

// src/templates/evidence/data/business_continuity_plans.ts
var businessContinuityPlans = {
  id: "business_continuity_plans",
  name: "Business Continuity Plans",
  description: "Documentation of business continuity and disaster recovery plans.",
  frequency: "yearly",
  department: "it"
};

// src/templates/evidence/data/capacity_reports.ts
var capacityReports = {
  id: "capacity_reports",
  name: "Capacity Reports",
  description: "System capacity planning and monitoring reports.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/change_management_records.ts
var changeManagementRecords = {
  id: "change_management_records",
  name: "Change Management Records",
  description: "Documentation of system changes and approvals.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/change_request_logs.ts
var changeRequestLogs = {
  id: "change_request_logs",
  name: "Change Request Logs",
  description: "Logs of system change requests and their status.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/change_risk_documentation.ts
var changeRiskDocumentation = {
  id: "change_risk_documentation",
  name: "Change Risk Documentation",
  description: "Risk assessment documentation for system changes.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/communication_records.ts
var communicationRecords = {
  id: "communication_records",
  name: "Communication Records",
  description: "Documentation of internal and external security communications.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/consent_records.ts
var consentRecords = {
  id: "consent_records",
  name: "Consent Records",
  description: "Records of user consent for data processing activities.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/control_implementation_records.ts
var controlImplementationRecords = {
  id: "control_implementation_records",
  name: "Control Implementation Records",
  description: "Documentation of control implementation and effectiveness.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/evidence/data/control_testing_documentation.ts
var controlTestingDocumentation = {
  id: "control_testing_documentation",
  name: "Control Testing Documentation",
  description: "Documentation of control testing activities and results.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/evidence/data/data-breach-register.evidence.ts
var dataBreachRegisterEvidence = {
  id: "data_breach_register_evidence",
  name: "Data Breach Register Evidence",
  description: "Provide the reviewed Data Breach Register demonstrating maintenance, annual review, and accurate recording of breach details as per GDPR Art. 33(5).",
  frequency: "yearly",
  department: "it"
};

// src/templates/evidence/data/data-breach-response.evidence.ts
var dataBreachResponseEvidence = {
  id: "data_breach_response_evidence",
  name: "Data Breach Response Procedure Evidence",
  description: "Provide evidence demonstrating adherence to the Data Breach Response Procedure, including records of incident handling, risk assessments, and notifications made (or justifications for not notifying).",
  frequency: "yearly",
  department: "it"
};

// src/templates/evidence/data/data-protection.evidence.ts
var dataProtectionEvidence = {
  id: "data_protection_evidence",
  name: "Data Protection Policy Implementation Evidence",
  description: "Provide documentation or audit results verifying the implementation and maintenance of technical/organizational measures as per the Data Protection Policy (e.g., access control logs, DPIA records, security assessment results).",
  frequency: "yearly",
  department: "admin"
};

// src/templates/evidence/data/data-retention-notice.evidence.ts
var dataRetentionNoticeEvidence = {
  id: "data_retention_notice_evidence",
  name: "Data Retention Notice Evidence",
  description: "Provide the current Data Retention Notice and evidence of its availability (e.g., link on website, internal communication record) confirming accuracy and inclusion of GDPR required information.",
  frequency: "yearly",
  department: "it"
};

// src/templates/evidence/data/data-retention-schedule.evidence.ts
var dataRetentionScheduleEvidence = {
  id: "data_retention_schedule_evidence",
  name: "Data Retention Schedule Evidence",
  description: "Provide the reviewed Data Retention Schedule and evidence of adherence (e.g., logs of data disposal actions, audit report confirming schedule accuracy).",
  frequency: "yearly",
  department: "it"
};

// src/templates/evidence/data/data-subject-consent-form.evidence.ts
var dataSubjectConsentFormEvidence = {
  id: "data_subject_consent_form_evidence",
  name: "Consent Management Evidence",
  description: "Provide examples of completed Consent Forms used and evidence of the system/process for maintaining records of consent (e.g., database excerpt, log file).",
  frequency: "yearly",
  department: "admin"
};

// src/templates/evidence/data/data_classification_records.ts
var dataClassificationRecords = {
  id: "data_classification_records",
  name: "Data Classification Records",
  description: "Documentation of data classification and handling procedures.",
  frequency: "yearly",
  department: "it"
};

// src/templates/evidence/data/data_processing_logs.ts
var dataProcessingLogs = {
  id: "data_processing_logs",
  name: "Data Processing Logs",
  description: "Logs of data processing activities and transactions.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/data_quality_documentation.ts
var dataQualityDocumentation = {
  id: "data_quality_documentation",
  name: "Data Quality Documentation",
  description: "Documentation of data quality controls and monitoring.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/evidence/data/data_validation_records.ts
var dataValidationRecords = {
  id: "data_validation_records",
  name: "Data Validation Records",
  description: "Records of data validation and verification activities.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/deficiency_management_records.ts
var deficiencyManagementRecords = {
  id: "deficiency_management_records",
  name: "Deficiency Management Records",
  description: "Documentation of control deficiencies and remediation activities.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/evidence/data/disposal_records.ts
var disposalRecords = {
  id: "disposal_records",
  name: "Disposal Records",
  description: "Documentation of secure data and asset disposal activities.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/dpia-register.evidence.ts
var dpiaRegisterEvidence = {
  id: "dpia_register_evidence",
  name: "DPIA Register Evidence",
  description: "Provide the current DPIA Register demonstrating documentation of required DPIAs, risk assessments, and mitigation measures for high-risk processing.",
  frequency: "yearly",
  department: "admin"
};

// src/templates/evidence/data/employee-privacy-notice.evidence.ts
var employeePrivacyNoticeEvidence = {
  id: "employee_privacy_notice_evidence",
  name: "Employee Privacy Notice Provision Evidence",
  description: "Provide evidence that the current Employee Privacy Notice has been distributed to staff (e.g., internal communication record, onboarding checklist) and confirm its accuracy.",
  frequency: "yearly",
  department: "hr"
};

// src/templates/evidence/data/ethics_compliance_documentation.ts
var ethicsComplianceDocumentation = {
  id: "ethics_compliance_documentation",
  name: "Ethics Compliance Documentation",
  description: "Documentation of ethics training and compliance activities.",
  frequency: "yearly",
  department: "it"
};

// src/templates/evidence/data/exception_logs.ts
var exceptionLogs = {
  id: "exception_logs",
  name: "Exception Logs",
  description: "Logs of security control exceptions and approvals.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/external_communication_records.ts
var externalCommunicationRecords = {
  id: "external_communication_records",
  name: "External Communication Records",
  description: "Documentation of external security communications and notifications.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/fraud_risk_documentation.ts
var fraudRiskDocumentation = {
  id: "fraud_risk_documentation",
  name: "Fraud Risk Documentation",
  description: "Documentation of fraud risk assessment and mitigation activities.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/evidence/data/hr_documentation.ts
var hrDocumentation = {
  id: "hr_documentation",
  name: "HR Documentation",
  description: "Documentation of HR security policies and procedures.",
  frequency: "yearly",
  department: "hr"
};

// src/templates/evidence/data/incident_analysis_records.ts
var incidentAnalysisRecords = {
  id: "incident_analysis_records",
  name: "Incident Analysis Records",
  description: "Documentation of security incident analysis and findings.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/incident_communication_records.ts
var incidentCommunicationRecords = {
  id: "incident_communication_records",
  name: "Incident Communication Records",
  description: "Documentation of incident-related communications.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/incident_recovery_records.ts
var incidentRecoveryRecords = {
  id: "incident_recovery_records",
  name: "Incident Recovery Records",
  description: "Documentation of incident recovery activities and lessons learned.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/incident_response_records.ts
var incidentResponseRecords = {
  id: "incident_response_records",
  name: "Incident Response Records",
  description: "Documentation of security incident response activities.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/infrastructure_monitoring_records.ts
var infrastructureMonitoringRecords = {
  id: "infrastructure_monitoring_records",
  name: "Infrastructure Monitoring Records",
  description: "Documentation of infrastructure monitoring and alerting activities.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/malware_prevention_records.ts
var malwarePreventionRecords = {
  id: "malware_prevention_records",
  name: "Malware Prevention Records",
  description: "Documentation of malware prevention and detection activities.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/management_structure_documentation.ts
var managementStructureDocumentation = {
  id: "management_structure_documentation",
  name: "Management Structure Documentation",
  description: "Documentation of organizational structure and reporting relationships.",
  frequency: "yearly",
  department: "hr"
};

// src/templates/evidence/data/personnel_compliance_documentation.ts
var personnelComplianceDocumentation = {
  id: "personnel_compliance_documentation",
  name: "Personnel Compliance Documentation",
  description: "Documentation of personnel compliance with security policies.",
  frequency: "quarterly",
  department: "hr"
};

// src/templates/evidence/data/physical_access_records.ts
var physicalAccessRecords = {
  id: "physical_access_records",
  name: "Physical Access Records",
  description: "Documentation of physical access control activities.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/policy_implementation_records.ts
var policyImplementationRecords = {
  id: "policy_implementation_records",
  name: "Policy Implementation Records",
  description: "Documentation of security policy implementation activities.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/evidence/data/privacy-notice.evidence.ts
var privacyNoticeEvidence = {
  id: "privacy_notice_evidence",
  name: "Public Privacy Notice Evidence",
  description: "Provide the current public Privacy Notice and evidence of its accessibility (e.g., website link) confirming it's up-to-date and meets GDPR requirements.",
  frequency: "yearly",
  department: "admin"
};

// src/templates/evidence/data/records-of-processing-activities.evidence.ts
var recordsOfProcessingActivitiesEvidence = {
  id: "ropa_evidence",
  // Shortened ID for consistency
  name: "Records of Processing Activities (RoPA) Evidence",
  description: "Provide the current version of the Records of Processing Activities (RoPA) document maintained according to GDPR Article 30. Include evidence of regular review and updates (e.g., version history, review meeting minutes, change logs).",
  frequency: "yearly",
  // Evidence of review is yearly, the RoPA itself is ongoing
  department: "admin"
  // Or 'legal' / 'privacy' / DPO
};

// src/templates/evidence/data/recovery_records.ts
var recoveryRecords = {
  id: "recovery_records",
  name: "Recovery Records",
  description: "Documentation of system recovery activities and testing.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/evidence/data/retention_schedules.ts
var retentionSchedules = {
  id: "retention_schedules",
  name: "Retention Schedules",
  description: "Documentation of data retention policies and schedules.",
  frequency: "yearly",
  department: "it"
};

// src/templates/evidence/data/right-of-access.evidence.ts
var rightOfAccessEvidence = {
  id: "right_of_access_evidence",
  name: "Data Subject Access Request (DSAR) Procedure Evidence",
  description: "Provide the reviewed DSAR Register and examples of handled requests, demonstrating adherence to the DSAR procedure, including timelines, verification steps, data compilation, and communication with data subjects as outlined in GDPR Article 15.",
  frequency: "yearly",
  department: "it"
};

// src/templates/evidence/data/right-to-data-portability.evidence.ts
var rightToDataPortabilityEvidence = {
  id: "right_to_data_portability_evidence",
  name: "Right to Data Portability Procedure Evidence",
  description: "Provide records from the Data Subject Request Log demonstrating how data portability requests (GDPR Art 20) were handled, including verification, assessment of eligibility, data compilation in specified formats, secure delivery/transmission, and communication with data subjects.",
  frequency: "yearly",
  department: "admin"
};

// src/templates/evidence/data/right-to-erasure.evidence.ts
var rightToErasureEvidence = {
  id: "right_to_erasure_evidence",
  name: "Right to Erasure Procedure Evidence",
  description: "Provide records from the Data Subject Request Log demonstrating how erasure requests (GDPR Art. 17) were handled, including verification, assessment of grounds/exceptions, confirmation of data deletion/anonymization from relevant systems (including backups where applicable), notification to recipients (if applicable), and communication with data subjects (confirming erasure or explaining refusal/exceptions).",
  frequency: "yearly",
  // Or 'ongoing' / 'per_request'
  department: "admin"
  // Or 'legal' / 'privacy'
};

// src/templates/evidence/data/right-to-object.evidence.ts
var rightToObjectEvidence = {
  id: "right_to_object_evidence",
  name: "Right to Object Procedure Evidence",
  description: "Provide records from the Data Subject Request Log or Suppression Lists demonstrating how objections (GDPR Art 21) were handled, including verification (if applicable), assessment (balancing tests for legitimate interests, cessation for direct marketing), actions taken, and communication with data subjects.",
  frequency: "yearly",
  department: "admin"
};

// src/templates/evidence/data/right-to-rectification.evidence.ts
var rightToRectificationEvidence = {
  id: "right_to_rectification_evidence",
  name: "Right to Rectification Procedure Evidence",
  description: "Provide records from the Data Subject Request Log demonstrating how rectification requests (GDPR Art 16) were handled, including verification, assessment, data correction/completion in relevant systems, notification to recipients (if applicable), and communication with data subjects.",
  frequency: "yearly",
  department: "admin"
};

// src/templates/evidence/data/right-to-restriction.evidence.ts
var rightToRestrictionEvidence = {
  id: "right_to_restriction_evidence",
  name: "Right to Restriction Procedure Evidence",
  description: "Provide records from the Data Subject Request Log demonstrating how restriction requests (GDPR Art. 18) were handled, including verification, assessment of grounds, confirmation of restriction implementation (e.g., system logs, screenshots showing data marking/unavailability), notification to recipients (if applicable), and communication with data subjects (confirming restriction or explaining refusal, and notification before lifting restriction).",
  frequency: "yearly",
  // Or 'ongoing' / 'per_request'
  department: "admin"
  // Or 'legal' / 'privacy'
};

// src/templates/evidence/data/risk_assessment_documentation.ts
var riskAssessmentDocumentation = {
  id: "risk_assessment_documentation",
  name: "Risk Assessment Documentation",
  description: "Documentation of risk assessment activities and findings.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/evidence/data/risk_identification_records.ts
var riskIdentificationRecords = {
  id: "risk_identification_records",
  name: "Risk Identification Records",
  description: "Documentation of risk identification activities.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/evidence/data/supplier-data-processing-agreement.evidence.ts
var supplierDpaEvidence = {
  id: "supplier_dpa_evidence",
  name: "Supplier DPA Evidence",
  description: "Provide evidence of executed DPAs with key third-party processors and documentation of compliance monitoring activities (e.g., audit reports, completed questionnaires).",
  frequency: "yearly",
  department: "admin"
};

// src/templates/evidence/data/technology_control_records.ts
var technologyControlRecords = {
  id: "technology_control_records",
  name: "Technology Control Records",
  description: "Documentation of technology control implementation and monitoring.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/uptime_reports.ts
var uptimeReports = {
  id: "uptime_reports",
  name: "Uptime Reports",
  description: "System uptime and availability reports.",
  frequency: "monthly",
  department: "it"
};

// src/templates/evidence/data/vendor_risk_assessment_records.ts
var vendorRiskAssessmentRecords = {
  id: "vendor_risk_assessment_records",
  name: "Vendor Risk Assessment Records",
  description: "Documentation of vendor risk assessment activities.",
  frequency: "quarterly",
  department: "it"
};

// src/templates/evidence/index.ts
var evidence = {
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
  records_of_processing_activities_evidence: recordsOfProcessingActivitiesEvidence
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
    },
    {
      type: "evidence",
      evidenceId: "authentication_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC6"
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
    },
    {
      type: "evidence",
      evidenceId: "access_removal_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC6"
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
    },
    {
      type: "evidence",
      evidenceId: "physical_access_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC6"
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
    },
    {
      type: "evidence",
      evidenceId: "access_logs"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "C1"
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
    },
    {
      type: "evidence",
      evidenceId: "access_review_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC6"
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
    },
    {
      type: "evidence",
      evidenceId: "access_control_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC6"
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
    },
    {
      type: "evidence",
      evidenceId: "data_validation_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "PI1"
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
    },
    {
      type: "evidence",
      evidenceId: "board_meeting_documentation"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "A1"
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
    },
    {
      type: "evidence",
      evidenceId: "change_risk_documentation"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC3"
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
    },
    {
      type: "evidence",
      evidenceId: "consent_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "P1"
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
    },
    {
      type: "evidence",
      evidenceId: "ethics_compliance_documentation"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC1"
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
    },
    {
      type: "evidence",
      evidenceId: "disposal_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "C1"
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
    },
    {
      type: "evidence",
      evidenceId: "data_classification_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "C1"
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
    },
    {
      type: "evidence",
      evidenceId: "control_testing_documentation"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC4"
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
    },
    {
      type: "evidence",
      evidenceId: "control_implementation_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC5"
    }
  ]
};

// src/templates/controls/data/data-breach-register.control.ts
var dataBreachRegisterControl = {
  id: "data_breach_register_control",
  name: "Data Breach Register Review",
  description: "Verify that the Data Breach Register is maintained, reviewed annually, and accurately records all required details of personal data breaches according to GDPR Article 33(5).",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "data_breach_register"
    },
    {
      type: "evidence",
      evidenceId: "data_breach_register_evidence"
    }
  ],
  mappedRequirements: [{ frameworkId: "gdpr", requirementId: "A33" }]
};

// src/templates/controls/data/data-breach-response.control.ts
var dataBreachResponseControl = {
  id: "data_breach_response_control",
  name: "Data Breach Response Procedure Review",
  description: "Verify that the Data Breach Response and Notification Procedure is followed, including timely identification, assessment, containment, risk evaluation, and required notifications (SA & data subjects) as per GDPR Articles 33 & 34.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "data_breach_response"
    },
    {
      type: "evidence",
      evidenceId: "data_breach_response_evidence"
    }
  ],
  mappedRequirements: [
    { frameworkId: "gdpr", requirementId: "A4" },
    { frameworkId: "gdpr", requirementId: "A33" },
    { frameworkId: "gdpr", requirementId: "A34" }
  ]
};

// src/templates/controls/data/data-protection.control.ts
var dataProtectionPolicyControl = {
  id: "data_protection_policy_control",
  name: "Data Protection Policy Implementation Review",
  description: "Verify that appropriate technical and organizational measures outlined in the Data Protection Policy are implemented and maintained to ensure GDPR compliance (Art. 24), including data minimization, access control, security, and data protection by design/default principles.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "data_protection"
    },
    {
      type: "evidence",
      evidenceId: "data_protection_evidence"
    }
  ],
  mappedRequirements: [
    { frameworkId: "gdpr", requirementId: "A5" },
    { frameworkId: "gdpr", requirementId: "A25" },
    { frameworkId: "gdpr", requirementId: "A32" }
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
    },
    {
      type: "evidence",
      evidenceId: "retention_schedules"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "P1"
    }
  ]
};

// src/templates/controls/data/data-retention-notice.control.ts
var dataRetentionNoticeControl = {
  id: "data_retention_notice_control",
  name: "Data Retention Notice Review and Availability",
  description: "Verify that the Data Retention Notice accurately reflects data retention practices, is readily available to data subjects, and includes required information as per GDPR Articles 5, 13, 17, and 30.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "data_retention_notice"
    },
    {
      type: "evidence",
      evidenceId: "data_retention_notice_evidence"
    }
  ],
  mappedRequirements: [
    { frameworkId: "gdpr", requirementId: "A5" },
    { frameworkId: "gdpr", requirementId: "A13" },
    { frameworkId: "gdpr", requirementId: "A17" },
    { frameworkId: "gdpr", requirementId: "A30" }
  ]
};

// src/templates/controls/data/data-subject-consent-form.control.ts
var dataSubjectConsentFormControl = {
  id: "data_subject_consent_form_control",
  name: "Consent Form Usage and Record Keeping",
  description: "Verify that the Data Subject Consent Form is used correctly to obtain explicit, informed consent (GDPR Art. 6, 7, 9) for specific processing activities and that records of consent are maintained.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "data_subject_consent_form"
    },
    {
      type: "evidence",
      evidenceId: "data_subject_consent_form_evidence"
    }
  ],
  mappedRequirements: [
    { frameworkId: "gdpr", requirementId: "A6" },
    { frameworkId: "gdpr", requirementId: "A7" }
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
    },
    {
      type: "evidence",
      evidenceId: "deficiency_management_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC4"
    }
  ]
};

// src/templates/controls/data/dpia-register.control.ts
var dpiaRegisterControl = {
  id: "dpia_register_control",
  name: "DPIA Register Maintenance and Review",
  description: "Verify that the DPIA Register documents all required Data Protection Impact Assessments for high-risk processing activities (GDPR Art. 35), including risk assessment and mitigation measures.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "dpia_register"
    },
    {
      type: "evidence",
      evidenceId: "dpia_register_evidence"
    }
  ],
  mappedRequirements: [{ frameworkId: "gdpr", requirementId: "A35" }]
};

// src/templates/controls/data/employee-privacy-notice.control.ts
var employeePrivacyNoticeControl = {
  id: "employee_privacy_notice_control",
  name: "Employee Privacy Notice Provision and Accuracy",
  description: "Verify that the Employee Privacy Notice is provided to all staff and accurately reflects the collection, use, and protection of employee personal data as required by GDPR Articles 12, 13, and 14.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "employee_privacy_notice"
    },
    {
      type: "evidence",
      evidenceId: "employee_privacy_notice_evidence"
    }
  ],
  mappedRequirements: [
    { frameworkId: "gdpr", requirementId: "A12" },
    { frameworkId: "gdpr", requirementId: "A13" },
    { frameworkId: "gdpr", requirementId: "A14" }
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
    },
    {
      type: "evidence",
      evidenceId: "exception_logs"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "PI1"
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
    },
    {
      type: "evidence",
      evidenceId: "external_communication_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC2"
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
    },
    {
      type: "evidence",
      evidenceId: "fraud_risk_documentation"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC3"
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
    },
    {
      type: "evidence",
      evidenceId: "change_management_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC6"
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
    },
    {
      type: "evidence",
      evidenceId: "data_quality_documentation"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC2"
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
    },
    {
      type: "evidence",
      evidenceId: "infrastructure_monitoring_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC7"
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
    },
    {
      type: "evidence",
      evidenceId: "data_processing_logs"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "PI1"
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
    },
    {
      type: "evidence",
      evidenceId: "communication_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC2"
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
    },
    {
      type: "evidence",
      evidenceId: "malware_prevention_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC6"
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
    },
    {
      type: "evidence",
      evidenceId: "management_structure_documentation"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC1"
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
    },
    {
      type: "evidence",
      evidenceId: "hr_documentation"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC1"
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
    },
    {
      type: "evidence",
      evidenceId: "personnel_compliance_documentation"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC1"
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
    },
    {
      type: "evidence",
      evidenceId: "policy_implementation_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC5"
    }
  ]
};

// src/templates/controls/data/privacy-notice.ts
var privacyNotice = {
  id: "privacy_notice",
  name: "Privacy Notice",
  description: "The entity provides notice about the collection, use, and disclosure of personal information.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "privacy_policy"
    },
    {
      type: "evidence",
      evidenceId: "privacy_notice_evidence"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "P1"
    },
    {
      frameworkId: "gdpr",
      requirementId: "A12"
    }
  ]
};

// src/templates/controls/data/privacy-notice.control.ts
var privacyNoticeControl = {
  id: "privacy_notice_control",
  name: "Privacy Notice Review and Availability",
  description: "Verify that the public Privacy Notice is up-to-date, accurately describes data processing activities, informs users of their rights (GDPR Art. 12, 13, 14), and is easily accessible.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "privacy_notice"
    },
    {
      type: "evidence",
      evidenceId: "privacy_notice_evidence"
    }
  ],
  mappedRequirements: [
    { frameworkId: "gdpr", requirementId: "A12" },
    { frameworkId: "gdpr", requirementId: "A13" },
    { frameworkId: "gdpr", requirementId: "A14" }
  ]
};

// src/templates/controls/data/records-of-processing-activities.control.ts
var recordsOfProcessingActivitiesControl = {
  id: "ropa_control",
  // Shortened ID for consistency
  name: "Records of Processing Activities (RoPA) Maintenance Review",
  description: "Verify that the Records of Processing Activities (RoPA) are maintained, accurate, complete, and regularly reviewed/updated as required by GDPR Article 30. This includes confirming the presence of all mandatory information for both controller and processor activities (where applicable).",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "records_of_processing_activities_policy"
    },
    {
      type: "evidence",
      evidenceId: "records_of_processing_activities_evidence"
      // Link to the evidence (the RoPA document and review logs)
    }
  ],
  mappedRequirements: [
    { frameworkId: "gdpr", requirementId: "A30" }
    // Maps to GDPR Article 30
  ]
};

// src/templates/controls/data/right-of-access.control.ts
var rightOfAccessControl = {
  id: "right_of_access_control",
  name: "Right of Access (DSAR) Procedure Review",
  description: "Verify that the procedure for handling Data Subject Access Requests (DSARs) is followed correctly, ensuring timely responses, proper identity verification, complete data provision, and adherence to GDPR Article 15 requirements.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "right_of_access_policy"
    },
    {
      type: "evidence",
      evidenceId: "right_of_access_evidence"
    }
  ],
  mappedRequirements: [{ frameworkId: "gdpr", requirementId: "A15" }]
};

// src/templates/controls/data/right-to-data-portability.control.ts
var rightToDataPortabilityControl = {
  id: "right_to_data_portability_control",
  name: "Right to Data Portability Procedure Review",
  description: "Verify that the procedure for handling data portability requests is followed, ensuring requests are assessed correctly based on legal basis and automation, data is provided in a structured, common, machine-readable format, and timelines are met as per GDPR Article 20.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "right_to_data_portability_policy"
    },
    {
      type: "evidence",
      evidenceId: "right_to_data_portability_evidence"
    }
  ],
  mappedRequirements: [{ frameworkId: "gdpr", requirementId: "A20" }]
};

// src/templates/controls/data/right-to-erasure.control.ts
var rightToErasureControl = {
  id: "right_to_erasure_control",
  name: "Right to Erasure Procedure Review",
  description: "Verify that the procedure for handling Right to Erasure requests (GDPR Art. 17) is followed, including timely response, identity verification, assessment of grounds and exceptions, secure data deletion/anonymization across systems (including notification to recipients where applicable), and communication with the data subject.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "right_to_erasure_policy"
      // Link to the policy created earlier
    },
    {
      type: "evidence",
      evidenceId: "right_to_erasure_evidence"
      // Link to the evidence to be created
    }
  ],
  mappedRequirements: [
    { frameworkId: "gdpr", requirementId: "A17" },
    // Maps to GDPR Article 17
    { frameworkId: "gdpr", requirementId: "A19" }
    // Maps to GDPR Article 19 (Notification obligation regarding erasure)
  ]
};

// src/templates/controls/data/right-to-object.control.ts
var rightToObjectControl = {
  id: "right_to_object_control",
  name: "Right to Object Procedure Review",
  description: "Verify that the procedure for handling objections to data processing is followed, ensuring objections based on legitimate interests/public task are correctly assessed, objections to direct marketing result in cessation, and data subjects are informed according to GDPR Article 21.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "right_to_object_policy"
    },
    {
      type: "evidence",
      evidenceId: "right_to_object_evidence"
    }
  ],
  mappedRequirements: [{ frameworkId: "gdpr", requirementId: "A21" }]
};

// src/templates/controls/data/right-to-rectification.control.ts
var rightToRectificationControl = {
  id: "right_to_rectification_control",
  name: "Right to Rectification Procedure Review",
  description: "Verify that the procedure for handling rectification requests is followed, ensuring requests are assessed correctly based on legal basis and automation, data is provided in a structured, common, machine-readable format, and timelines are met as per GDPR Article 16.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "right_to_rectification_policy"
    },
    {
      type: "evidence",
      evidenceId: "right_to_rectification_evidence"
    }
  ],
  mappedRequirements: [{ frameworkId: "gdpr", requirementId: "A16" }]
};

// src/templates/controls/data/right-to-restriction.control.ts
var rightToRestrictionControl = {
  id: "right_to_restriction_control",
  name: "Right to Restriction Procedure Review",
  description: "Verify that the procedure for handling Right to Restriction requests (GDPR Art. 18) is followed, including timely response, identity verification, assessment of grounds (accuracy contested, unlawful processing, legal claims, objection pending), implementation of restriction measures (e.g., marking, moving data), notification to recipients (Art. 19), and communication with the data subject (confirming restriction or explaining refusal, and notification before lifting).",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "right_to_restriction_policy"
      // Link to the policy created earlier
    },
    {
      type: "evidence",
      evidenceId: "right_to_restriction_evidence"
      // Link to the evidence to be created
    }
  ],
  mappedRequirements: [
    { frameworkId: "gdpr", requirementId: "A18" },
    // Maps to GDPR Article 18
    { frameworkId: "gdpr", requirementId: "A19" }
    // Maps to GDPR Article 19 (Notification obligation regarding restriction)
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
    },
    {
      type: "evidence",
      evidenceId: "risk_assessment_documentation"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC3"
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
    },
    {
      type: "evidence",
      evidenceId: "risk_identification_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC3"
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
    },
    {
      type: "evidence",
      evidenceId: "incident_analysis_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC7"
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
    },
    {
      type: "evidence",
      evidenceId: "incident_communication_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC7"
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
    },
    {
      type: "evidence",
      evidenceId: "recovery_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC7"
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
    },
    {
      type: "evidence",
      evidenceId: "incident_response_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC7"
    }
  ]
};

// src/templates/controls/data/supplier-data-processing-agreement.control.ts
var supplierDataProcessingAgreementControl = {
  id: "supplier_dpa_control",
  name: "Supplier DPA Execution and Compliance",
  description: "Verify that Data Processing Agreements (DPAs) meeting GDPR Article 28 requirements are in place with all relevant third-party processors (suppliers) and that compliance is monitored.",
  mappedArtifacts: [
    {
      type: "policy",
      policyId: "supplier_data_processing_agreement"
    },
    {
      type: "evidence",
      evidenceId: "supplier_dpa_evidence"
    }
  ],
  mappedRequirements: [
    { frameworkId: "gdpr", requirementId: "A30" },
    { frameworkId: "gdpr", requirementId: "A32" }
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
    },
    {
      type: "evidence",
      evidenceId: "account_management_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC6"
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
    },
    {
      type: "evidence",
      evidenceId: "technology_control_records"
    }
  ],
  mappedRequirements: [
    {
      frameworkId: "soc2",
      requirementId: "CC5"
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
  recordsOfProcessingActivitiesControl
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  controls,
  evidence,
  frameworks,
  gdprRequirements,
  policies,
  requirements,
  soc2Requirements,
  trainingVideos
});

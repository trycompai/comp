/**
 * Replaces reused generic policies with 16 Prescient-specific policies.
 * Also creates 2 new gap-closing tasks.
 *
 * IMPORTANT: Does NOT use framework link-policy (auto-links all controls).
 * Only uses control link-policy for precise per-control linking.
 */
import { apiRequest } from "../src/lib/api-client.js";
import type { ControlTemplate, PolicyTemplate, TaskTemplate } from "../src/types.js";

const FRAMEWORK_ID = "frk_69cd26bb50012b596d5e17d0";
const DELAY_MS = 600;
const delay = (ms: number) => Bun.sleep(ms);

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 5): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await fn();
      await delay(DELAY_MS);
      return result;
    } catch (err) {
      const msg = (err as Error).message;
      if (i === attempts - 1) throw err;
      const backoff = msg.includes("429") ? 10000 * 2 ** i : 1000 * (i + 1);
      console.error(`  Retry ${i + 1}/${attempts} for ${label} (wait ${backoff}ms)`);
      await delay(backoff);
    }
  }
  throw new Error("Unreachable");
}

// ── 16 Prescient policies ──────────────────────────────────────────

interface PolicyDef {
  name: string;
  description: string;
  frequency: "monthly" | "quarterly" | "yearly";
  department: "none" | "admin" | "gov" | "hr" | "it" | "itsm" | "qms";
  controls: string[];
}

const POLICIES: PolicyDef[] = [
  {
    name: "Board Charter",
    description:
      "Defines the board of directors' oversight responsibilities for internal control, including governance structures, reporting lines, and authority delegation. Documents requirements for board independence, expertise qualifications for overseeing information security controls, minimum annual meeting cadence with formal minutes, and senior management briefings on cybersecurity and privacy risk. Where no board exists, documents equivalent management oversight structures.",
    frequency: "yearly",
    department: "gov",
    controls: ["PA-1", "PA-2", "PA-3", "PA-41"],
  },
  {
    name: "Information Security Roles and Responsibilities Policy",
    description:
      "Defines the roles and responsibilities of personnel who oversee the design, development, implementation, operation, maintenance, and monitoring of information security controls. Establishes management accountability for internal control within organizational structures and reporting lines. Ensures responsibilities are formally communicated through job descriptions, role assignments, and policy documentation.",
    frequency: "yearly",
    department: "gov",
    controls: ["PA-4", "PA-5", "PA-6"],
  },
  {
    name: "Information Security Policy",
    description:
      "Establishes the company's overarching information security policies and procedures, including acceptable use requirements. Incorporates the formalized whistleblower policy with an anonymous communication channel for reporting potential issues or fraud. Governs the annual review and approval cycle for all security policies. Requires communication of security commitments to customers via Master Service Agreements or Terms of Service. Addresses product and service descriptions, technical support resources, and guidelines for internal and external users. Defines requirements for security awareness training within thirty days of hire and annually thereafter. Covers system capacity evaluation and infrastructure monitoring requirements.",
    frequency: "yearly",
    department: "gov",
    controls: ["PA-7", "PA-8", "PA-10", "PA-11", "PA-12", "PA-13", "PA-69", "PA-84"],
  },
  {
    name: "Incident Response Plan",
    description:
      "Documents the company's security and privacy incident response policies and procedures, communicated to authorized users. Defines the program for evaluating security events, determining whether incidents have occurred, and executing containment, remediation, and recovery activities. Requires incidents to be logged, tracked, resolved, and communicated to affected parties. Includes requirements for annual testing of the incident response plan through tabletop exercises with documented lessons learned and corrective actions.",
    frequency: "yearly",
    department: "itsm",
    controls: ["PA-9", "PA-63", "PA-75"],
  },
  {
    name: "Risk Management Policy",
    description:
      "Specifies the company's objectives to enable identification and assessment of risks. Documents the risk management program including guidance on identifying potential threats, rating significance of associated risks, and defining mitigation strategies. Requires annual risk assessments addressing environmental, regulatory, and technological changes to service commitments, including consideration of fraud risk and its potential impact on achieving objectives. Governs cybersecurity insurance requirements to mitigate the financial impact of business disruptions.",
    frequency: "yearly",
    department: "gov",
    controls: ["PA-15", "PA-16", "PA-39", "PA-46"],
  },
  {
    name: "Operations Security Policy",
    description:
      "Documents configuration management procedures ensuring system configurations are deployed consistently throughout the environment. Defines vulnerability management requirements including quarterly host-based scanning on external-facing systems, annual penetration testing with remediation tracking per SLAs, and routine infrastructure patching. Establishes system and network hardening standards based on industry best practices with annual review. Governs anti-malware deployment with routine updates, logging, and installation on all relevant systems. Covers production system asset inventory maintenance, mobile device management, intrusion detection, and log management requirements. Addresses backup policy documentation including frequency and processes for backing up and restoring customer data.",
    frequency: "yearly",
    department: "it",
    controls: [
      "PA-17", "PA-21", "PA-22", "PA-36", "PA-37", "PA-42", "PA-43",
      "PA-48", "PA-55", "PA-59", "PA-60", "PA-61", "PA-62",
    ],
  },
  {
    name: "Secure Development Policy",
    description:
      "Governs the formal systems development life cycle (SDLC) methodology including development, acquisition, implementation, changes (including emergency changes), and maintenance of information systems. Requires changes to software and infrastructure to be authorized, formally documented, tested, reviewed, and approved prior to production deployment with at least one approval required to merge to default branches. Restricts access to migrate changes to production to authorized personnel. Addresses communication of system changes to internal users and notification of customers regarding critical system changes.",
    frequency: "yearly",
    department: "it",
    controls: ["PA-18", "PA-23", "PA-44", "PA-70", "PA-77"],
  },
  {
    name: "Access Control Policy",
    description:
      "Documents requirements for adding, modifying, and removing user access. Governs role-based access restrictions across all in-scope system components with documented access request processes and manager approval. Mandates unique username and password or authorized SSH key authentication, company password configuration standards, and multi-factor authentication for remote production access. Establishes quarterly access reviews and termination checklists for timely access revocation within SLAs. Addresses least privilege, segregation of duties, and restrictions on privileged access to databases, production networks, operating systems, firewalls, and production code. Covers encrypted remote access connections, network segmentation, and firewall configuration.",
    frequency: "yearly",
    department: "it",
    controls: [
      "PA-19", "PA-25", "PA-27", "PA-28", "PA-29", "PA-30", "PA-31",
      "PA-32", "PA-33", "PA-34", "PA-49", "PA-51", "PA-52", "PA-53",
      "PA-54", "PA-57", "PA-58", "PA-71",
    ],
  },
  {
    name: "Data Management Policy",
    description:
      "Establishes formal procedures for the secure handling, retention, and disposal of company and customer data. Defines data disposal and destruction procedures for physical and electronic media. Governs the process for purging or removing customer data from the application environment when customers leave the service. Addresses data classification requirements to ensure confidential data is properly secured and restricted to authorized personnel. Prohibits confidential or sensitive customer data from being used or stored in non-production environments. Works in conjunction with the Data Classification Policy and Data Retention and Disposal Policy.",
    frequency: "yearly",
    department: "it",
    controls: ["PA-20", "PA-26", "PA-73", "PA-74", "PA-80"],
  },
  {
    name: "Business Continuity and Disaster Recovery Plan",
    description:
      "Documents business continuity and disaster recovery plans including communication plans to maintain information security continuity in the event of unavailability of key personnel. Defines database backup frequency, replication to secondary data centers, and backup retention requirements. Establishes the multi-location strategy for production environments to enable resumption of operations at alternate data centers. Requires annual testing of recovery plan procedures with documented results.",
    frequency: "yearly",
    department: "it",
    controls: ["PA-38", "PA-45", "PA-85", "PA-86", "PA-87", "PA-88"],
  },
  {
    name: "Physical Security Policy",
    description:
      "Defines processes for granting, changing, and terminating physical access to company data centers and facilities based on authorization from control owners. Establishes visitor management requirements including sign-in procedures, visitor badges, and escort requirements for data center and secure area access. Governs environmental monitoring device configurations and automatic alert generation for environmental incidents. Requires annual maintenance inspections of environmental security measures at company data centers.",
    frequency: "yearly",
    department: "admin",
    controls: ["PA-35", "PA-72", "PA-76", "PA-89", "PA-90"],
  },
  {
    name: "Cryptography Policy",
    description:
      "Documents requirements for cryptographic controls including encryption of portable and removable media devices. Governs secure data transmission protocols for encrypting confidential and sensitive data over public networks. Addresses restrictions on privileged access to encryption keys, limited to authorized users with a business need. Covers encryption at rest requirements for datastores housing sensitive customer data. Includes prohibition of removable media where applicable.",
    frequency: "yearly",
    department: "it",
    controls: ["PA-24", "PA-50", "PA-56", "PA-78"],
  },
  {
    name: "Data Classification Policy",
    description:
      "Establishes procedures for identifying and designating confidential information when received or created, and determining the retention period. Defines processes to ensure confidential data is properly secured and restricted to authorized personnel. Includes protections against erasure or destruction of confidential information during its specified retention period. Requires employee acknowledgment and annual policy approval.",
    frequency: "yearly",
    department: "it",
    controls: ["PA-79", "PA-81"],
  },
  {
    name: "Data Retention and Disposal Policy",
    description:
      "Defines procedures for identifying confidential information requiring destruction when the end of the retention period is reached. Establishes processes for erasing or otherwise destroying confidential information in accordance with company data handling standards. Requires evidence of policy acceptance by employees and annual approval. Addresses certificates of destruction and records of information disposal.",
    frequency: "yearly",
    department: "it",
    controls: ["PA-82", "PA-83"],
  },
  {
    name: "Code of Conduct",
    description:
      "Establishes the company's commitment to integrity and ethical values. Requires all employees to acknowledge the code of conduct at time of hire, with disciplinary procedures for violations. Mandates contractor agreements referencing the company code of conduct and confidentiality agreements at time of engagement. Requires employees to sign confidentiality agreements during onboarding. Covers background check requirements for new employees and annual performance evaluations for direct reports.",
    frequency: "yearly",
    department: "hr",
    controls: ["PA-40", "PA-64", "PA-65", "PA-66", "PA-67", "PA-68"],
  },
  {
    name: "Vendor Management Program",
    description:
      "Establishes the company's vendor management program including maintenance of a critical third-party vendor inventory with criticality and risk levels assigned. Defines vendor security and privacy requirements and mandates at least annual review of critical third-party vendors. Requires written agreements with vendors and related third-parties that include confidentiality and privacy commitments.",
    frequency: "yearly",
    department: "it",
    controls: ["PA-14", "PA-47"],
  },
];

// ── 2 new gap-closing tasks ────────────────────────────────────────

interface TaskDef {
  name: string;
  description: string;
  frequency: "monthly" | "quarterly" | "yearly";
  department: "none" | "admin" | "gov" | "hr" | "it" | "itsm" | "qms";
  controls: string[];
}

const NEW_TASKS: TaskDef[] = [
  {
    name: "Configuration & Hardening Standards Review",
    description:
      "Review and validate baseline configuration standards and network/system hardening standards against industry best practices. Verify configurations are deployed consistently across the environment and standards documentation is current.",
    frequency: "yearly",
    department: "it",
    controls: ["PA-17", "PA-59"],
  },
  {
    name: "Data Lifecycle Compliance Review",
    description:
      "Verify data disposal and destruction procedures are followed for electronic media and customer data. Review records of assets recovered for destruction and confirm departing customer data is purged from the application environment in accordance with policy.",
    frequency: "yearly",
    department: "it",
    controls: ["PA-20", "PA-73", "PA-74"],
  },
];

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching controls...");
  const ctls = await apiRequest<ControlTemplate[]>("/control-template", {
    query: { frameworkId: FRAMEWORK_ID, take: 200 },
  });
  const ctlByName = new Map<string, string>();
  for (const c of ctls) ctlByName.set(c.name, c.id);
  console.log(`Found ${ctlByName.size} controls`);

  // Step 1: Unlink all existing policies from all controls
  console.log("\n--- Unlinking existing policies ---");
  let unlinked = 0;
  for (const ctl of ctls) {
    const full = await apiRequest<ControlTemplate>(`/control-template/${ctl.id}`);
    for (const pol of full.policyTemplates || []) {
      await withRetry(
        () => apiRequest(`/control-template/${ctl.id}/policy-templates/${pol.id}`, { method: "DELETE" }),
        `unlink ${ctl.name} from ${pol.name}`,
      );
      unlinked++;
    }
  }
  console.log(`  Unlinked ${unlinked} policy-control pairs`);

  // Step 2: Create 16 new policies and link to controls
  console.log("\n--- Creating Prescient policies ---");
  for (let i = 0; i < POLICIES.length; i++) {
    const p = POLICIES[i]!;

    const pol = await withRetry(
      () =>
        apiRequest<PolicyTemplate>("/policy-template", {
          method: "POST",
          body: {
            name: p.name,
            description: p.description,
            frequency: p.frequency,
            department: p.department,
          },
        }),
      `create policy ${p.name}`,
    );
    console.log(`  [${i + 1}/${POLICIES.length}] ${p.name} -> ${pol.id} (${p.controls.length} controls)`);

    for (const ctlName of p.controls) {
      const ctlId = ctlByName.get(ctlName);
      if (!ctlId) {
        console.warn(`    Control ${ctlName} not found`);
        continue;
      }
      await withRetry(
        () => apiRequest(`/control-template/${ctlId}/policy-templates/${pol.id}`, { method: "POST" }),
        `link ${ctlName} to ${p.name}`,
      );
    }
  }

  // Step 3: Create 2 new gap-closing tasks
  console.log("\n--- Creating gap-closing tasks ---");
  for (const t of NEW_TASKS) {
    const task = await withRetry(
      () =>
        apiRequest<TaskTemplate>("/task-template", {
          method: "POST",
          body: {
            name: t.name,
            description: t.description,
            frequency: t.frequency,
            department: t.department,
          },
        }),
      `create task ${t.name}`,
    );
    console.log(`  ${t.name} -> ${task.id}`);

    for (const ctlName of t.controls) {
      const ctlId = ctlByName.get(ctlName);
      if (!ctlId) continue;
      await withRetry(
        () => apiRequest(`/control-template/${ctlId}/task-templates/${task.id}`, { method: "POST" }),
        `link ${ctlName} to ${t.name}`,
      );
    }
  }

  // Step 4: Verify
  console.log("\n--- Verification ---");
  let withPolicy = 0;
  let withoutPolicy: string[] = [];
  for (const ctl of ctls) {
    const full = await apiRequest<ControlTemplate>(`/control-template/${ctl.id}`);
    if ((full.policyTemplates || []).length > 0) {
      withPolicy++;
    } else {
      withoutPolicy.push(ctl.name);
    }
  }
  console.log(`  Controls with policy: ${withPolicy}/90`);
  if (withoutPolicy.length) {
    console.log(`  MISSING policy: ${withoutPolicy.join(", ")}`);
  }

  console.log("\nDone!");
  console.log(`  Policies created: ${POLICIES.length}`);
  console.log(`  Tasks created: ${NEW_TASKS.length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

/**
 * Replaces reused tasks with new Prescient-specific tasks derived from the CSV.
 * 1. Unlinks all existing tasks from controls
 * 2. Creates new tasks with Prescient descriptions
 * 3. Links new tasks to the correct controls
 */
import { apiRequest } from "../src/lib/api-client.js";
import type { ControlTemplate, TaskTemplate } from "../src/types.js";

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

// ── New Prescient tasks ────────────────────────────────────────────

interface TaskDef {
  name: string;
  description: string;
  frequency: "monthly" | "quarterly" | "yearly";
  department: "none" | "admin" | "gov" | "hr" | "it" | "itsm" | "qms";
  automationStatus?: "AUTOMATED" | "MANUAL";
  controls: string[];
}

const TASKS: TaskDef[] = [
  {
    name: "Incident Response Plan Communication",
    description:
      "Ensure the company's security and privacy incident response plan is documented and communicated to authorized users. Verify that security incidents are logged, tracked, resolved, and communicated to affected parties per the incident response policy.",
    frequency: "yearly",
    department: "itsm",
    controls: ["PA-9", "PA-75"],
  },
  {
    name: "Product & Service Description Review",
    description:
      "Maintain and provide descriptions of products and services to internal and external users. Include user guides, system descriptions, and documentation sufficient for users to understand the company's offerings and support internal controls.",
    frequency: "yearly",
    department: "it",
    controls: ["PA-10"],
  },
  {
    name: "External Support System Verification",
    description:
      "Verify the company's external-facing support system is in place and operational, allowing users to report system failures, incidents, concerns, and other complaints to appropriate personnel.",
    frequency: "yearly",
    department: "it",
    controls: ["PA-11"],
  },
  {
    name: "Database Backup & Replication Monitoring",
    description:
      "Verify daily database backups are performed, databases are replicated to a secondary data center in real-time, and production data is backed up to a separate location from production systems. Ensure alerts are configured to notify administrators of replication failures. Retain backups in accordance with the Business Continuity and Disaster Recovery Plan.",
    frequency: "monthly",
    department: "it",
    automationStatus: "AUTOMATED",
    controls: ["PA-21", "PA-85", "PA-86", "PA-87"],
  },
  {
    name: "Password & MFA Configuration Review",
    description:
      "Verify passwords for all in-scope system components are configured according to the company's policy. Ensure production systems require valid multi-factor authentication (MFA) for remote access by authorized employees.",
    frequency: "quarterly",
    department: "it",
    controls: ["PA-34", "PA-51"],
  },
  {
    name: "Physical Access Review",
    description:
      "Review the complete list of users with physical access to company data centers and facilities. Verify processes for granting, changing, and terminating physical access are followed based on authorization from control owners. Cross-reference against HR termination records.",
    frequency: "quarterly",
    department: "admin",
    controls: ["PA-35", "PA-76"],
  },
  {
    name: "Infrastructure Monitoring & Alerting Review",
    description:
      "Verify infrastructure monitoring tools are in place to monitor systems, infrastructure, and performance. Ensure predefined alerting thresholds are configured. Review log management tools to confirm they identify events impacting security objectives. Verify intrusion detection systems provide continuous network monitoring. Evaluate system capacity to ensure processing demand can be met.",
    frequency: "monthly",
    department: "it",
    automationStatus: "AUTOMATED",
    controls: ["PA-37", "PA-43", "PA-55", "PA-84", "PA-89"],
  },
  {
    name: "Quarterly Vulnerability Scanning",
    description:
      "Perform host-based vulnerability scans on all external-facing systems at least quarterly. Track critical and high vulnerabilities to remediation with tickets filed for each finding.",
    frequency: "quarterly",
    department: "it",
    controls: ["PA-36", "PA-42"],
  },
  {
    name: "System Change Communication",
    description:
      "Communicate system changes to authorized internal users. Maintain records of change communications during the observation period, such as emails, internal announcements, or changelog updates.",
    frequency: "monthly",
    department: "it",
    controls: ["PA-44"],
  },
  {
    name: "BC/DR Plan Testing",
    description:
      "Test business continuity and disaster recovery plans at least annually. Validate the multi-location strategy permits resumption of operations at alternate data centers in the event of facility loss. Document test results including data restoration capabilities.",
    frequency: "yearly",
    department: "it",
    controls: ["PA-45", "PA-88"],
  },
  {
    name: "Annual Risk Assessment",
    description:
      "Perform comprehensive risk assessments at least annually, identifying threats and changes (environmental, regulatory, and technological) to service commitments. Formally assess identified risks including rating significance and defining mitigation strategies. Include consideration of the potential for fraud and how fraud may impact the achievement of objectives.",
    frequency: "yearly",
    department: "gov",
    controls: ["PA-46"],
  },
  {
    name: "Encryption at Rest Verification",
    description:
      "Verify configurations and datastore status to confirm all company datastores housing sensitive customer data are encrypted at rest.",
    frequency: "yearly",
    department: "it",
    controls: ["PA-50"],
  },
  {
    name: "Secure Remote Access & Transmission Review",
    description:
      "Verify production systems can only be remotely accessed by authorized employees via approved encrypted connections (VPN, TLS). Confirm secure data transmission protocols are implemented and configured for confidential and sensitive data transmitted over public networks.",
    frequency: "yearly",
    department: "it",
    controls: ["PA-52", "PA-56"],
  },
  {
    name: "Firewall Ruleset Review",
    description:
      "Review firewall rulesets at least annually and track required changes to completion. Verify firewalls are configured to prevent unauthorized access. Document review details including specific rulesets examined and any changes implemented.",
    frequency: "yearly",
    department: "it",
    controls: ["PA-57", "PA-58"],
  },
  {
    name: "Anti-Malware Management",
    description:
      "Verify anti-malware technology is deployed on all environments commonly susceptible to malicious attacks. Ensure signatures are updated routinely, activity is logged, and the software is installed on all relevant in-scope systems. Review MDM records to confirm deployment coverage.",
    frequency: "monthly",
    department: "it",
    automationStatus: "AUTOMATED",
    controls: ["PA-62"],
  },
  {
    name: "Security Awareness Training",
    description:
      "Ensure all employees complete security awareness training within thirty days of hire and at least annually thereafter. Maintain a complete and accurate list of company employees with hire dates for verification of training completion.",
    frequency: "yearly",
    department: "hr",
    controls: ["PA-69"],
  },
  {
    name: "Change Authorization & Review",
    description:
      "Verify changes to software and infrastructure components of the service are authorized, formally documented, tested, reviewed, and approved prior to production deployment. Ensure at least one approval is required to merge to the default branch for version control repositories.",
    frequency: "monthly",
    department: "it",
    controls: ["PA-70"],
  },
  {
    name: "Visitor Log Management",
    description:
      "Require visitors to sign-in, wear a visitor badge, and be escorted by an authorized employee when accessing data centers or secure areas. Maintain visitor logs covering the audit period.",
    frequency: "monthly",
    department: "admin",
    controls: ["PA-72"],
  },
  {
    name: "Non-Production Data Protection Review",
    description:
      "Verify that confidential or sensitive customer data is not used or stored in non-production systems or environments. Perform system scans or reviews to confirm non-production systems do not contain sensitive customer data.",
    frequency: "yearly",
    department: "it",
    controls: ["PA-80"],
  },
  {
    name: "Data Center Environmental Inspection",
    description:
      "Perform annual maintenance inspections of environmental security measures at company data centers. Document inspection results and maintenance records showing environmental controls are properly maintained.",
    frequency: "yearly",
    department: "admin",
    controls: ["PA-90"],
  },
];

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  // Fetch controls
  console.log("Fetching controls...");
  const ctls = await apiRequest<ControlTemplate[]>("/control-template", {
    query: { frameworkId: FRAMEWORK_ID, take: 200 },
  });
  const ctlByName = new Map<string, string>();
  for (const c of ctls) ctlByName.set(c.name, c.id);

  // Step 1: Unlink all existing tasks from all controls
  console.log("\n--- Unlinking existing tasks ---");
  let unlinked = 0;
  for (const ctl of ctls) {
    const full = await apiRequest<ControlTemplate>(`/control-template/${ctl.id}`);
    const tasks = full.taskTemplates || [];
    for (const task of tasks) {
      await withRetry(
        () => apiRequest(`/control-template/${ctl.id}/task-templates/${task.id}`, { method: "DELETE" }),
        `unlink ${ctl.name} from ${task.name}`,
      );
      unlinked++;
    }
  }
  console.log(`  Unlinked ${unlinked} task-control pairs`);

  // Step 2: Create new tasks and link to controls
  console.log("\n--- Creating Prescient tasks ---");
  for (let i = 0; i < TASKS.length; i++) {
    const t = TASKS[i]!;

    const body: Record<string, unknown> = {
      name: t.name,
      description: t.description,
      frequency: t.frequency,
      department: t.department,
    };
    if (t.automationStatus) body.automationStatus = t.automationStatus;

    const task = await withRetry(
      () => apiRequest<TaskTemplate>("/task-template", { method: "POST", body }),
      `create task ${t.name}`,
    );
    console.log(`  [${i + 1}/${TASKS.length}] ${t.name} -> ${task.id} (${t.controls.length} controls)`);

    // Link to controls
    for (const ctlName of t.controls) {
      const ctlId = ctlByName.get(ctlName);
      if (!ctlId) {
        console.warn(`    Control ${ctlName} not found`);
        continue;
      }
      await withRetry(
        () => apiRequest(`/control-template/${ctlId}/task-templates/${task.id}`, { method: "POST" }),
        `link ${ctlName} to ${t.name}`,
      );
    }
  }

  console.log("\nDone!");
  console.log(`  Tasks created: ${TASKS.length}`);
  console.log(`  Controls with tasks: ${new Set(TASKS.flatMap((t) => t.controls)).size}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

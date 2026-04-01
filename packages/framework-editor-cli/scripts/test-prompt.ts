/**
 * End-to-end test: Create "Prescient Test 2" framework using ONLY the CLI
 * via Bun.spawn (not apiRequest). Tests the prompt instructions.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const CLI = resolve(ROOT, "src/index.ts");
const CSV_PATH = resolve(ROOT, "prescient.csv");
const DELAY_MS = 600;

const delay = (ms: number) => Bun.sleep(ms);

// ── CLI runner ─────────────────────────────────────────────────────

interface CliResult {
  success: boolean;
  data?: Record<string, unknown>;
  message?: string;
  error?: string;
}

async function cli(args: string[]): Promise<CliResult> {
  const proc = Bun.spawn(["bun", CLI, ...args], {
    stdout: "pipe",
    stderr: "pipe",
    cwd: ROOT,
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    try { return JSON.parse(stdout) as CliResult; }
    catch { throw new Error(`CLI failed (exit ${exitCode}): ${stderr || stdout}`); }
  }
  try { return JSON.parse(stdout) as CliResult; }
  catch { throw new Error(`Failed to parse CLI output: ${stdout}`); }
}

async function run(args: string[], label: string, attempts = 5): Promise<CliResult> {
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await cli(args);
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

// ── CSV parsing ────────────────────────────────────────────────────

function parseCSV(raw: string): string[][] {
  const content = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = []; let row: string[] = []; let field = ""; let inQ = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i]!;
    if (inQ) { if (ch === '"' && content[i+1] === '"') { field += '"'; i++; } else if (ch === '"') { inQ = false; } else { field += ch; } }
    else if (ch === '"') { inQ = true; } else if (ch === ",") { row.push(field); field = ""; } else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; } else { field += ch; }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function parseTrustIds(f: string): string[] {
  return f.split(",").map(s => s.trim().replace(/\s+/g, " "))
    .filter(s => /^(CC|A|C)\s*\d+\.\d+$/.test(s))
    .map(s => s.replace(/^(CC|A|C)(\d)/, "$1 $2"));
}

function parseCriteriaField(f: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const line of f.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^((?:CC|A|C)\s*\d+\.\d+)\s*:\s*(.*)/s);
    if (match) {
      const id = match[1]!.replace(/^(CC|A|C)(\d)/, "$1 $2").replace(/\s+/g, " ");
      result.set(id, match[2]!.trim());
    }
  }
  return result;
}

// ── Short names ────────────────────────────────────────────────────

const REQ_NAMES: Record<string, string> = {
  "CC 1.1": "Integrity and Ethical Values", "CC 1.2": "Board Independence and Oversight",
  "CC 1.3": "Organizational Structure and Authority", "CC 1.4": "Commitment to Competence",
  "CC 1.5": "Accountability for Internal Controls", "CC 2.1": "Quality Information for Internal Control",
  "CC 2.2": "Internal Communication of Objectives", "CC 2.3": "External Communication",
  "CC 3.1": "Risk Objectives Specification", "CC 3.2": "Risk Identification and Analysis",
  "CC 3.3": "Fraud Risk Consideration", "CC 3.4": "Change Impact Assessment",
  "CC 4.1": "Ongoing and Separate Evaluations", "CC 4.2": "Internal Control Deficiency Communication",
  "CC 5.1": "Control Activity Selection and Development", "CC 5.2": "Technology General Controls",
  "CC 5.3": "Policy-Based Control Deployment", "CC 6.1": "Logical Access Security",
  "CC 6.2": "User Registration and Credential Management", "CC 6.3": "Access Authorization and Modification",
  "CC 6.4": "Physical Access Restrictions", "CC 6.5": "Asset Decommissioning Controls",
  "CC 6.6": "External Threat Protection", "CC 6.7": "Information Transmission Security",
  "CC 6.8": "Malicious Software Prevention", "CC 7.1": "Vulnerability Detection and Monitoring",
  "CC 7.2": "System Anomaly Monitoring", "CC 7.3": "Security Event Evaluation",
  "CC 7.4": "Incident Response Execution", "CC 7.5": "Incident Recovery Activities",
  "CC 8.1": "Change Management Controls", "CC 9.1": "Business Disruption Risk Mitigation",
  "CC 9.2": "Vendor and Partner Risk Management", "A 1.1": "Processing Capacity Management",
  "A 1.2": "Environmental and Recovery Infrastructure", "A 1.3": "Recovery Plan Testing",
  "C 1.1": "Confidential Information Identification", "C 1.2": "Confidential Information Disposal",
};

const CTL_NAMES: Record<string, string> = {
  "PA-1": "Board Charter for Internal Control Oversight", "PA-2": "Board Expertise for Information Security",
  "PA-3": "Annual Board Meetings with Independent Directors", "PA-4": "Information Security Roles and Responsibilities",
  "PA-5": "Organizational Chart and Reporting Lines", "PA-6": "Security Roles in Job Descriptions",
  "PA-7": "Whistleblower Policy and Anonymous Reporting", "PA-8": "Annual Information Security Policy Review",
  "PA-9": "Incident Response Policy Communication", "PA-10": "Product and Service Descriptions",
  "PA-11": "External-Facing Support System", "PA-12": "Security Commitments in MSA/TOS",
  "PA-13": "Customer Technical Support Resources", "PA-14": "Vendor Confidentiality Agreements",
  "PA-15": "Risk Objectives for Identification and Assessment", "PA-16": "Risk Management Program",
  "PA-17": "Configuration Management Procedures", "PA-18": "Systems Development Life Cycle (SDLC)",
  "PA-19": "Access Control for User Provisioning", "PA-20": "Data Retention and Disposal Procedures",
  "PA-21": "Data Backup and Recovery Policy", "PA-22": "Production System Asset Inventory",
  "PA-23": "Production Change Migration Access", "PA-24": "Encryption Key Access Restriction",
  "PA-25": "Unique Authentication Requirements", "PA-26": "Data Classification Policy",
  "PA-27": "Authorized System Access Only", "PA-28": "Privileged Database Access Restriction",
  "PA-29": "Privileged Firewall Access Restriction", "PA-30": "Privileged OS Access Restriction",
  "PA-31": "Privileged Production Network Access", "PA-32": "Role-Based Access Provisioning",
  "PA-33": "Production Network Authentication", "PA-34": "Password Configuration Standards",
  "PA-35": "Physical Access Management", "PA-36": "Vulnerability and Monitoring Policy",
  "PA-37": "Infrastructure Monitoring and Alerting", "PA-38": "BC/DR Communication Plans",
  "PA-39": "Cybersecurity Insurance", "PA-40": "Annual Performance Evaluations",
  "PA-41": "Board Cybersecurity Briefing", "PA-42": "Quarterly Vulnerability Scanning",
  "PA-43": "Log Management Tool", "PA-44": "Internal System Change Communication",
  "PA-45": "Annual BC/DR Plan Testing", "PA-46": "Annual Risk Assessment",
  "PA-47": "Vendor Management Program", "PA-48": "Annual Penetration Testing",
  "PA-49": "Secure Datastore Authentication", "PA-50": "Encryption at Rest",
  "PA-51": "Multi-Factor Authentication for Production", "PA-52": "Encrypted Remote Access",
  "PA-53": "Network Segmentation", "PA-54": "Quarterly Access Reviews",
  "PA-55": "Intrusion Detection System", "PA-56": "Secure Data Transmission Protocols",
  "PA-57": "Annual Firewall Ruleset Review", "PA-58": "Firewall Configuration",
  "PA-59": "Network and System Hardening Standards", "PA-60": "Infrastructure Patching",
  "PA-61": "Mobile Device Management (MDM)", "PA-62": "Anti-Malware Deployment",
  "PA-63": "Annual Incident Response Testing", "PA-64": "Employee Background Checks",
  "PA-65": "Contractor Code of Conduct", "PA-66": "Employee Code of Conduct Acknowledgment",
  "PA-67": "Contractor Confidentiality Agreement", "PA-68": "Employee Confidentiality Agreement",
  "PA-69": "Security Awareness Training", "PA-70": "Change Authorization and Approval",
  "PA-71": "Termination Access Revocation", "PA-72": "Visitor Sign-In and Escort",
  "PA-73": "Electronic Media Destruction", "PA-74": "Customer Data Purge on Departure",
  "PA-75": "Security Incident Tracking and Resolution", "PA-76": "Data Center Physical Access Control",
  "PA-77": "Customer Notification of Critical Changes", "PA-78": "Portable Media Encryption",
  "PA-79": "Confidential Information Identification", "PA-80": "Non-Production Data Protection",
  "PA-81": "Confidential Information Retention Protection", "PA-82": "Confidential Information Destruction Identification",
  "PA-83": "Confidential Information Erasure and Destruction", "PA-84": "System Capacity Evaluation",
  "PA-85": "Daily Database Backups", "PA-86": "Real-Time Database Replication",
  "PA-87": "Off-Site Production Data Backups", "PA-88": "Multi-Location Production Strategy",
  "PA-89": "Environmental Monitoring Devices", "PA-90": "Annual Environmental Security Inspection",
};

// ── Policies ───────────────────────────────────────────────────────

interface PolicyDef { name: string; description: string; department: string; controls: string[]; }

const POLICIES: PolicyDef[] = [
  { name: "Board Charter", description: "Defines the board of directors' oversight responsibilities for internal control, including governance structures, reporting lines, and authority delegation. Documents requirements for board independence, expertise qualifications, minimum annual meeting cadence with formal minutes, and senior management briefings on cybersecurity and privacy risk.", department: "gov", controls: ["PA-1","PA-2","PA-3","PA-41"] },
  { name: "Information Security Roles and Responsibilities Policy", description: "Defines the roles and responsibilities of personnel who oversee the design, development, implementation, operation, maintenance, and monitoring of information security controls. Establishes management accountability within organizational structures and reporting lines.", department: "gov", controls: ["PA-4","PA-5","PA-6"] },
  { name: "Information Security Policy", description: "Establishes the company's overarching information security policies and procedures, including acceptable use requirements and the formalized whistleblower policy with anonymous reporting. Governs annual review of all security policies, communication of security commitments to customers, product/service descriptions, technical support resources, security awareness training requirements, and system capacity monitoring.", department: "gov", controls: ["PA-7","PA-8","PA-10","PA-11","PA-12","PA-13","PA-69","PA-84"] },
  { name: "Incident Response Plan", description: "Documents the company's security and privacy incident response procedures. Defines the program for evaluating security events, executing containment, remediation, and recovery. Requires incidents to be logged, tracked, resolved, and communicated to affected parties. Includes annual testing through tabletop exercises.", department: "itsm", controls: ["PA-9","PA-63","PA-75"] },
  { name: "Risk Management Policy", description: "Specifies objectives for risk identification and assessment. Documents the risk management program including threat identification, risk rating, and mitigation strategies. Requires annual risk assessments addressing environmental, regulatory, and technological changes including fraud risk consideration. Covers cybersecurity insurance requirements.", department: "gov", controls: ["PA-15","PA-16","PA-39","PA-46"] },
  { name: "Operations Security Policy", description: "Documents configuration management, vulnerability management (quarterly scanning, annual penetration testing, patching), system/network hardening standards, anti-malware deployment, production asset inventory, mobile device management, intrusion detection, log management, and backup procedures for customer data.", department: "it", controls: ["PA-17","PA-21","PA-22","PA-36","PA-37","PA-42","PA-43","PA-48","PA-55","PA-59","PA-60","PA-61","PA-62"] },
  { name: "Secure Development Policy", description: "Governs the SDLC methodology including development, acquisition, implementation, and changes to information systems. Requires changes to be authorized, documented, tested, reviewed, and approved prior to production. Restricts production migration access. Addresses internal and customer-facing change communication.", department: "it", controls: ["PA-18","PA-23","PA-44","PA-70","PA-77"] },
  { name: "Access Control Policy", description: "Documents requirements for adding, modifying, and removing user access. Governs role-based access with least privilege and segregation of duties. Mandates unique authentication, password standards, and MFA for production. Establishes quarterly access reviews and termination checklists. Covers privileged access to databases, networks, OS, firewalls, encrypted remote access, network segmentation, and firewall configuration.", department: "it", controls: ["PA-19","PA-25","PA-27","PA-28","PA-29","PA-30","PA-31","PA-32","PA-33","PA-34","PA-49","PA-51","PA-52","PA-53","PA-54","PA-57","PA-58","PA-71"] },
  { name: "Data Management Policy", description: "Establishes procedures for secure handling, retention, and disposal of company and customer data. Defines data classification, disposal/destruction procedures, customer data purging on departure, and prohibition of sensitive data in non-production environments.", department: "it", controls: ["PA-20","PA-26","PA-73","PA-74","PA-80"] },
  { name: "Business Continuity and Disaster Recovery Plan", description: "Documents BC/DR plans including communication plans for key personnel unavailability. Defines database backup frequency, replication to secondary data centers, and backup retention. Establishes multi-location production strategy and requires annual recovery plan testing.", department: "it", controls: ["PA-38","PA-45","PA-85","PA-86","PA-87","PA-88"] },
  { name: "Physical Security Policy", description: "Defines processes for granting, changing, and terminating physical access to data centers and facilities. Establishes visitor management with sign-in, badges, and escort requirements. Governs environmental monitoring and annual maintenance inspections.", department: "admin", controls: ["PA-35","PA-72","PA-76","PA-89","PA-90"] },
  { name: "Cryptography Policy", description: "Documents cryptographic controls including encryption of portable/removable media, secure data transmission protocols, encryption key access restrictions, and encryption at rest for sensitive customer data.", department: "it", controls: ["PA-24","PA-50","PA-56","PA-78"] },
  { name: "Data Classification Policy", description: "Establishes procedures for identifying and designating confidential information, determining retention periods, and protecting confidential data from unauthorized erasure during retention.", department: "it", controls: ["PA-79","PA-81"] },
  { name: "Data Retention and Disposal Policy", description: "Defines procedures for identifying confidential information requiring destruction and processes for erasing or destroying it in accordance with company standards. Addresses certificates of destruction.", department: "it", controls: ["PA-82","PA-83"] },
  { name: "Code of Conduct", description: "Establishes commitment to integrity and ethical values. Requires employee code of conduct acknowledgment at hire with disciplinary procedures. Mandates contractor code of conduct references, confidentiality agreements, background checks, and annual performance evaluations.", department: "hr", controls: ["PA-40","PA-64","PA-65","PA-66","PA-67","PA-68"] },
  { name: "Vendor Management Program", description: "Establishes vendor management including critical third-party inventory with criticality/risk levels, vendor security requirements, annual vendor reviews, and written agreements with confidentiality commitments.", department: "it", controls: ["PA-14","PA-47"] },
];

// ── Tasks ──────────────────────────────────────────────────────────

interface TaskDef { name: string; description: string; frequency: string; department: string; controls: string[]; }

const TASKS: TaskDef[] = [
  { name: "Incident Response Plan Communication", description: "Ensure the incident response plan is documented and communicated to authorized users. Verify security incidents are logged, tracked, resolved, and communicated per policy.", frequency: "yearly", department: "itsm", controls: ["PA-9","PA-75"] },
  { name: "Product & Service Description Review", description: "Maintain and provide descriptions of products and services to internal and external users.", frequency: "yearly", department: "it", controls: ["PA-10"] },
  { name: "External Support System Verification", description: "Verify the external-facing support system is operational for reporting failures, incidents, and complaints.", frequency: "yearly", department: "it", controls: ["PA-11"] },
  { name: "Database Backup & Replication Monitoring", description: "Verify daily backups, real-time replication to secondary data centers, and off-site backup storage. Ensure failure alerts are configured.", frequency: "monthly", department: "it", controls: ["PA-21","PA-85","PA-86","PA-87"] },
  { name: "Password & MFA Configuration Review", description: "Verify password configurations meet policy and MFA is required for production remote access.", frequency: "quarterly", department: "it", controls: ["PA-34","PA-51"] },
  { name: "Physical Access Review", description: "Review physical access lists for data centers and facilities. Verify processes for granting, changing, and terminating access.", frequency: "quarterly", department: "admin", controls: ["PA-35","PA-76"] },
  { name: "Infrastructure Monitoring & Alerting Review", description: "Verify monitoring tools, alerting thresholds, log management, intrusion detection, and capacity monitoring are operational.", frequency: "monthly", department: "it", controls: ["PA-37","PA-43","PA-55","PA-84","PA-89"] },
  { name: "Quarterly Vulnerability Scanning", description: "Perform host-based vulnerability scans on external-facing systems. Track critical/high vulnerabilities to remediation.", frequency: "quarterly", department: "it", controls: ["PA-36","PA-42"] },
  { name: "System Change Communication", description: "Communicate system changes to authorized internal users with records of communications.", frequency: "monthly", department: "it", controls: ["PA-44"] },
  { name: "BC/DR Plan Testing", description: "Test BC/DR plans annually. Validate multi-location strategy and document recovery test results.", frequency: "yearly", department: "it", controls: ["PA-45","PA-88"] },
  { name: "Annual Risk Assessment", description: "Perform annual risk assessments identifying threats, rating risks, and defining mitigation including fraud risk consideration.", frequency: "yearly", department: "gov", controls: ["PA-46"] },
  { name: "Encryption at Rest Verification", description: "Verify all datastores housing sensitive customer data are encrypted at rest.", frequency: "yearly", department: "it", controls: ["PA-50"] },
  { name: "Secure Remote Access & Transmission Review", description: "Verify encrypted connections for production remote access and secure transmission protocols for sensitive data.", frequency: "yearly", department: "it", controls: ["PA-52","PA-56"] },
  { name: "Firewall Ruleset Review", description: "Review firewall rulesets annually, track changes to completion, verify firewall configurations.", frequency: "yearly", department: "it", controls: ["PA-57","PA-58"] },
  { name: "Anti-Malware Management", description: "Verify anti-malware is deployed, signatures updated, activity logged, and installed on all relevant systems.", frequency: "monthly", department: "it", controls: ["PA-62"] },
  { name: "Security Awareness Training", description: "Ensure employees complete security awareness training within 30 days of hire and annually thereafter.", frequency: "yearly", department: "hr", controls: ["PA-69"] },
  { name: "Change Authorization & Review", description: "Verify changes are authorized, documented, tested, reviewed, and approved before production deployment.", frequency: "monthly", department: "it", controls: ["PA-70"] },
  { name: "Visitor Log Management", description: "Require visitor sign-in, badges, and escorts. Maintain visitor logs.", frequency: "monthly", department: "admin", controls: ["PA-72"] },
  { name: "Non-Production Data Protection Review", description: "Verify sensitive customer data is not in non-production environments.", frequency: "yearly", department: "it", controls: ["PA-80"] },
  { name: "Data Center Environmental Inspection", description: "Perform annual inspections of environmental security measures at data centers.", frequency: "yearly", department: "admin", controls: ["PA-90"] },
  { name: "Configuration & Hardening Standards Review", description: "Review baseline configurations and hardening standards against industry best practices.", frequency: "yearly", department: "it", controls: ["PA-17","PA-59"] },
  { name: "Data Lifecycle Compliance Review", description: "Verify data disposal procedures are followed and departing customer data is purged per policy.", frequency: "yearly", department: "it", controls: ["PA-20","PA-73","PA-74"] },
  { name: "Employee Background Check Process", description: "Perform background checks on new employees as part of the onboarding process.", frequency: "yearly", department: "hr", controls: ["PA-64"] },
  { name: "Employee & Contractor Onboarding Compliance", description: "Ensure employees acknowledge the code of conduct and sign confidentiality agreements at hire. Ensure contractors sign code of conduct references and confidentiality agreements at engagement.", frequency: "yearly", department: "hr", controls: ["PA-65","PA-66","PA-67","PA-68"] },
  { name: "Employee Termination & Access Revocation", description: "Complete termination checklists ensuring access is revoked for terminated employees within SLAs.", frequency: "yearly", department: "hr", controls: ["PA-71"] },
];

// ── Document types ─────────────────────────────────────────────────

const CONTROL_DOCTYPES: Record<string, string[]> = {
  "PA-1": ["board_meeting"], "PA-2": ["board_meeting"], "PA-3": ["board_meeting","meeting"],
  "PA-4": ["it_leadership_meeting"], "PA-6": ["it_leadership_meeting"], "PA-7": ["whistleblower_report"],
  "PA-9": ["tabletop_exercise"], "PA-19": ["access_request","rbac_matrix"],
  "PA-22": ["infrastructure_inventory","network_diagram"], "PA-23": ["rbac_matrix"],
  "PA-24": ["rbac_matrix"], "PA-25": ["rbac_matrix"], "PA-27": ["rbac_matrix"],
  "PA-28": ["rbac_matrix"], "PA-29": ["rbac_matrix","network_diagram"], "PA-30": ["rbac_matrix"],
  "PA-31": ["rbac_matrix"], "PA-32": ["rbac_matrix","access_request"], "PA-33": ["rbac_matrix"],
  "PA-35": ["access_request"], "PA-40": ["employee_performance_evaluation"],
  "PA-41": ["board_meeting","meeting"], "PA-44": ["it_leadership_meeting"],
  "PA-45": ["tabletop_exercise"], "PA-46": ["risk_committee_meeting","whistleblower_report"],
  "PA-47": ["infrastructure_inventory"], "PA-48": ["penetration_test"],
  "PA-53": ["network_diagram"], "PA-54": ["rbac_matrix","access_request"],
  "PA-57": ["meeting"], "PA-60": ["infrastructure_inventory"],
  "PA-61": ["infrastructure_inventory"], "PA-63": ["tabletop_exercise","meeting"],
  "PA-70": ["infrastructure_inventory"], "PA-71": ["access_request"],
  "PA-73": ["infrastructure_inventory"], "PA-76": ["access_request"],
  "PA-84": ["infrastructure_inventory"],
};

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  // Parse CSV
  console.log("Parsing CSV...");
  const csvContent = readFileSync(CSV_PATH, "utf-8");
  const allRows = parseCSV(csvContent);
  const headerIdx = allRows.findIndex(row => row[0]?.trim() === "Control ID");
  if (headerIdx === -1) throw new Error("Could not find header row");
  const dataRows = allRows.slice(headerIdx + 1).filter(row => row[0]?.trim().startsWith("PA-"));
  console.log(`Found ${dataRows.length} controls`);

  // Extract unique requirements
  const requirements = new Map<string, string>();
  for (const row of dataRows) {
    const trustIds = parseTrustIds(row[1] ?? "");
    const criteriaMap = parseCriteriaField(row[2] ?? "");
    for (const id of trustIds) {
      if (!requirements.has(id)) {
        requirements.set(id, criteriaMap.get(id) ?? id);
      }
    }
  }
  console.log(`Found ${requirements.size} unique requirements\n`);

  // ── Step 1: Create framework via CLI ──
  console.log("--- Creating framework ---");
  const fwResult = await run(
    ["framework", "create", "--name", "Prescient Test 2", "--version", "2025", "--description", "SOC 2 Type II compliance framework with Prescient Assurance controls (test)."],
    "create framework",
  );
  const frameworkId = fwResult.data!.id as string;
  console.log(`Framework: ${frameworkId}\n`);

  // ── Step 2: Create requirements via CLI ──
  console.log("--- Creating requirements ---");
  const reqIds = new Map<string, string>();
  let ri = 0;
  for (const [identifier, description] of requirements) {
    ri++;
    const shortName = REQ_NAMES[identifier] ?? identifier;
    const result = await run(
      ["requirement", "create", "--framework-id", frameworkId, "--name", shortName, "--identifier", identifier, "--description", description],
      `req ${identifier}`,
    );
    reqIds.set(identifier, result.data!.id as string);
    if (ri % 10 === 0) console.log(`  ${ri}/${requirements.size}`);
  }
  console.log(`  Created ${reqIds.size} requirements\n`);

  // ── Step 3: Create controls, link requirements, set doc types ──
  console.log("--- Creating controls ---");
  const ctlIds = new Map<string, string>();
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]!;
    const paId = row[0]!.trim();
    const trustIds = parseTrustIds(row[1] ?? "");
    const description = (row[3] ?? "").trim();
    const shortName = CTL_NAMES[paId] ?? paId;
    const docTypes = CONTROL_DOCTYPES[paId] || [];

    // Create control with doc types
    const ctlResult = await run(
      ["control", "create", "--name", shortName, "--description", description,
       ...(docTypes.length ? ["--document-types", docTypes.join(",")] : [])],
      `ctl ${paId}`,
    );
    const ctlId = ctlResult.data!.id as string;
    ctlIds.set(paId, ctlId);

    // Link to requirements (NOT framework link-control)
    for (const trustId of trustIds) {
      const reqId = reqIds.get(trustId);
      if (reqId) {
        await run(["control", "link-requirement", ctlId, reqId], `${paId}->${trustId}`);
      }
    }

    if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${dataRows.length}`);
  }
  console.log(`  Created ${ctlIds.size} controls\n`);

  // ── Step 4: Create policies, link to controls ──
  console.log("--- Creating policies ---");
  for (let i = 0; i < POLICIES.length; i++) {
    const p = POLICIES[i]!;
    const polResult = await run(
      ["policy", "create", "--name", p.name, "--description", p.description, "--frequency", "yearly", "--department", p.department],
      `policy ${p.name}`,
    );
    const polId = polResult.data!.id as string;

    for (const ctlName of p.controls) {
      const ctlId = ctlIds.get(ctlName);
      if (ctlId) {
        await run(["control", "link-policy", ctlId, polId], `${ctlName}->pol`);
      }
    }
    console.log(`  [${i + 1}/${POLICIES.length}] ${p.name} (${p.controls.length} controls)`);
  }

  // ── Step 5: Create tasks, link to controls ──
  console.log("\n--- Creating tasks ---");
  for (let i = 0; i < TASKS.length; i++) {
    const t = TASKS[i]!;
    const taskResult = await run(
      ["task", "create", "--name", t.name, "--description", t.description, "--frequency", t.frequency, "--department", t.department],
      `task ${t.name}`,
    );
    const taskId = taskResult.data!.id as string;

    for (const ctlName of t.controls) {
      const ctlId = ctlIds.get(ctlName);
      if (ctlId) {
        await run(["control", "link-task", ctlId, taskId], `${ctlName}->task`);
      }
    }
    if ((i + 1) % 5 === 0) console.log(`  ${i + 1}/${TASKS.length}`);
  }

  // ── Step 6: Verify ──
  console.log("\n--- Verification ---");
  let withPolicy = 0, withTask = 0, withDocs = 0, withReqs = 0;
  for (const [paId, ctlId] of ctlIds) {
    const result = await run(["control", "get", ctlId], `verify ${paId}`);
    const d = result.data!;
    if (((d.policyTemplates as unknown[]) || []).length > 0) withPolicy++;
    if (((d.taskTemplates as unknown[]) || []).length > 0) withTask++;
    if (((d.documentTypes as unknown[]) || []).length > 0) withDocs++;
    if (((d.requirements as unknown[]) || []).length > 0) withReqs++;
  }
  console.log(`  With requirements: ${withReqs}/90`);
  console.log(`  With policy: ${withPolicy}/90`);
  console.log(`  With task: ${withTask}/90`);
  console.log(`  With documents: ${withDocs}/90`);

  console.log(`\nDone! Framework ID: ${frameworkId}`);
}

main().catch(err => { console.error("Fatal error:", err); process.exit(1); });

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

// ── Existing policy IDs ────────────────────────────────────────────

const POL = {
  accessControl: "frk_pt_685e42188e2df1c285cca159",
  authPassword: "frk_pt_685e42445c99797321ef051a",
  backgroundScreening: "frk_pt_685e45c938ad29ad775a2344",
  bcdr: "frk_pt_685e44939f827e6a9f736fd4",
  changeRelease: "frk_pt_685e42c38c3267d391674ce3",
  codeOfConduct: "frk_pt_68e3f39e77b0a823add09bf5",
  dataClassification: "frk_pt_685e40d46e7b1123022bf3e8",
  encryption: "frk_pt_685e4177d5da489e7c5e1b1b",
  incidentResponse: "frk_pt_685e43e23b78127274355980",
  isGovernance: "frk_pt_685e3f7b4ebcb27b60c51434",
  infoSharing: "frk_pt_685e46557bc14fbddea6468a",
  logging: "frk_pt_685e43997555c7ab39983c21",
  networkSecurity: "frk_pt_6944570c25631cd097be8119",
  physicalSecurity: "frk_pt_685e4508d8c0d14ae873e644",
  policyMgmt: "frk_pt_685e405054f7c35d89ccccf2",
  remoteAccess: "frk_pt_685e426ccbb0de15a90cf446",
  retention: "frk_pt_685e414029124c24387beff0",
  riskMgmt: "frk_pt_685e3fc75bd72cd0745dc5d1",
  sanctions: "frk_pt_685e45f736049f188c3439b4",
  secureConfig: "frk_pt_685e42a3bbd08ad14de297f0",
  sdlc: "frk_pt_685e4319a5bb1d2d411975e6",
  securityTraining: "frk_pt_685e458a49e1eff0af54e3d2",
  vendorRisk: "frk_pt_685e462046667f75a50a2c3e",
  vulnPatch: "frk_pt_685e43555493efd5f79c15be",
};

// ── Existing task IDs ──────────────────────────────────────────────

const TASK = {
  boardMeetings: "frk_tt_68c8309516fdbc514404988d",
  perfEvals: "frk_tt_68e52b27c4bdbf1b24051b8b",
  accessReview: "frk_tt_68e805457c2dcc784e72e3cc",
  backupTest: "frk_tt_68e52b269db179c434734766",
  backupLogs: "frk_tt_68e52b26b166e2c0a0d11956",
  incidentResponse: "frk_tt_68406b4f40c87c12ae0479ce",
  irTabletop: "frk_tt_68e80545a8b432bc59eb8037",
  infraInventory: "frk_tt_69033a6bfeb4759be36257bc",
  monitoring: "frk_tt_68406af04a4acb93083413b9",
  employeeDesc: "frk_tt_684069a3a0dd8322b2ac3f03",
  employeeVerify: "frk_tt_68406951bd282273ebe286cc",
  orgChart: "frk_tt_68e52b274a7c38c62db08e80",
  encryptionAtRest: "frk_tt_68e52b26bf0e656af9e4e9c3",
  rbac: "frk_tt_68e80544d9734e0402cfa807",
  secureCode: "frk_tt_68406e353df3bc002994acef",
  visitorControl: "frk_tt_6901e0aa49fb834934748c93",
  deviceList: "frk_tt_68406903839203801ac8041a",
  diagramming: "frk_tt_6849aad98c50d734dd904d98",
  firewall: "frk_tt_68fa2a852e70f757188f0c39",
  employeeAccess: "frk_tt_68406ca292d9fffb264991b9",
  codeChanges: "frk_tt_68406d64f09f13271c14dd01",
  twoFA: "frk_tt_68406cd9dde2d8cd4c463fe0",
  tlsHttps: "frk_tt_68406f411fe27e47a0d6d5f3",
  sepEnvs: "frk_tt_68e52a484cad0014de7a628f",
  secureDevices: "frk_tt_6840796f77d8a0dff53f947a",
  secureStorage: "frk_tt_6901e0aa6d3f2bbab1ea5b84",
  contactInfo: "frk_tt_68406a514e90bb6e32e0b107",
  sysDescription: "frk_tt_68dc1a3a9b92bb4ffb89e334",
  publicPolicies: "frk_tt_6840791cac0a7b780dbaf932",
  officeAccess: "frk_tt_6901e041bb02b41fa3b7dca9",
};

// ── New tasks to create ────────────────────────────────────────────

const NEW_TASKS: Array<{
  key: string;
  name: string;
  description: string;
  frequency: string;
  department: string;
}> = [
  {
    key: "riskAssessment",
    name: "Annual Risk Assessment",
    description: "Perform a comprehensive risk assessment including identification of threats, rating significance, and defining mitigation strategies. Include consideration of fraud risk.",
    frequency: "yearly",
    department: "gov",
  },
  {
    key: "vendorReview",
    name: "Annual Vendor Review",
    description: "Review critical third-party vendors for security and privacy compliance. Update vendor inventory with criticality and risk levels.",
    frequency: "yearly",
    department: "it",
  },
  {
    key: "penTest",
    name: "Annual Penetration Testing",
    description: "Conduct external penetration testing, develop remediation plans, and track vulnerabilities to resolution per SLA.",
    frequency: "yearly",
    department: "it",
  },
  {
    key: "secTraining",
    name: "Security Awareness Training",
    description: "Ensure all employees complete security awareness training within 30 days of hire and at least annually thereafter.",
    frequency: "yearly",
    department: "hr",
  },
  {
    key: "policyReview",
    name: "Annual Policy Review",
    description: "Review all information security policies and procedures for accuracy and completeness. Update as needed and obtain management approval.",
    frequency: "yearly",
    department: "gov",
  },
];

// ── Control → Policy mapping ───────────────────────────────────────

const CONTROL_POLICIES: Record<string, string[]> = {
  "PA-1":  [POL.isGovernance],
  "PA-2":  [POL.isGovernance],
  "PA-3":  [POL.isGovernance],
  "PA-4":  [POL.isGovernance],
  "PA-5":  [POL.isGovernance],
  "PA-6":  [POL.isGovernance],
  "PA-7":  [POL.codeOfConduct],
  "PA-8":  [POL.isGovernance, POL.policyMgmt],
  "PA-9":  [POL.incidentResponse],
  "PA-10": [POL.infoSharing],
  "PA-11": [POL.infoSharing],
  "PA-12": [POL.infoSharing],
  "PA-13": [POL.infoSharing],
  "PA-14": [POL.vendorRisk],
  "PA-15": [POL.riskMgmt],
  "PA-16": [POL.riskMgmt],
  "PA-17": [POL.secureConfig],
  "PA-18": [POL.sdlc],
  "PA-19": [POL.accessControl],
  "PA-20": [POL.retention],
  "PA-21": [POL.bcdr],
  "PA-22": [POL.secureConfig],
  "PA-23": [POL.changeRelease],
  "PA-24": [POL.encryption],
  "PA-25": [POL.authPassword],
  "PA-26": [POL.dataClassification],
  "PA-27": [POL.accessControl],
  "PA-28": [POL.accessControl],
  "PA-29": [POL.networkSecurity],
  "PA-30": [POL.accessControl],
  "PA-31": [POL.networkSecurity],
  "PA-32": [POL.accessControl],
  "PA-33": [POL.authPassword, POL.networkSecurity],
  "PA-34": [POL.authPassword],
  "PA-35": [POL.physicalSecurity],
  "PA-36": [POL.vulnPatch],
  "PA-37": [POL.logging],
  "PA-38": [POL.bcdr],
  "PA-39": [POL.riskMgmt],
  "PA-40": [POL.codeOfConduct],
  "PA-41": [POL.isGovernance],
  "PA-42": [POL.vulnPatch],
  "PA-43": [POL.logging],
  "PA-44": [POL.changeRelease],
  "PA-45": [POL.bcdr],
  "PA-46": [POL.riskMgmt],
  "PA-47": [POL.vendorRisk],
  "PA-48": [POL.vulnPatch],
  "PA-49": [POL.authPassword],
  "PA-50": [POL.encryption],
  "PA-51": [POL.authPassword],
  "PA-52": [POL.remoteAccess],
  "PA-53": [POL.networkSecurity],
  "PA-54": [POL.accessControl],
  "PA-55": [POL.networkSecurity],
  "PA-56": [POL.encryption],
  "PA-57": [POL.networkSecurity],
  "PA-58": [POL.networkSecurity],
  "PA-59": [POL.secureConfig],
  "PA-60": [POL.vulnPatch],
  "PA-61": [POL.remoteAccess],
  "PA-62": [POL.vulnPatch],
  "PA-63": [POL.incidentResponse],
  "PA-64": [POL.backgroundScreening],
  "PA-65": [POL.codeOfConduct],
  "PA-66": [POL.codeOfConduct, POL.sanctions],
  "PA-67": [POL.backgroundScreening],
  "PA-68": [POL.backgroundScreening],
  "PA-69": [POL.securityTraining],
  "PA-70": [POL.changeRelease],
  "PA-71": [POL.backgroundScreening],
  "PA-72": [POL.physicalSecurity],
  "PA-73": [POL.retention],
  "PA-74": [POL.retention],
  "PA-75": [POL.incidentResponse],
  "PA-76": [POL.physicalSecurity],
  "PA-77": [POL.changeRelease],
  "PA-78": [POL.encryption],
  "PA-79": [POL.dataClassification],
  "PA-80": [POL.dataClassification],
  "PA-81": [POL.dataClassification],
  "PA-82": [POL.retention],
  "PA-83": [POL.retention],
  "PA-84": [POL.logging],
  "PA-85": [POL.bcdr],
  "PA-86": [POL.bcdr],
  "PA-87": [POL.bcdr],
  "PA-88": [POL.bcdr],
  "PA-89": [POL.physicalSecurity],
  "PA-90": [POL.physicalSecurity],
};

// ── Control → Task mapping (existing tasks use TASK.*, new ones use key) ──

const CONTROL_TASKS: Record<string, string[]> = {
  "PA-1":  [TASK.boardMeetings],
  "PA-2":  [TASK.boardMeetings, TASK.employeeDesc],
  "PA-3":  [TASK.boardMeetings],
  "PA-5":  [TASK.orgChart],
  "PA-8":  ["policyReview"],
  "PA-9":  [TASK.incidentResponse],
  "PA-10": [TASK.sysDescription],
  "PA-11": [TASK.contactInfo],
  "PA-12": [TASK.publicPolicies],
  "PA-14": ["vendorReview"],
  "PA-21": [TASK.backupLogs],
  "PA-22": [TASK.infraInventory],
  "PA-23": [TASK.employeeAccess],
  "PA-24": [TASK.employeeAccess],
  "PA-25": [TASK.employeeAccess],
  "PA-27": [TASK.employeeAccess],
  "PA-28": [TASK.employeeAccess],
  "PA-29": [TASK.employeeAccess],
  "PA-30": [TASK.employeeAccess],
  "PA-31": [TASK.employeeAccess],
  "PA-32": [TASK.rbac],
  "PA-33": [TASK.employeeAccess],
  "PA-34": [TASK.twoFA],
  "PA-35": [TASK.officeAccess],
  "PA-36": [TASK.monitoring],
  "PA-37": [TASK.monitoring],
  "PA-40": [TASK.perfEvals],
  "PA-41": [TASK.boardMeetings],
  "PA-42": [TASK.secureCode],
  "PA-43": [TASK.monitoring],
  "PA-44": [TASK.codeChanges],
  "PA-45": [TASK.backupTest],
  "PA-46": ["riskAssessment"],
  "PA-47": ["vendorReview"],
  "PA-48": ["penTest"],
  "PA-50": [TASK.encryptionAtRest],
  "PA-51": [TASK.twoFA],
  "PA-52": [TASK.tlsHttps],
  "PA-53": [TASK.diagramming],
  "PA-54": [TASK.accessReview],
  "PA-55": [TASK.monitoring],
  "PA-56": [TASK.tlsHttps],
  "PA-57": [TASK.firewall],
  "PA-58": [TASK.firewall],
  "PA-61": [TASK.deviceList],
  "PA-62": [TASK.secureDevices],
  "PA-63": [TASK.irTabletop],
  "PA-64": [TASK.employeeVerify],
  "PA-69": ["secTraining"],
  "PA-70": [TASK.codeChanges],
  "PA-71": [TASK.employeeAccess],
  "PA-72": [TASK.visitorControl],
  "PA-75": [TASK.incidentResponse],
  "PA-76": [TASK.officeAccess],
  "PA-77": [TASK.publicPolicies],
  "PA-80": [TASK.sepEnvs],
  "PA-84": [TASK.monitoring],
  "PA-85": [TASK.backupLogs],
  "PA-86": [TASK.backupLogs],
  "PA-87": [TASK.backupLogs],
  "PA-88": [TASK.backupTest],
  "PA-89": [TASK.monitoring],
  "PA-90": [TASK.secureStorage],
};

// ── Control → Document types ───────────────────────────────────────

const CONTROL_DOCTYPES: Record<string, string[]> = {
  "PA-1":  ["board_meeting"],
  "PA-2":  ["board_meeting"],
  "PA-3":  ["board_meeting", "meeting"],
  "PA-4":  ["it_leadership_meeting"],
  "PA-6":  ["it_leadership_meeting"],
  "PA-7":  ["whistleblower_report"],
  "PA-9":  ["tabletop_exercise"],
  "PA-19": ["access_request", "rbac_matrix"],
  "PA-22": ["infrastructure_inventory", "network_diagram"],
  "PA-23": ["rbac_matrix"],
  "PA-24": ["rbac_matrix"],
  "PA-25": ["rbac_matrix"],
  "PA-27": ["rbac_matrix"],
  "PA-28": ["rbac_matrix"],
  "PA-29": ["rbac_matrix", "network_diagram"],
  "PA-30": ["rbac_matrix"],
  "PA-31": ["rbac_matrix"],
  "PA-32": ["rbac_matrix", "access_request"],
  "PA-33": ["rbac_matrix"],
  "PA-35": ["access_request"],
  "PA-40": ["employee_performance_evaluation"],
  "PA-41": ["board_meeting", "meeting"],
  "PA-44": ["it_leadership_meeting"],
  "PA-45": ["tabletop_exercise"],
  "PA-46": ["risk_committee_meeting", "whistleblower_report"],
  "PA-47": ["infrastructure_inventory"],
  "PA-48": ["penetration_test"],
  "PA-53": ["network_diagram"],
  "PA-54": ["rbac_matrix", "access_request"],
  "PA-57": ["meeting"],
  "PA-60": ["infrastructure_inventory"],
  "PA-61": ["infrastructure_inventory"],
  "PA-63": ["tabletop_exercise", "meeting"],
  "PA-70": ["infrastructure_inventory"],
  "PA-71": ["access_request"],
  "PA-73": ["infrastructure_inventory"],
  "PA-76": ["access_request"],
  "PA-84": ["infrastructure_inventory"],
};

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  // Fetch control name → id mapping
  console.log("Fetching controls...");
  const controls = await apiRequest<ControlTemplate[]>("/control-template", {
    query: { frameworkId: FRAMEWORK_ID, take: 200 },
  });
  const ctlMap = new Map<string, string>();
  for (const c of controls) ctlMap.set(c.name, c.id);
  console.log(`Found ${ctlMap.size} controls\n`);

  // ── Create new tasks ──
  console.log("--- Creating new tasks ---");
  const newTaskIds = new Map<string, string>();
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
    newTaskIds.set(t.key, task.id);
    console.log(`  ${t.key} -> ${task.id}`);
  }

  // Link framework to new tasks
  for (const [key, taskId] of newTaskIds) {
    await withRetry(
      () => apiRequest(`/framework/${FRAMEWORK_ID}/link-task/${taskId}`, { method: "POST" }),
      `link framework to task ${key}`,
    );
  }

  // Resolve task ID (existing ID or newly created key)
  function resolveTaskId(ref: string): string {
    if (ref.startsWith("frk_tt_")) return ref;
    const id = newTaskIds.get(ref);
    if (!id) throw new Error(`Unknown task key: ${ref}`);
    return id;
  }

  // ── Link policies to controls ──
  const policyEntries = Object.entries(CONTROL_POLICIES);
  console.log(`\n--- Linking policies to ${policyEntries.length} controls ---`);
  let polLinks = 0;

  for (const [ctlName, policyIds] of policyEntries) {
    const ctlId = ctlMap.get(ctlName);
    if (!ctlId) { console.warn(`  Control ${ctlName} not found`); continue; }

    for (const polId of policyIds) {
      await withRetry(
        () => apiRequest(`/control-template/${ctlId}/policy-templates/${polId}`, { method: "POST" }),
        `link ${ctlName} to policy`,
      );
      polLinks++;
    }
  }
  console.log(`  Linked ${polLinks} policy-control pairs`);

  // ── Link tasks to controls ──
  const taskEntries = Object.entries(CONTROL_TASKS);
  console.log(`\n--- Linking tasks to ${taskEntries.length} controls ---`);
  let taskLinks = 0;

  for (const [ctlName, taskRefs] of taskEntries) {
    const ctlId = ctlMap.get(ctlName);
    if (!ctlId) { console.warn(`  Control ${ctlName} not found`); continue; }

    for (const ref of taskRefs) {
      const taskId = resolveTaskId(ref);
      await withRetry(
        () => apiRequest(`/control-template/${ctlId}/task-templates/${taskId}`, { method: "POST" }),
        `link ${ctlName} to task`,
      );
      taskLinks++;
    }
  }
  console.log(`  Linked ${taskLinks} task-control pairs`);

  // ── Set document types on controls ──
  const docEntries = Object.entries(CONTROL_DOCTYPES);
  console.log(`\n--- Setting document types on ${docEntries.length} controls ---`);

  for (const [ctlName, docTypes] of docEntries) {
    const ctlId = ctlMap.get(ctlName);
    if (!ctlId) { console.warn(`  Control ${ctlName} not found`); continue; }

    await withRetry(
      () =>
        apiRequest<ControlTemplate>(`/control-template/${ctlId}`, {
          method: "PATCH",
          body: { documentTypes: docTypes },
        }),
      `set doc types on ${ctlName}`,
    );
  }
  console.log(`  Updated ${docEntries.length} controls`);

  // ── Link existing policies and tasks to framework ──
  console.log("\n--- Linking policies to framework ---");
  const allPolicyIds = new Set(Object.values(CONTROL_POLICIES).flat());
  for (const polId of allPolicyIds) {
    await withRetry(
      () => apiRequest(`/framework/${FRAMEWORK_ID}/link-policy/${polId}`, { method: "POST" }),
      "link policy to framework",
    );
  }
  console.log(`  Linked ${allPolicyIds.size} policies`);

  console.log("\n--- Linking tasks to framework ---");
  const allTaskIds = new Set(
    Object.values(CONTROL_TASKS)
      .flat()
      .map((ref) => resolveTaskId(ref)),
  );
  for (const taskId of allTaskIds) {
    await withRetry(
      () => apiRequest(`/framework/${FRAMEWORK_ID}/link-task/${taskId}`, { method: "POST" }),
      "link task to framework",
    );
  }
  console.log(`  Linked ${allTaskIds.size} tasks`);

  console.log("\nDone!");
  console.log(`  Policies linked: ${polLinks}`);
  console.log(`  Tasks linked: ${taskLinks}`);
  console.log(`  Document types set: ${docEntries.length} controls`);
  console.log(`  New tasks created: ${newTaskIds.size}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

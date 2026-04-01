/**
 * Deletes all controls from the framework and recreates them with correct:
 * - Requirement links (from CSV)
 * - Policy links (per-control, NOT framework-level)
 * - Task links (per-control, NOT framework-level)
 * - Document types
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { apiRequest } from "../src/lib/api-client.js";
import type { ControlTemplate, Requirement, TaskTemplate } from "../src/types.js";

const ROOT = resolve(import.meta.dir, "..");
const CSV_PATH = resolve(ROOT, "prescient.csv");
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

// ── CSV parsing (same as import script) ────────────────────────────

function parseCSV(raw: string): string[][] {
  const content = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i]!;
    if (inQuotes) {
      if (ch === '"' && content[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else if (ch === '"') { inQuotes = true; }
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else { field += ch; }
  }
  if (field || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function parseTrustIds(trustIdField: string): string[] {
  return trustIdField.split(",").map(s => s.trim().replace(/\s+/g, " "))
    .filter(s => /^(CC|A|C)\s*\d+\.\d+$/.test(s))
    .map(s => s.replace(/^(CC|A|C)(\d)/, "$1 $2"));
}

// ── Policy IDs ─────────────────────────────────────────────────────

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

// ── Task IDs (existing + newly created) ────────────────────────────

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
  // New tasks created in previous run
  riskAssessment: "frk_tt_69cd2fa67c4d81193696d9c4",
  vendorReview: "frk_tt_69cd2fa6b0699d538fd8cab2",
  penTest: "frk_tt_69cd2fa7717c94850d51a639",
  secTraining: "frk_tt_69cd2fa8101cb6f449b2b384",
  policyReview: "frk_tt_69cd2fa8f43ea0603c18eacb",
};

// ── Control mappings ───────────────────────────────────────────────

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

const CONTROL_TASKS: Record<string, string[]> = {
  "PA-1":  [TASK.boardMeetings],
  "PA-2":  [TASK.boardMeetings, TASK.employeeDesc],
  "PA-3":  [TASK.boardMeetings],
  "PA-5":  [TASK.orgChart],
  "PA-8":  [TASK.policyReview],
  "PA-9":  [TASK.incidentResponse],
  "PA-10": [TASK.sysDescription],
  "PA-11": [TASK.contactInfo],
  "PA-12": [TASK.publicPolicies],
  "PA-14": [TASK.vendorReview],
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
  "PA-46": [TASK.riskAssessment],
  "PA-47": [TASK.vendorReview],
  "PA-48": [TASK.penTest],
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
  "PA-69": [TASK.secTraining],
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
  // Parse CSV for requirement data
  console.log("Parsing CSV...");
  const csvContent = readFileSync(CSV_PATH, "utf-8");
  const allRows = parseCSV(csvContent);
  const headerIdx = allRows.findIndex(row => row[0]?.trim() === "Control ID");
  if (headerIdx === -1) throw new Error("Could not find header row");
  const dataRows = allRows.slice(headerIdx + 1).filter(row => row[0]?.trim().startsWith("PA-"));
  console.log(`Parsed ${dataRows.length} controls from CSV`);

  // Build requirement identifier → ID map
  const fw = await apiRequest<{ requirements: Requirement[] }>(`/framework/${FRAMEWORK_ID}`);
  const reqMap = new Map<string, string>();
  for (const r of fw.requirements || []) {
    if (r.identifier) reqMap.set(r.identifier, r.id);
  }
  console.log(`Found ${reqMap.size} requirements in framework`);

  // Delete existing controls
  console.log("\n--- Deleting existing controls ---");
  const existingCtls = await apiRequest<ControlTemplate[]>("/control-template", {
    query: { frameworkId: FRAMEWORK_ID, take: 200 },
  });
  for (let i = 0; i < existingCtls.length; i++) {
    await withRetry(
      () => apiRequest(`/control-template/${existingCtls[i]!.id}`, { method: "DELETE" }),
      `delete ${existingCtls[i]!.name}`,
    );
    if ((i + 1) % 10 === 0) console.log(`  Deleted ${i + 1}/${existingCtls.length}`);
  }
  console.log(`  Deleted ${existingCtls.length} controls`);

  // Recreate controls with all links
  console.log("\n--- Creating controls with all links ---");
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]!;
    const ctlName = row[0]!.trim();
    const trustIds = parseTrustIds(row[1] ?? "");
    const description = (row[3] ?? "").trim();
    const docTypes = CONTROL_DOCTYPES[ctlName] || [];

    // Create control (with doc types in body)
    const ctl = await withRetry(
      () => apiRequest<ControlTemplate>("/control-template", {
        method: "POST",
        body: { name: ctlName, description, documentTypes: docTypes },
      }),
      `create ${ctlName}`,
    );

    // Link requirements
    for (const trustId of trustIds) {
      const reqId = reqMap.get(trustId);
      if (reqId) {
        await withRetry(
          () => apiRequest(`/control-template/${ctl.id}/requirements/${reqId}`, { method: "POST" }),
          `${ctlName} -> req ${trustId}`,
        );
      }
    }

    // Link policies
    for (const polId of (CONTROL_POLICIES[ctlName] || [])) {
      await withRetry(
        () => apiRequest(`/control-template/${ctl.id}/policy-templates/${polId}`, { method: "POST" }),
        `${ctlName} -> policy`,
      );
    }

    // Link tasks
    for (const taskId of (CONTROL_TASKS[ctlName] || [])) {
      await withRetry(
        () => apiRequest(`/control-template/${ctl.id}/task-templates/${taskId}`, { method: "POST" }),
        `${ctlName} -> task`,
      );
    }

    console.log(`  [${i + 1}/${dataRows.length}] ${ctlName} -> ${ctl.id} (${trustIds.length} reqs, ${(CONTROL_POLICIES[ctlName] || []).length} pols, ${(CONTROL_TASKS[ctlName] || []).length} tasks, ${docTypes.length} docs)`);
  }

  console.log("\nDone!");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

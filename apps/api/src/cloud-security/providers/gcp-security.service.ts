import { Injectable, Logger } from '@nestjs/common';
import type { SecurityFinding } from '../cloud-security.service';
import { parseGcpPermissionError } from '../remediation-error.utils';

/** Full SCC finding structure with all useful fields. */
interface SCCFinding {
  name: string;
  category: string;
  severity: string;
  state: string;
  resourceName: string;
  description?: string;
  createTime: string;
  eventTime: string;
  externalUri?: string;
  nextSteps?: string;
  sourceProperties?: Record<string, unknown>;
  findingClass?: string;
  compliances?: Array<{
    standard: string;
    version: string;
    ids: string[];
  }>;
  parentDisplayName?: string;
}

interface SCCFindingResult {
  finding: SCCFinding;
  resource?: {
    name: string;
    projectDisplayName?: string;
    type?: string;
    displayName?: string;
  };
}

/** Map SCC category → our serviceId for grouping in the UI. */
const CATEGORY_TO_SERVICE: Record<string, string> = {
  // Cloud Storage
  PUBLIC_BUCKET_ACL: 'cloud-storage',
  BUCKET_POLICY_ONLY_DISABLED: 'cloud-storage',
  BUCKET_LOGGING_DISABLED: 'cloud-storage',
  BUCKET_LOCK_DISABLED: 'cloud-storage',
  BUCKET_CMEK_DISABLED: 'cloud-storage',
  // Compute / VPC
  OPEN_FIREWALL: 'vpc-network',
  OPEN_SSH_PORT: 'vpc-network',
  OPEN_RDP_PORT: 'vpc-network',
  FIREWALL_RULE_LOGGING_DISABLED: 'vpc-network',
  FLOW_LOGS_DISABLED: 'vpc-network',
  DEFAULT_SERVICE_ACCOUNT_USED: 'compute-engine',
  COMPUTE_SECURE_BOOT_DISABLED: 'compute-engine',
  OS_LOGIN_DISABLED: 'compute-engine',
  PUBLIC_IP_ADDRESS: 'compute-engine',
  IP_FORWARDING_ENABLED: 'compute-engine',
  SERIAL_PORT_ENABLED: 'compute-engine',
  FULL_API_ACCESS: 'compute-engine',
  SHIELDED_VM_DISABLED: 'compute-engine',
  // IAM
  ADMIN_SERVICE_ACCOUNT: 'iam',
  MFA_NOT_ENFORCED: 'iam',
  OVER_PRIVILEGED_SERVICE_ACCOUNT_USER: 'iam',
  SERVICE_ACCOUNT_KEY_NOT_ROTATED: 'iam',
  USER_MANAGED_SERVICE_ACCOUNT_KEY: 'iam',
  NON_ORG_IAM_MEMBER: 'iam',
  OVER_PRIVILEGED_ACCOUNT: 'iam',
  PRIMITIVE_ROLES_USED: 'iam',
  KMS_ROLE_SEPARATION: 'iam',
  // Cloud SQL
  SQL_PUBLIC_IP: 'cloud-sql',
  SQL_NO_ROOT_PASSWORD: 'cloud-sql',
  SQL_CROSS_DB_OWNERSHIP_CHAINING: 'cloud-sql',
  SQL_LOCAL_INFILE: 'cloud-sql',
  SSL_NOT_ENFORCED: 'cloud-sql',
  AUTO_BACKUP_DISABLED: 'cloud-sql',
  SQL_CONTAINED_DATABASE_AUTHENTICATION: 'cloud-sql',
  SQL_LOG_DISCONNECTIONS_DISABLED: 'cloud-sql',
  SQL_LOG_CONNECTIONS_DISABLED: 'cloud-sql',
  SQL_LOG_ERROR_VERBOSITY: 'cloud-sql',
  SQL_LOG_MIN_MESSAGES: 'cloud-sql',
  SQL_LOG_MIN_DURATION_STATEMENT_ENABLED: 'cloud-sql',
  // GKE
  CLUSTER_PRIVATE_GOOGLE_ACCESS_DISABLED: 'gke',
  CLUSTER_SHIELDED_NODES_DISABLED: 'gke',
  LEGACY_AUTHORIZATION_ENABLED: 'gke',
  MASTER_AUTHORIZED_NETWORKS_DISABLED: 'gke',
  NETWORK_POLICY_DISABLED: 'gke',
  POD_SECURITY_POLICY_DISABLED: 'gke',
  PRIVATE_CLUSTER_DISABLED: 'gke',
  RELEASE_CHANNEL_DISABLED: 'gke',
  WEB_UI_ENABLED: 'gke',
  WORKLOAD_IDENTITY_DISABLED: 'gke',
  // KMS
  KMS_KEY_NOT_ROTATED: 'cloud-kms',
  KMS_PROJECT_HAS_OWNER: 'cloud-kms',
  // Logging / Monitoring
  AUDIT_LOGGING_DISABLED: 'cloud-logging',
  LOG_NOT_EXPORTED: 'cloud-logging',
  LOCKED_RETENTION_POLICY_NOT_SET: 'cloud-logging',
  AUDIT_CONFIG_NOT_MONITORED: 'cloud-monitoring',
  CUSTOM_ROLE_NOT_MONITORED: 'cloud-monitoring',
  FIREWALL_NOT_MONITORED: 'cloud-monitoring',
  NETWORK_NOT_MONITORED: 'cloud-monitoring',
  ROUTE_NOT_MONITORED: 'cloud-monitoring',
  SQL_INSTANCE_NOT_MONITORED: 'cloud-monitoring',
  // DNS
  DNSSEC_DISABLED: 'cloud-dns',
  RSASHA1_FOR_SIGNING: 'cloud-dns',
  // BigQuery
  DATASET_CMEK_DISABLED: 'bigquery',
  PUBLIC_DATASET: 'bigquery',
  // Pub/Sub
  PUBSUB_CMEK_DISABLED: 'pubsub',
  // Cloud Armor / Load Balancing
  SSL_POLICY_WEAK: 'cloud-armor',
};

/** Human-readable service names for UI grouping. */
const SERVICE_NAMES: Record<string, string> = {
  'cloud-storage': 'Cloud Storage',
  'vpc-network': 'VPC Network',
  'compute-engine': 'Compute Engine',
  iam: 'IAM',
  'cloud-sql': 'Cloud SQL',
  gke: 'GKE',
  'cloud-kms': 'Cloud KMS',
  'cloud-logging': 'Cloud Logging',
  'cloud-monitoring': 'Cloud Monitoring',
  'cloud-dns': 'Cloud DNS',
  bigquery: 'BigQuery',
  pubsub: 'Pub/Sub',
  'cloud-armor': 'Cloud Armor',
  'vertex-ai': 'Vertex AI',
  'security-command-center': 'Security Command Center',
};

/** Map GCP API service names → our service category IDs. */
const GCP_API_TO_SERVICE: Record<string, string[]> = {
  'storage.googleapis.com': ['cloud-storage'],
  'storage-component.googleapis.com': ['cloud-storage'],
  'compute.googleapis.com': ['compute-engine', 'vpc-network'],
  'securitycenter.googleapis.com': ['security-command-center'],
  'sqladmin.googleapis.com': ['cloud-sql'],
  'container.googleapis.com': ['gke'],
  'cloudkms.googleapis.com': ['cloud-kms'],
  'logging.googleapis.com': ['cloud-logging'],
  'monitoring.googleapis.com': ['cloud-monitoring'],
  'dns.googleapis.com': ['cloud-dns'],
  'bigquery.googleapis.com': ['bigquery'],
  'bigquerystorage.googleapis.com': ['bigquery'],
  'pubsub.googleapis.com': ['pubsub'],
  'networksecurity.googleapis.com': ['cloud-armor'],
  'iam.googleapis.com': ['iam'],
  'iamcredentials.googleapis.com': ['iam'],
  'aiplatform.googleapis.com': ['vertex-ai'],
  'notebooks.googleapis.com': ['vertex-ai'],
};

/**
 * GCP resource-type hosts that map to a Cloud Tests service, checked BEFORE the
 * finding category. SCC names AI detector categories inconsistently across
 * resources (Dataset/Model/Endpoint/Workbench, CMEK/access/policy, etc.), so
 * grouping by the authoritative resource type is far more robust than trying to
 * enumerate every category string. Any finding on an `aiplatform`/`notebooks`
 * resource is grouped under "Vertex AI".
 */
const RESOURCE_TYPE_HOST_TO_SERVICE: Array<[string, string]> = [
  ['aiplatform.googleapis.com', 'vertex-ai'],
  ['notebooks.googleapis.com', 'vertex-ai'],
];

/**
 * Resolve the Cloud Tests service ID for an SCC finding. Prefer the resource
 * type (authoritative) over the category, then fall back to the generic
 * Security Command Center bucket so nothing is ever dropped.
 */
export function resolveGcpServiceId(
  category: string,
  resourceType: string | undefined,
  resourceName: string | undefined,
): string {
  const haystack = `${resourceType ?? ''} ${resourceName ?? ''}`;
  for (const [host, service] of RESOURCE_TYPE_HOST_TO_SERVICE) {
    if (haystack.includes(host)) return service;
  }
  return CATEGORY_TO_SERVICE[category] ?? 'security-command-center';
}

export type GcpSetupStepId =
  | 'enable_security_command_center_api'
  | 'enable_cloud_resource_manager_api'
  | 'enable_service_usage_api'
  | 'grant_findings_viewer_role';

export type GcpSetupAdminAction =
  | { kind: 'link'; label: string; url: string }
  | { kind: 'command'; label: string; command: string };

export type GcpSetupResolveAction = {
  label: string;
  method: 'POST';
  endpoint: string;
  body: { stepId: GcpSetupStepId };
};

export type GcpSetupStep = {
  id: GcpSetupStepId;
  name: string;
  success: boolean;
  error?: string;
  actionUrl?: string;
  actionText?: string;
  requiredForScan: boolean;
  resolveAction?: GcpSetupResolveAction;
  adminActions?: GcpSetupAdminAction[];
};

const REQUIRED_GCP_API_STEPS: Array<{
  id: GcpSetupStepId;
  api: string;
  name: string;
  actionUrl: string;
  actionText: string;
  requiredForScan: boolean;
}> = [
  {
    id: 'enable_security_command_center_api',
    api: 'securitycenter.googleapis.com',
    name: 'Enable Security Command Center API',
    actionUrl:
      'https://console.cloud.google.com/apis/library/securitycenter.googleapis.com',
    actionText: 'Open API',
    requiredForScan: true,
  },
  {
    id: 'enable_cloud_resource_manager_api',
    api: 'cloudresourcemanager.googleapis.com',
    name: 'Enable Cloud Resource Manager API',
    actionUrl:
      'https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com',
    actionText: 'Open API',
    requiredForScan: false,
  },
  {
    id: 'enable_service_usage_api',
    api: 'serviceusage.googleapis.com',
    name: 'Enable Service Usage API',
    actionUrl:
      'https://console.cloud.google.com/apis/library/serviceusage.googleapis.com',
    actionText: 'Open API',
    requiredForScan: false,
  },
];

const FINDINGS_VIEWER_ACTION = {
  actionUrl: 'https://console.cloud.google.com/iam-admin/iam',
  actionText: 'Open IAM',
  requiredForScan: true,
};

@Injectable()
export class GCPSecurityService {
  private readonly logger = new Logger(GCPSecurityService.name);

  /**
   * One-click GCP setup: enable required APIs, detect user email,
   * and grant the Findings Viewer role at the organization level.
   * Returns status of each step so the frontend can show what succeeded/failed.
   */
  async autoSetup(params: {
    accessToken: string;
    organizationId: string;
    projectId: string;
  }): Promise<{
    email: string | null;
    steps: GcpSetupStep[];
  }> {
    const { accessToken, organizationId, projectId } = params;
    const steps: GcpSetupStep[] = [];
    const email = await this.detectEmail(accessToken);
    const hasFindingsAccess = organizationId
      ? await this.canReadFindings(accessToken, organizationId)
      : false;

    for (const stepDef of REQUIRED_GCP_API_STEPS) {
      let step = await this.runEnableApiSetupStep({
        stepDef,
        accessToken,
        projectId,
      });

      // If findings are already readable, SCC API access is effectively working for this org.
      if (
        stepDef.id === 'enable_security_command_center_api' &&
        !step.success &&
        hasFindingsAccess
      ) {
        step = {
          ...step,
          success: true,
          error: undefined,
        };
      }

      steps.push(step);
    }

    steps.push(
      await this.runGrantFindingsViewerSetupStep({
        accessToken,
        organizationId,
        email,
        hasFindingsAccess,
      }),
    );

    this.logger.log(
      `GCP auto-setup: ${steps.filter((s) => s.success).length}/${steps.length} steps succeeded`,
    );
    return { email, steps };
  }

  async resolveSetupStep(params: {
    stepId: GcpSetupStepId;
    accessToken: string;
    organizationId: string;
    projectId: string;
    email?: string | null;
  }): Promise<{ email: string | null; step: GcpSetupStep }> {
    const { stepId, accessToken, organizationId, projectId } = params;
    const email = params.email ?? (await this.detectEmail(accessToken));
    const hasFindingsAccess = organizationId
      ? await this.canReadFindings(accessToken, organizationId)
      : false;

    if (stepId === 'grant_findings_viewer_role') {
      return {
        email,
        step: await this.runGrantFindingsViewerSetupStep({
          accessToken,
          organizationId,
          email,
          hasFindingsAccess,
        }),
      };
    }

    const stepDef = REQUIRED_GCP_API_STEPS.find((s) => s.id === stepId);
    if (!stepDef) {
      throw new Error(`Unsupported GCP setup step: ${stepId}`);
    }

    let step = await this.runEnableApiSetupStep({
      stepDef,
      accessToken,
      projectId,
    });

    if (
      stepDef.id === 'enable_security_command_center_api' &&
      !step.success &&
      hasFindingsAccess
    ) {
      step = {
        ...step,
        success: true,
        error: undefined,
      };
    }

    return { email, step };
  }

  private async detectEmail(accessToken: string): Promise<string | null> {
    try {
      const resp = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (resp.ok) {
        const info = (await resp.json()) as { email?: string };
        return info.email ?? null;
      }
    } catch {
      this.logger.warn('Could not fetch user email');
    }
    return null;
  }

  private async runEnableApiSetupStep(params: {
    stepDef: (typeof REQUIRED_GCP_API_STEPS)[number];
    accessToken: string;
    projectId: string;
  }): Promise<GcpSetupStep> {
    const { stepDef, accessToken, projectId } = params;
    const actionUrl = this.getApiConsoleUrl(stepDef.api, projectId);

    try {
      const resp = await fetch(
        `https://serviceusage.googleapis.com/v1/projects/${projectId}/services/${stepDef.api}:enable`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: '{}',
        },
      );

      if (resp.ok || resp.status === 409) {
        return {
          id: stepDef.id,
          name: stepDef.name,
          success: true,
          actionUrl,
          actionText: stepDef.actionText,
          requiredForScan: stepDef.requiredForScan,
        };
      }

      const rawError = await resp.text();
      const message = this.getEnableApiErrorMessage(stepDef.api, rawError);
      const isPermissionError =
        resp.status === 403 ||
        /permission denied|does not have permission|forbidden|PERMISSION_DENIED/i.test(
          rawError,
        );

      if (isPermissionError) {
        const alreadyEnabled = await this.isApiAlreadyEnabled(
          accessToken,
          projectId,
          stepDef.api,
        );
        if (alreadyEnabled) {
          return {
            id: stepDef.id,
            name: stepDef.name,
            success: true,
            actionUrl,
            actionText: stepDef.actionText,
            requiredForScan: stepDef.requiredForScan,
          };
        }
      }

      return {
        id: stepDef.id,
        name: stepDef.name,
        success: false,
        error: message,
        actionUrl,
        actionText: stepDef.actionText,
        requiredForScan: stepDef.requiredForScan,
        adminActions: this.buildEnableApiAdminActions(
          stepDef,
          projectId,
          rawError,
          actionUrl,
        ),
      };
    } catch (err) {
      const rawError = err instanceof Error ? err.message : String(err);
      return {
        id: stepDef.id,
        name: stepDef.name,
        success: false,
        error: this.getEnableApiErrorMessage(stepDef.api, rawError),
        actionUrl,
        actionText: stepDef.actionText,
        requiredForScan: stepDef.requiredForScan,
        adminActions: this.buildEnableApiAdminActions(
          stepDef,
          projectId,
          rawError,
          actionUrl,
        ),
      };
    }
  }

  private async runGrantFindingsViewerSetupStep(params: {
    accessToken: string;
    organizationId: string;
    email: string | null;
    hasFindingsAccess?: boolean;
  }): Promise<GcpSetupStep> {
    const { accessToken, organizationId, email, hasFindingsAccess } = params;

    // If we can already read findings, required scan permission exists.
    // Don't fail setup just because this user cannot grant IAM roles.
    if (hasFindingsAccess) {
      return {
        id: 'grant_findings_viewer_role',
        name: 'Grant Findings Viewer role',
        success: true,
        ...FINDINGS_VIEWER_ACTION,
      };
    }

    if (!email) {
      return {
        id: 'grant_findings_viewer_role',
        name: 'Grant Findings Viewer role',
        success: false,
        error:
          'Could not identify your Google account email. Reconnect GCP and approve profile/email access.',
        ...FINDINGS_VIEWER_ACTION,
      };
    }

    if (!organizationId) {
      return {
        id: 'grant_findings_viewer_role',
        name: 'Grant Findings Viewer role',
        success: false,
        error: 'Organization ID not detected yet.',
        ...FINDINGS_VIEWER_ACTION,
      };
    }

    const adminActions = this.buildFindingsViewerAdminActions({
      organizationId,
      email,
    });

    try {
      const getPolicyResp = await fetch(
        `https://cloudresourcemanager.googleapis.com/v3/organizations/${organizationId}:getIamPolicy`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ options: { requestedPolicyVersion: 3 } }),
        },
      );

      if (!getPolicyResp.ok) {
        const rawError = await getPolicyResp.text();
        return {
          id: 'grant_findings_viewer_role',
          name: 'Grant Findings Viewer role',
          success: false,
          error: this.getFindingsViewerErrorMessage(rawError),
          ...FINDINGS_VIEWER_ACTION,
          adminActions,
        };
      }

      const policy = (await getPolicyResp.json()) as {
        version?: number;
        bindings?: Array<{ role: string; members: string[] }>;
        etag?: string;
      };

      const role = 'roles/securitycenter.findingsViewer';
      const member = `user:${email}`;
      const bindings = policy.bindings ?? [];
      const existing = bindings.find((b) => b.role === role);

      if (existing && existing.members.includes(member)) {
        return {
          id: 'grant_findings_viewer_role',
          name: 'Grant Findings Viewer role',
          success: true,
          ...FINDINGS_VIEWER_ACTION,
        };
      }

      if (existing) {
        existing.members.push(member);
      } else {
        bindings.push({ role, members: [member] });
      }

      const setPolicyResp = await fetch(
        `https://cloudresourcemanager.googleapis.com/v3/organizations/${organizationId}:setIamPolicy`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            policy: {
              version: policy.version ?? 3,
              bindings,
              ...(policy.etag ? { etag: policy.etag } : {}),
            },
            updateMask: 'bindings',
          }),
        },
      );

      if (setPolicyResp.ok) {
        return {
          id: 'grant_findings_viewer_role',
          name: 'Grant Findings Viewer role',
          success: true,
          ...FINDINGS_VIEWER_ACTION,
        };
      }

      const rawError = await setPolicyResp.text();
      return {
        id: 'grant_findings_viewer_role',
        name: 'Grant Findings Viewer role',
        success: false,
        error: this.getFindingsViewerErrorMessage(rawError),
        ...FINDINGS_VIEWER_ACTION,
        adminActions,
      };
    } catch (err) {
      const rawError = err instanceof Error ? err.message : String(err);
      return {
        id: 'grant_findings_viewer_role',
        name: 'Grant Findings Viewer role',
        success: false,
        error: this.getFindingsViewerErrorMessage(rawError),
        ...FINDINGS_VIEWER_ACTION,
        adminActions,
      };
    }
  }

  private buildEnableApiAdminActions(
    stepDef: (typeof REQUIRED_GCP_API_STEPS)[number],
    projectId: string,
    rawError?: string,
    actionUrl?: string,
  ): GcpSetupAdminAction[] {
    const actions: GcpSetupAdminAction[] = [
      {
        kind: 'link',
        label: stepDef.actionText,
        url: actionUrl ?? this.getApiConsoleUrl(stepDef.api, projectId),
      },
      {
        kind: 'command',
        label: `Copy: enable ${stepDef.api}`,
        command: `gcloud services enable ${stepDef.api} --project=${projectId}`,
      },
    ];

    if (rawError) {
      const permInfo = parseGcpPermissionError(rawError, projectId);
      if (permInfo.fixScript) {
        actions.push({
          kind: 'command',
          label: 'Copy: grant required project role',
          command: permInfo.fixScript,
        });
      }
    }

    return actions;
  }

  private getApiConsoleUrl(apiName: string, projectId: string): string {
    return `https://console.cloud.google.com/apis/library/${apiName}?project=${encodeURIComponent(projectId)}`;
  }

  private async isApiAlreadyEnabled(
    accessToken: string,
    projectId: string,
    apiName: string,
  ): Promise<boolean> {
    try {
      const resp = await fetch(
        `https://serviceusage.googleapis.com/v1/projects/${projectId}/services/${apiName}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!resp.ok) return false;

      const data = (await resp.json()) as { state?: string };
      return data.state === 'ENABLED';
    } catch {
      return false;
    }
  }

  private async canReadFindings(
    accessToken: string,
    organizationId: string,
  ): Promise<boolean> {
    try {
      const url = new URL(
        `https://securitycenter.googleapis.com/v2/organizations/${organizationId}/sources/-/findings`,
      );
      url.searchParams.set('pageSize', '1');
      url.searchParams.set('filter', 'state="ACTIVE"');

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private buildFindingsViewerAdminActions(params: {
    organizationId: string;
    email: string;
  }): GcpSetupAdminAction[] {
    const { organizationId, email } = params;
    return [
      {
        kind: 'link',
        label: FINDINGS_VIEWER_ACTION.actionText,
        url: FINDINGS_VIEWER_ACTION.actionUrl,
      },
      {
        kind: 'command',
        label: 'Copy: grant Findings Viewer role',
        command: [
          `gcloud organizations add-iam-policy-binding ${organizationId}`,
          `  --member='user:${email}'`,
          "  --role='roles/securitycenter.findingsViewer'",
        ].join(' \\\n'),
      },
    ];
  }

  private extractGcpError(raw: string): string {
    let message = raw;
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string } };
      message = parsed.error?.message ?? raw;
    } catch {
      message = raw;
    }
    return message
      .replace(/\s*Help Token:\s*[\w-]+/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 240);
  }

  private getEnableApiErrorMessage(apiName: string, raw: string): string {
    const message = this.extractGcpError(raw);

    if (
      /permission denied|does not have permission|forbidden|PERMISSION_DENIED/i.test(
        message,
      )
    ) {
      return `Your account cannot enable ${apiName}. Ask a project owner/editor to enable it.`;
    }

    return message || `Failed to enable ${apiName}.`;
  }

  private getFindingsViewerErrorMessage(raw: string): string {
    const message = this.extractGcpError(raw);

    if (
      /getIamPolicy|resourcemanager\.organizations\.getIamPolicy/i.test(message)
    ) {
      return 'Your account cannot read organization IAM policy. Ask a GCP organization admin to grant roles/securitycenter.findingsViewer.';
    }

    if (
      /setIamPolicy|resourcemanager\.organizations\.setIamPolicy/i.test(message)
    ) {
      return 'Your account cannot grant org IAM roles. Ask a GCP organization admin to grant roles/securitycenter.findingsViewer.';
    }

    if (
      /permission denied|does not have permission|forbidden|PERMISSION_DENIED/i.test(
        message,
      )
    ) {
      return 'Your account does not have organization IAM permissions required for auto-setup. Ask a GCP organization admin to grant roles/securitycenter.findingsViewer.';
    }

    return (
      message ||
      'Unable to grant Findings Viewer role automatically. Ask a GCP organization admin to grant roles/securitycenter.findingsViewer.'
    );
  }

  /**
   * Auto-detect GCP organizations accessible by the OAuth token.
   */
  async detectOrganizations(
    accessToken: string,
  ): Promise<Array<{ id: string; displayName: string }>> {
    // v3 search API — works for listing all orgs the user has access to
    const response = await fetch(
      'https://cloudresourcemanager.googleapis.com/v3/organizations:search',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.warn(`Failed to search GCP organizations: ${errorText}`);
      return [];
    }

    const data = await response.json();
    const orgs = (data.organizations ?? []) as Array<{
      name: string;
      displayName?: string;
      state?: string;
    }>;

    return orgs
      .filter((o) => o.state === 'ACTIVE')
      .map((o) => ({
        // name is "organizations/123456"
        id: o.name.replace('organizations/', ''),
        displayName: o.displayName ?? o.name,
      }));
  }

  /**
   * Detect active GCP projects scoped to a specific organization.
   * Returns:
   *  - projects whose IMMEDIATE parent is the given org ID, AND
   *  - projects nested inside any folder the user has access to.
   *
   * Background: GCP's `v1/projects` list endpoint does not support a
   * "descendants of org" query — `parent.id:<org>` only matches direct
   * children, so customers whose production projects live under a
   * folder (org → folder → project, a common SOC2-friendly layout)
   * never see those projects in our picker. We compensate by also
   * listing every accessible folder-nested project; the user's IAM
   * scope already limits what they can see.
   */
  async detectProjectsForOrg(
    accessToken: string,
    organizationId: string,
  ): Promise<Array<{ id: string; name: string; number: string }>> {
    // Two arms, isolated via Promise.allSettled so a failure on one
    // cannot blank the picker:
    //  1. Direct org children: existing behavior.
    //  2. Folder-nested projects, scoped to THIS org's folder tree:
    //     recursively enumerate folders under the org, then query
    //     each with `parent.type:folder AND parent.id:<folderId>`,
    //     which is GCP's documented happy path (uses the alternate
    //     consistent search index).
    //
    // The folder arm is properly org-scoped — a user with access to
    // projects in OTHER organizations will not see those projects
    // here. This honors the "ForOrg" contract.
    const [directResult, folderResult] = await Promise.allSettled([
      this.listProjectsPaginated(
        accessToken,
        `lifecycleState:ACTIVE AND parent.id:${organizationId}`,
      ),
      this.listProjectsInOrgFolderTree(accessToken, organizationId),
    ]);

    const directChildren =
      directResult.status === 'fulfilled' ? directResult.value : [];
    const folderNested =
      folderResult.status === 'fulfilled' ? folderResult.value : [];

    if (directResult.status === 'rejected') {
      this.logger.warn(
        `GCP detectProjectsForOrg(${organizationId}): direct arm threw — ${directResult.reason}`,
      );
    }
    if (folderResult.status === 'rejected') {
      this.logger.warn(
        `GCP detectProjectsForOrg(${organizationId}): folder arm threw — ${folderResult.reason}`,
      );
    }

    const seen = new Set<string>();
    const merged: Array<{ id: string; name: string; number: string }> = [];
    for (const p of [...directChildren, ...folderNested]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      merged.push(p);
    }

    this.logger.log(
      `GCP detectProjectsForOrg(${organizationId}): ${directChildren.length} direct + ${folderNested.length} folder-nested → ${merged.length} unique`,
    );
    return merged;
  }

  /**
   * Recursively enumerate all folders under an org, then list projects
   * inside each folder. The per-folder project query uses the paired
   * `parent.type:folder AND parent.id:<folderId>` filter, which is the
   * shape GCP explicitly documents for by-parent project queries
   * ("the filter must contain both a parent.type and a parent.id
   * restriction") and which triggers their alternate consistent index.
   *
   * Per-folder failures are isolated: if one folder's project list
   * fails (transient 5xx, permission edge case), the rest still
   * succeed.
   */
  private async listProjectsInOrgFolderTree(
    accessToken: string,
    organizationId: string,
  ): Promise<Array<{ id: string; name: string; number: string }>> {
    const { folderIds, forbidden } = await this.listFoldersUnderOrg(
      accessToken,
      organizationId,
    );

    // Verified in production logs (customer Propper, org 43356919874):
    // the `cloudresourcemanager.folders.list` endpoint returns
    // `403 PERMISSION_DENIED` for some OAuth grants even when the
    // user has `roles/owner` + `roles/resourcemanager.folderAdmin`
    // at the org level. When that happens, folder enumeration
    // returns an empty list and the precise per-folder query would
    // silently skip every folder-nested project — exactly the bug
    // Greg reported (propperai-prod, propperai-demo invisible in
    // the picker).
    //
    // The fallback below ONLY fires when enumeration was actually
    // forbidden, not when an org legitimately has zero folders.
    // (cubic P2 on PR #2916: the previous always-on fallback could
    // leak folder-nested projects from OTHER orgs in a multi-org
    // tenant whose selected org simply had no folders.)
    //
    // Forbidden case → broad `parent.type:folder` query catches
    // every folder-nested project the OAuth user can `projects.get`.
    // For single-org tenants this delivers the right set. For
    // multi-org tenants whose v3/folders is forbidden the fallback
    // may include projects from other accessible orgs — acceptable
    // because the picker is selection-based and the alternative is a
    // silently empty picker.
    if (folderIds.length === 0 && forbidden) {
      this.logger.warn(
        `GCP folder enumeration was forbidden for org ${organizationId}; falling back to broad parent.type:folder query`,
      );
      const fallback = await this.listProjectsPaginated(
        accessToken,
        'lifecycleState:ACTIVE AND parent.type:folder',
      ).catch((err) => {
        this.logger.warn(
          `GCP broad folder-projects fallback failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        return [];
      });
      this.logger.log(
        `GCP folder fallback for org ${organizationId}: ${fallback.length} project(s) via broad parent.type:folder query`,
      );
      return fallback;
    }

    if (folderIds.length === 0) {
      // No folders exist for this org AND no permission errors were
      // observed — return empty so a multi-org user doesn't see
      // folder-nested projects from unrelated orgs.
      return [];
    }

    // Bound the fan-out: an unbounded `Promise.all(folderIds.map(...))`
    // can trigger GCP rate limiting (`429 Too Many Requests`) on
    // tenants with many folders. Because `listProjectsPaginated`
    // returns the projects collected so far on a non-OK response, a
    // throttled folder query LOOKS like an empty folder to the caller
    // — silently truncating the picker with no visible error. A modest
    // concurrency limit avoids the problem entirely.
    const perFolder = await mapWithConcurrency(
      folderIds,
      FOLDER_QUERY_CONCURRENCY,
      (folderId) =>
        this.listProjectsPaginated(
          accessToken,
          `lifecycleState:ACTIVE AND parent.type:folder AND parent.id:${folderId}`,
        ).catch((err) => {
          this.logger.warn(
            `GCP folder ${folderId}: project list failed — ${err instanceof Error ? err.message : String(err)}`,
          );
          return [];
        }),
    );

    return perFolder.flat();
  }

  /**
   * Breadth-first walk of the folder tree under an organization.
   * Returns every folder ID the caller has visibility into, no matter
   * how deeply nested. Bounded by SAFE_MAX_FOLDERS to keep API usage
   * predictable in pathological cases.
   */
  private async listFoldersUnderOrg(
    accessToken: string,
    organizationId: string,
  ): Promise<{ folderIds: string[]; forbidden: boolean }> {
    const SAFE_MAX_FOLDERS = 500;

    const collected: string[] = [];
    const seenParents = new Set<string>();
    const queue: string[] = [`organizations/${organizationId}`];
    // Tracks whether ANY page in the BFS hit a 403 PERMISSION_DENIED.
    // Only true forbiddens trigger the broad-query fallback in the
    // caller; "no folders exist" must NOT trigger it.
    let forbidden = false;

    while (queue.length > 0 && collected.length < SAFE_MAX_FOLDERS) {
      const parent = queue.shift();
      if (!parent || seenParents.has(parent)) continue;
      seenParents.add(parent);

      const result = await this.listChildFolders(accessToken, parent);
      if (result.forbidden) forbidden = true;
      for (const folderId of result.folderIds) {
        if (collected.includes(folderId)) continue;
        collected.push(folderId);
        queue.push(`folders/${folderId}`);
        if (collected.length >= SAFE_MAX_FOLDERS) {
          this.logger.warn(
            `GCP folder enumeration: hit safety cap of ${SAFE_MAX_FOLDERS} folders for org ${organizationId}`,
          );
          break;
        }
      }
    }

    return { folderIds: collected, forbidden };
  }

  /**
   * One paginated call to `v3/folders?parent=<parent>` returning the
   * immediate child folder IDs (stripped of the "folders/" prefix).
   *
   * v3 was chosen over v2 because v2 is deprecated and was observed
   * returning `403 PERMISSION_DENIED` for OAuth grants that
   * legitimately had org-level folder permissions (verified in prod
   * logs against customer Propper). v3 is the current API and
   * accepts the same `parent`/`pageSize`/`pageToken` query params,
   * so this swap is purely defensive — the response shape is
   * identical.
   *
   * Errors are non-fatal — log and return what we collected so far so
   * one bad page doesn't kill the whole tree walk; the caller has a
   * broad-query fallback when enumeration comes back empty.
   */
  private async listChildFolders(
    accessToken: string,
    parent: string,
  ): Promise<{ folderIds: string[]; forbidden: boolean }> {
    const PAGE_SIZE = 100;
    const collected: string[] = [];
    let pageToken: string | undefined;
    let forbidden = false;

    do {
      const params = new URLSearchParams({
        parent,
        pageSize: String(PAGE_SIZE),
      });
      if (pageToken) params.set('pageToken', pageToken);

      const response = await fetch(
        `https://cloudresourcemanager.googleapis.com/v3/folders?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        // Distinguish "forbidden" (the caller should fall back to a
        // broader query) from "transient / no folders" (the caller
        // should NOT broaden — empty results are the correct answer).
        if (response.status === 403) forbidden = true;
        this.logger.warn(
          `Failed to list child folders of ${parent} (HTTP ${response.status}): ${await response.text()}`,
        );
        return { folderIds: collected, forbidden };
      }

      const data = (await response.json()) as {
        folders?: Array<{ name: string }>;
        nextPageToken?: string;
      };

      for (const f of data.folders ?? []) {
        // f.name has shape "folders/123456".
        const id = f.name.replace(/^folders\//, '');
        collected.push(id);
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    return { folderIds: collected, forbidden };
  }

  /**
   * Auto-detect active GCP projects accessible by the OAuth token.
   * Tries a direct project list first; if empty (common for org-centric accounts),
   * lists projects under each accessible organization (parent filter).
   */
  async detectProjects(
    accessToken: string,
  ): Promise<Array<{ id: string; name: string; number: string }>> {
    const direct = await this.listProjectsPaginated(
      accessToken,
      'lifecycleState:ACTIVE',
    );
    if (direct.length > 0) {
      this.logger.log(
        `GCP detectProjects: ${direct.length} project(s) via direct list`,
      );
      return direct;
    }

    const orgs = await this.detectOrganizations(accessToken);
    if (orgs.length === 0) {
      this.logger.warn(
        'GCP detectProjects: no projects from direct list and no organizations — Service Usage detection may be empty',
      );
      return [];
    }

    const seen = new Set<string>();
    const merged: Array<{ id: string; name: string; number: string }> = [];

    for (const org of orgs) {
      const underOrg = await this.listProjectsPaginated(
        accessToken,
        `lifecycleState:ACTIVE AND parent.id:${org.id}`,
      );
      for (const p of underOrg) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          merged.push(p);
        }
        if (merged.length >= 20) break;
      }
      if (merged.length >= 20) break;
    }

    if (merged.length > 0) {
      this.logger.log(
        `GCP detectProjects: ${merged.length} project(s) via organization scope`,
      );
    } else {
      this.logger.warn(
        'GCP detectProjects: organization-scoped list returned no projects — check resourcemanager.projects.list on the org',
      );
    }

    return merged;
  }

  /**
   * Paginated wrapper around GCP's `cloudresourcemanager.projects.list`.
   *
   * The v1 list endpoint paginates via `nextPageToken`. The previous
   * implementation requested a single page with `pageSize=50` and never
   * followed `nextPageToken`, which silently truncated the result for
   * any customer with more than ~50 accessible projects (large orgs,
   * accounts with many sandboxes/Gemini default projects, etc.) and
   * caused critical production projects to be missing from our picker.
   *
   * Behavior:
   *  - Follows `nextPageToken` until exhaustion.
   *  - Uses `pageSize=200` (well under GCP's 500 max) to keep
   *    round-trips low.
   *  - Stops at `SAFE_MAX_PROJECTS=1000` to bound API usage; if a
   *    customer legitimately has more accessible projects, they
   *    should narrow with a filter rather than load all of them in
   *    the picker.
   *  - On non-OK response from any page, logs and returns what was
   *    collected so far instead of throwing — matches the prior
   *    failure mode (UI gets best-effort results) and prevents one
   *    transient page error from blanking the whole picker.
   */
  private async listProjectsPaginated(
    accessToken: string,
    filter: string,
  ): Promise<Array<{ id: string; name: string; number: string }>> {
    const PAGE_SIZE = 200;
    const SAFE_MAX_PROJECTS = 1000;

    const collected: Array<{ id: string; name: string; number: string }> = [];
    let pageToken: string | undefined;
    let pages = 0;

    do {
      const params = new URLSearchParams({
        pageSize: String(PAGE_SIZE),
        filter,
      });
      if (pageToken) params.set('pageToken', pageToken);

      const response = await fetch(
        `https://cloudresourcemanager.googleapis.com/v1/projects?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        this.logger.warn(
          `Failed to list GCP projects (filter="${filter}", page=${pages + 1}, collected=${collected.length}): ${await response.text()}`,
        );
        return collected;
      }

      const data = (await response.json()) as {
        projects?: Array<{
          projectId: string;
          name: string;
          projectNumber: string;
        }>;
        nextPageToken?: string;
      };

      for (const p of data.projects ?? []) {
        collected.push({
          id: p.projectId,
          name: p.name,
          number: p.projectNumber,
        });
      }

      pageToken = data.nextPageToken;
      pages++;

      if (collected.length >= SAFE_MAX_PROJECTS) {
        this.logger.warn(
          `GCP projects: hit safety cap of ${SAFE_MAX_PROJECTS} for filter="${filter}" — consider a narrower filter if more results are needed`,
        );
        break;
      }
    } while (pageToken);

    return collected;
  }

  /**
   * Detect which GCP services the customer actually uses by querying
   * the Service Usage API for each project. Maps GCP API names to
   * our service category IDs.
   */
  async detectServices(
    accessToken: string,
    projects: Array<{ id: string }>,
  ): Promise<{
    services: string[];
    servicesByProject: Record<string, string[]>;
  }> {
    const detected = new Set<string>();
    const unmappedApis = new Set<string>();
    const servicesByProject: Record<string, string[]> = {};

    for (const project of projects) {
      const projectServices = new Set<string>();
      try {
        const response = await fetch(
          `https://serviceusage.googleapis.com/v1/projects/${encodeURIComponent(project.id)}/services?filter=state:ENABLED&pageSize=200`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        );

        if (!response.ok) {
          this.logger.warn(`Failed to list services for project ${project.id}`);
          continue;
        }

        const data = await response.json();
        const services = (data.services ?? []) as Array<{
          name: string;
          config?: { name: string };
        }>;

        for (const svc of services) {
          const apiName = svc.config?.name ?? svc.name.split('/').pop() ?? '';
          const mapped = GCP_API_TO_SERVICE[apiName];
          if (mapped) {
            for (const id of mapped) {
              detected.add(id);
              projectServices.add(id);
            }
          } else if (apiName.endsWith('.googleapis.com')) {
            unmappedApis.add(apiName);
          }
        }
      } catch (err) {
        this.logger.warn(
          `Service detection failed for ${project.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      servicesByProject[project.id] = [...projectServices];
    }

    if (detected.size === 0 && unmappedApis.size > 0) {
      this.logger.warn(
        `GCP Service Usage: ${unmappedApis.size} enabled API(s) had no UI mapping (sample): ${[...unmappedApis].slice(0, 8).join(', ')}`,
      );
    }

    this.logger.log(
      `Detected ${detected.size} GCP service categories: ${[...detected].join(', ')}`,
    );
    return { services: [...detected], servicesByProject };
  }

  /**
   * Scan GCP Security Command Center for all active findings.
   * Pulls rich data: description, remediation steps, compliance mappings, service grouping.
   */
  async scanSecurityFindings(
    credentials: Record<string, unknown>,
    variables: Record<string, unknown>,
    enabledServices?: string[],
  ): Promise<SecurityFinding[]> {
    const accessToken = credentials.access_token as string;
    const organizationId = variables.organization_id as string;

    if (!accessToken) {
      throw new Error('Access token is required');
    }

    // Read explicitly selected projects
    const projectIds: string[] = Array.isArray(variables.project_ids)
      ? (variables.project_ids as string[])
      : [];

    // If projects are selected, query per-project; otherwise fall back to org-level
    const scopes: Array<
      { type: 'project'; id: string } | { type: 'organization'; id: string }
    > =
      projectIds.length > 0
        ? projectIds.map((id) => ({ type: 'project' as const, id }))
        : organizationId
          ? [{ type: 'organization' as const, id: organizationId }]
          : [];

    if (scopes.length === 0) {
      this.logger.warn('GCP: No projects selected and no Organization ID');
      throw new Error(
        'GCP_ORG_MISSING: No projects selected and Organization ID not detected. Go to the GCP integration settings to configure.',
      );
    }

    const scopeLabel =
      projectIds.length > 0
        ? `${projectIds.length} project(s): ${projectIds.join(', ')}`
        : `org ${organizationId}`;
    this.logger.log(`Scanning GCP SCC for ${scopeLabel}`);

    const allFindings: SecurityFinding[] = [];
    const enabledServiceSet = enabledServices ? new Set(enabledServices) : null;
    const seenIds = new Set<string>();
    // Track per-scope outcomes so a scan where EVERY scope errored fails loudly
    // instead of silently returning [] (see the all-scopes-failed guard below).
    const successfulScopes = new Set<string>();
    const failedScopes = new Set<string>();
    let firstScopeError: Error | null = null;

    for (const scope of scopes) {
      try {
        let pageToken: string | undefined;
        do {
          const response = await this.fetchFindings(
            accessToken,
            scope,
            pageToken,
          );

          for (const result of response.findings) {
            const f = result.finding;
            // Deduplicate across project scopes
            if (seenIds.has(f.name)) continue;
            seenIds.add(f.name);

            const serviceId = resolveGcpServiceId(
              f.category,
              result.resource?.type,
              f.resourceName,
            );
            if (enabledServiceSet && !enabledServiceSet.has(serviceId)) {
              continue;
            }
            const findingKey = `gcp-${serviceId}-${f.category.toLowerCase().replace(/_/g, '-')}`;
            const remediation = this.buildRemediation(f);

            allFindings.push({
              id: f.name,
              title: this.formatTitle(f.category),
              description:
                f.description || `Security finding: ${f.category}`,
              severity: this.mapSeverity(f.severity),
              resourceType: result.resource?.type ?? 'gcp-resource',
              resourceId: f.resourceName,
              remediation,
              evidence: {
                findingKey,
                serviceId,
                serviceName: SERVICE_NAMES[serviceId] ?? serviceId,
                category: f.category,
                state: f.state,
                resourceName: f.resourceName,
                severity: f.severity,
                eventTime: f.eventTime,
                externalUri: f.externalUri,
                findingClass: f.findingClass,
                compliances: f.compliances,
                sourceProperties: f.sourceProperties,
                projectDisplayName: result.resource?.projectDisplayName,
                resourceDisplayName: result.resource?.displayName,
              },
              createdAt: f.createTime,
            });
          }

          pageToken = response.nextPageToken;
        } while (pageToken);
        successfulScopes.add(scope.id);
      } catch (err) {
        // Log and continue with the remaining scopes — one bad project must not
        // abort the others. But remember the failure: if EVERY scope fails we
        // surface it below instead of reporting a misleading "0 findings".
        const error = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(
          `GCP SCC query failed for ${scope.type} ${scope.id}: ${error.message}`,
        );
        failedScopes.add(scope.id);
        if (!firstScopeError) firstScopeError = error;
      }
    }

    // If every configured scope errored, fail the scan instead of returning [].
    // A silent [] is stored as a fresh "success" run with 0 findings, which
    // (a) hides the previous good results — the UI shows only the latest run —
    // and (b) makes reconciliation mark every prior finding as falsely
    // "resolved". Re-throw the underlying SCC error so its actionable message
    // (SCC_NOT_ACTIVATED / PERMISSION_DENIED / …) reaches the user. Mirrors the
    // AWS all-regions-failed guard in aws-security.service.ts.
    if (successfulScopes.size === 0 && failedScopes.size > 0) {
      throw (
        firstScopeError ??
        new Error(`All ${failedScopes.size} GCP scope(s) failed to scan`)
      );
    }

    this.logger.log(`Found ${allFindings.length} GCP security findings`);
    return allFindings;
  }

  private async fetchFindings(
    accessToken: string,
    scope: { type: 'organization' | 'project'; id: string },
    pageToken?: string,
  ): Promise<{ findings: SCCFindingResult[]; nextPageToken?: string }> {
    const parent =
      scope.type === 'project'
        ? `projects/${scope.id}`
        : `organizations/${scope.id}`;
    const url = new URL(
      `https://securitycenter.googleapis.com/v2/${parent}/sources/-/findings`,
    );
    url.searchParams.set('pageSize', '500');
    url.searchParams.set('filter', 'state="ACTIVE"');

    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`GCP SCC API error: ${errorText}`);

      if (errorText.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
        throw new Error(
          'OAuth scopes insufficient. Reconnect the GCP integration.',
        );
      }
      if (
        errorText.includes('SERVICE_DISABLED') ||
        errorText.includes('has not been used') ||
        errorText.includes('Security Command Center API')
      ) {
        throw new Error(
          'SCC_NOT_ACTIVATED: Security Command Center is not activated on your GCP organization. ' +
            'Enable it at https://console.cloud.google.com/security/command-center — the Standard tier is free.',
        );
      }
      if (
        errorText.includes('PERMISSION_DENIED') ||
        errorText.includes('403')
      ) {
        throw new Error(
          'Permission denied. Grant "Security Center Findings Viewer" role at the organization level.',
        );
      }

      if (errorText.includes('Security Command Center Legacy')) {
        throw new Error(
          'Security Command Center Legacy has been disabled by Google. ' +
            'Please activate the Standard or Premium tier in your GCP console: ' +
            'Security > Security Command Center > Settings.',
        );
      }

      if (errorText.includes('Security Command Center API has not been used')) {
        throw new Error(
          'The Security Command Center API is not enabled for this project. ' +
            'Enable it in the GCP console: APIs & Services > Enable APIs > Security Command Center API.',
        );
      }

      throw new Error(`GCP API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return {
      findings: data.listFindingsResults ?? [],
      nextPageToken: data.nextPageToken,
    };
  }

  /** Build remediation text from SCC's nextSteps + API context for AI auto-fix. */
  private buildRemediation(f: SCCFinding): string {
    const parts: string[] = [];

    if (f.nextSteps) {
      parts.push(f.nextSteps);
    }

    if (f.externalUri) {
      parts.push(`More info: ${f.externalUri}`);
    }

    if (f.compliances?.length) {
      const standards = f.compliances.map(
        (c) => `${c.standard} ${c.version} (${c.ids.join(', ')})`,
      );
      parts.push(`Compliance: ${standards.join('; ')}`);
    }

    return (
      parts.join('\n\n') ||
      `Review and remediate this ${f.category} finding in GCP Console.`
    );
  }

  /** Convert SCC SCREAMING_SNAKE_CASE category to readable title. */
  private formatTitle(category: string): string {
    return category
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  }

  private mapSeverity(gcpSeverity: string): SecurityFinding['severity'] {
    const map: Record<string, SecurityFinding['severity']> = {
      CRITICAL: 'critical',
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low',
    };
    return map[gcpSeverity] ?? 'medium';
  }
}

/**
 * Max simultaneous in-flight folder→projects queries when expanding an
 * organization's folder tree. GCP's `cloudresourcemanager` quota
 * (~600 read req/min/user) is well above this, but a small cap keeps us
 * comfortably below throttling thresholds even for tenants with deep
 * folder hierarchies, and prevents bursts that could starve other
 * concurrent GCP work on the same account.
 */
const FOLDER_QUERY_CONCURRENCY = 5;

/**
 * Map `items` through `fn` with at most `concurrency` promises in flight
 * at any moment. Preserves input order in the result array. No deps —
 * inlined here because the only call site is the GCP folder fan-out.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx]);
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

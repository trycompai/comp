import { Injectable, Logger } from '@nestjs/common';
import type { SecurityFinding } from '../cloud-security.service';

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
  'iam': 'IAM',
  'cloud-sql': 'Cloud SQL',
  'gke': 'GKE',
  'cloud-kms': 'Cloud KMS',
  'cloud-logging': 'Cloud Logging',
  'cloud-monitoring': 'Cloud Monitoring',
  'cloud-dns': 'Cloud DNS',
  'bigquery': 'BigQuery',
  'pubsub': 'Pub/Sub',
  'cloud-armor': 'Cloud Armor',
  'security-command-center': 'Security Command Center',
};

/** Map GCP API service names → our service category IDs. */
const GCP_API_TO_SERVICE: Record<string, string[]> = {
  'storage.googleapis.com': ['cloud-storage'],
  'storage-component.googleapis.com': ['cloud-storage'],
  'compute.googleapis.com': ['compute-engine', 'vpc-network'],
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
    steps: Array<{ name: string; success: boolean; error?: string }>;
  }> {
    const { accessToken, organizationId, projectId } = params;
    const steps: Array<{ name: string; success: boolean; error?: string }> = [];

    // Step 1: Get user email from OAuth token
    let email: string | null = null;
    try {
      const resp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (resp.ok) {
        const info = await resp.json() as { email?: string };
        email = info.email ?? null;
      }
    } catch {
      this.logger.warn('Could not fetch user email');
    }

    // Step 2: Enable required APIs
    const requiredApis = [
      'securitycenter.googleapis.com',
      'cloudresourcemanager.googleapis.com',
      'serviceusage.googleapis.com',
    ];

    for (const api of requiredApis) {
      try {
        const resp = await fetch(
          `https://serviceusage.googleapis.com/v1/projects/${projectId}/services/${api}:enable`,
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
          steps.push({ name: `Enable ${api.split('.')[0]}`, success: true });
        } else {
          const err = await resp.text();
          steps.push({ name: `Enable ${api.split('.')[0]}`, success: false, error: this.extractGcpError(err) });
        }
      } catch (err) {
        steps.push({
          name: `Enable ${api.split('.')[0]}`,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Step 3: Grant Security Center Findings Viewer role at org level
    if (email && organizationId) {
      try {
        // Get current IAM policy
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
          const err = await getPolicyResp.text();
          steps.push({ name: 'Grant Findings Viewer role', success: false, error: this.extractGcpError(err) });
        } else {
          const policy = await getPolicyResp.json() as {
            version?: number;
            bindings?: Array<{ role: string; members: string[] }>;
            etag?: string;
          };

          const role = 'roles/securitycenter.findingsViewer';
          const member = `user:${email}`;
          const bindings = policy.bindings ?? [];

          // Check if binding already exists
          const existing = bindings.find((b) => b.role === role);
          if (existing && existing.members.includes(member)) {
            steps.push({ name: 'Grant Findings Viewer role', success: true });
          } else {
            // Add the binding
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
                  policy: { ...policy, bindings, version: policy.version ?? 3 },
                  updateMask: 'bindings',
                }),
              },
            );

            if (setPolicyResp.ok) {
              steps.push({ name: 'Grant Findings Viewer role', success: true });
            } else {
              const err = await setPolicyResp.text();
              steps.push({ name: 'Grant Findings Viewer role', success: false, error: this.extractGcpError(err) });
            }
          }
        }
      } catch (err) {
        steps.push({
          name: 'Grant Findings Viewer role',
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    } else if (!email) {
      steps.push({ name: 'Grant Findings Viewer role', success: false, error: 'Could not detect your email address' });
    } else {
      steps.push({ name: 'Grant Findings Viewer role', success: false, error: 'Organization ID not detected yet' });
    }

    this.logger.log(`GCP auto-setup: ${steps.filter((s) => s.success).length}/${steps.length} steps succeeded`);
    return { email, steps };
  }

  private extractGcpError(raw: string): string {
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string } };
      return parsed.error?.message ?? raw.slice(0, 200);
    } catch {
      return raw.slice(0, 200);
    }
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
   * Auto-detect active GCP projects accessible by the OAuth token.
   */
  async detectProjects(
    accessToken: string,
  ): Promise<Array<{ id: string; name: string; number: string }>> {
    const response = await fetch(
      'https://cloudresourcemanager.googleapis.com/v1/projects?filter=lifecycleState:ACTIVE&pageSize=50',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      this.logger.warn(`Failed to list GCP projects`);
      return [];
    }

    const data = await response.json();
    return ((data.projects ?? []) as Array<{
      projectId: string;
      name: string;
      projectNumber: string;
    }>).map((p) => ({
      id: p.projectId,
      name: p.name,
      number: p.projectNumber,
    }));
  }

  /**
   * Detect which GCP services the customer actually uses by querying
   * the Service Usage API for each project. Maps GCP API names to
   * our service category IDs.
   */
  async detectServices(
    accessToken: string,
    projects: Array<{ id: string }>,
  ): Promise<string[]> {
    const detected = new Set<string>();

    for (const project of projects.slice(0, 5)) {
      try {
        const response = await fetch(
          `https://serviceusage.googleapis.com/v1/projects/${project.id}/services?filter=state:ENABLED&pageSize=200`,
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
            for (const id of mapped) detected.add(id);
          }
        }
      } catch (err) {
        this.logger.warn(
          `Service detection failed for ${project.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    this.logger.log(`Detected ${detected.size} GCP service categories: ${[...detected].join(', ')}`);
    return [...detected];
  }

  /**
   * Scan GCP Security Command Center for all active findings.
   * Pulls rich data: description, remediation steps, compliance mappings, service grouping.
   */
  async scanSecurityFindings(
    credentials: Record<string, unknown>,
    variables: Record<string, unknown>,
  ): Promise<SecurityFinding[]> {
    const accessToken = credentials.access_token as string;
    const organizationId = variables.organization_id as string;

    if (!accessToken) {
      throw new Error('Access token is required');
    }
    if (!organizationId) {
      this.logger.warn('GCP Organization ID not configured');
      throw new Error(
        'GCP_ORG_MISSING: Organization ID not detected. Go to the GCP integration settings to auto-detect your organization.',
      );
    }

    this.logger.log(`Scanning GCP SCC for org ${organizationId}`);

    const allFindings: SecurityFinding[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.fetchFindings(accessToken, organizationId, pageToken);

      for (const result of response.findings) {
        const f = result.finding;
        const serviceId = CATEGORY_TO_SERVICE[f.category] ?? 'security-command-center';
        const findingKey = `gcp-${serviceId}-${f.category.toLowerCase().replace(/_/g, '-')}`;

        // Build remediation text from SCC's nextSteps + our AI guidance hint
        const remediation = this.buildRemediation(f);

        allFindings.push({
          id: f.name,
          title: this.formatTitle(f.category),
          description: f.description || `Security finding: ${f.category}`,
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

    this.logger.log(`Found ${allFindings.length} GCP security findings`);
    return allFindings;
  }

  private async fetchFindings(
    accessToken: string,
    organizationId: string,
    pageToken?: string,
  ): Promise<{ findings: SCCFindingResult[]; nextPageToken?: string }> {
    const url = new URL(
      `https://securitycenter.googleapis.com/v2/organizations/${organizationId}/sources/-/findings`,
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
        throw new Error('OAuth scopes insufficient. Reconnect the GCP integration.');
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
      if (errorText.includes('PERMISSION_DENIED') || errorText.includes('403')) {
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
      const standards = f.compliances.map((c) => `${c.standard} ${c.version} (${c.ids.join(', ')})`);
      parts.push(`Compliance: ${standards.join('; ')}`);
    }

    return parts.join('\n\n') || `Review and remediate this ${f.category} finding in GCP Console.`;
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

import { Injectable, Logger } from '@nestjs/common';
import type { SecurityFinding } from '../cloud-security.service';
import {
  type AzureServiceAdapter,
  fetchAllPages,
  AZURE_CATEGORY_TO_SERVICE,
  AZURE_SERVICE_NAMES,
  AksAdapter,
  AppServiceAdapter,
  ContainerRegistryAdapter,
  CosmosDbAdapter,
  EntraIdAdapter,
  KeyVaultAdapter,
  MonitorAdapter,
  NetworkWatcherAdapter,
  PolicyAdapter,
  SqlDatabaseAdapter,
  StorageAccountAdapter,
  VirtualMachineAdapter,
} from './azure';

interface AzureSecurityAlert {
  name: string;
  properties: {
    alertDisplayName: string;
    description: string;
    severity: string;
    status: string;
    alertType: string;
    compromisedEntity?: string;
    intent?: string;
    startTimeUtc?: string;
    resourceIdentifiers?: unknown[];
    remediationSteps?: string[];
  };
}

interface AzureSecurityAssessment {
  name: string;
  properties: {
    displayName: string;
    status: { code: string; description?: string };
    metadata?: {
      severity?: string;
      description?: string;
      remediationDescription?: string;
      category?: string;
    };
    resourceDetails?: unknown;
  };
}

/** All implemented service adapters beyond Defender. */
const SERVICE_ADAPTERS: AzureServiceAdapter[] = [
  new AksAdapter(),
  new AppServiceAdapter(),
  new ContainerRegistryAdapter(),
  new CosmosDbAdapter(),
  new EntraIdAdapter(),
  new KeyVaultAdapter(),
  new MonitorAdapter(),
  new NetworkWatcherAdapter(),
  new PolicyAdapter(),
  new SqlDatabaseAdapter(),
  new StorageAccountAdapter(),
  new VirtualMachineAdapter(),
];

@Injectable()
export class AzureSecurityService {
  private readonly logger = new Logger(AzureSecurityService.name);

  async scanSecurityFindings(
    credentials: Record<string, unknown>,
    variables: Record<string, unknown>,
    enabledServices?: string[],
  ): Promise<SecurityFinding[]> {
    // OAuth flow: access_token from vault + subscription_id from variables
    const accessToken = credentials.access_token as string | undefined;
    const subscriptionId =
      (variables.subscription_id as string) ||
      (credentials.subscriptionId as string);

    // Legacy flow fallback: client credentials
    let token = accessToken;
    if (!token) {
      const tenantId = credentials.tenantId as string;
      const clientId = credentials.clientId as string;
      const clientSecret = credentials.clientSecret as string;
      if (tenantId && clientId && clientSecret) {
        token = await this.getAccessToken(tenantId, clientId, clientSecret);
      }
    }

    if (!token) {
      throw new Error(
        'Azure credentials missing. Please reconnect the integration.',
      );
    }

    if (!subscriptionId) {
      throw new Error(
        'AZURE_SUB_MISSING: Azure Subscription ID not configured. Run the Azure setup to auto-detect it.',
      );
    }

    this.logger.log(`Scanning Azure subscription ${subscriptionId}`);
    const findings: SecurityFinding[] = [];

    // 1. Defender alerts + assessments (always runs)
    if (!enabledServices || enabledServices.includes('defender')) {
      const defenderFindings = await this.scanDefender(token, subscriptionId);
      findings.push(...defenderFindings);
    }

    // 2. Run service adapters in parallel
    const adapterPromises = SERVICE_ADAPTERS.filter(
      (a) => !enabledServices || enabledServices.includes(a.serviceId),
    ).map(async (adapter) => {
      try {
        return await adapter.scan({ accessToken: token, subscriptionId });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Azure ${adapter.serviceId} scan failed: ${msg}`);
        return [];
      }
    });

    const adapterResults = await Promise.all(adapterPromises);
    for (const result of adapterResults) {
      findings.push(...result);
    }

    this.logger.log(`Azure scan complete: ${findings.length} total findings`);
    return findings;
  }

  /** Scan Defender for Cloud alerts and assessments. */
  private async scanDefender(
    accessToken: string,
    subscriptionId: string,
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    // Alerts
    try {
      const alerts = await this.getSecurityAlerts(accessToken, subscriptionId);
      const activeAlerts = alerts.filter(
        (a) => a.properties.status === 'Active',
      );
      this.logger.log(`Found ${activeAlerts.length} active security alerts`);

      for (const alert of activeAlerts) {
        findings.push({
          id: alert.name,
          title: alert.properties.alertDisplayName,
          description: alert.properties.description,
          severity: this.mapSeverity(alert.properties.severity),
          resourceType: 'security-alert',
          resourceId: alert.name,
          remediation:
            alert.properties.remediationSteps?.join('\n') ||
            'Review the alert in Microsoft Defender for Cloud',
          evidence: {
            serviceId: 'defender',
            serviceName: 'Microsoft Defender',
            findingKey: `azure-defender-alert-${alert.properties.alertType || alert.name}`,
            alertType: alert.properties.alertType,
            compromisedEntity: alert.properties.compromisedEntity,
            intent: alert.properties.intent,
            startTime: alert.properties.startTimeUtc,
          },
          createdAt: alert.properties.startTimeUtc || new Date().toISOString(),
        });
      }
    } catch (error) {
      this.handlePermissionError(
        findings,
        error,
        'Security Alerts',
        subscriptionId,
      );
    }

    // Assessments
    try {
      const assessments = await this.getSecurityAssessments(
        accessToken,
        subscriptionId,
      );
      const unhealthy = assessments.filter(
        (a) => a.properties.status.code === 'Unhealthy',
      );
      this.logger.log(
        `Found ${unhealthy.length} unhealthy security assessments`,
      );

      for (const assessment of unhealthy.slice(0, 50)) {
        const category = assessment.properties.metadata?.category;
        const serviceId =
          (category && AZURE_CATEGORY_TO_SERVICE[category]) || 'defender';

        findings.push({
          id: assessment.name,
          title:
            assessment.properties.displayName ||
            'Unhealthy security assessment',
          description:
            assessment.properties.metadata?.description ||
            assessment.properties.status.description ||
            'Security assessment failed',
          severity: this.mapSeverity(
            assessment.properties.metadata?.severity || 'Medium',
          ),
          resourceType: 'security-assessment',
          resourceId: assessment.name,
          remediation:
            assessment.properties.metadata?.remediationDescription ||
            'Review and remediate in Microsoft Defender for Cloud',
          evidence: {
            serviceId,
            serviceName: AZURE_SERVICE_NAMES[serviceId] ?? serviceId,
            findingKey: `azure-defender-assessment-${assessment.name}`,
            status: assessment.properties.status,
            category,
          },
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.handlePermissionError(
        findings,
        error,
        'Security Assessments',
        subscriptionId,
      );
    }

    return findings;
  }

  private handlePermissionError(
    findings: SecurityFinding[],
    error: unknown,
    component: string,
    subscriptionId: string,
  ): void {
    const msg = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Failed to fetch ${component}: ${msg}`);

    if (msg.includes('403') || msg.includes('AuthorizationFailed')) {
      findings.push({
        id: `permission-${component.toLowerCase().replace(/\s/g, '-')}-${subscriptionId}`,
        title: `Unable to access ${component}`,
        description: `The service principal does not have permission to read ${component.toLowerCase()}.`,
        severity: 'medium',
        resourceType: component.toLowerCase().replace(/\s/g, '-'),
        resourceId: subscriptionId,
        remediation:
          'Assign the "Security Reader" role to your App Registration on the subscription.',
        evidence: {
          serviceId: 'defender',
          serviceName: 'Microsoft Defender',
          error: msg,
        },
        createdAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Detect Azure subscriptions accessible by the user's OAuth token.
   */
  async detectSubscriptions(
    accessToken: string,
  ): Promise<Array<{ id: string; displayName: string; state: string }>> {
    const response = await fetch(
      'https://management.azure.com/subscriptions?api-version=2022-12-01',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list Azure subscriptions: ${error}`);
    }

    const data = (await response.json()) as {
      value: Array<{
        subscriptionId: string;
        displayName: string;
        state: string;
      }>;
    };

    return (data.value ?? [])
      .filter((s) => s.state === 'Enabled')
      .map((s) => ({
        id: s.subscriptionId,
        displayName: s.displayName,
        state: s.state,
      }));
  }

  /** Legacy: get access token via Service Principal client credentials. */
  async getAccessToken(
    tenantId: string,
    clientId: string,
    clientSecret: string,
  ): Promise<string> {
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://management.azure.com/.default',
      grant_type: 'client_credentials',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Azure authentication failed: ${error}`);
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }

  private async getSecurityAlerts(accessToken: string, subscriptionId: string) {
    return fetchAllPages<AzureSecurityAlert>(
      accessToken,
      `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Security/alerts?api-version=2022-01-01`,
    );
  }

  private async getSecurityAssessments(
    accessToken: string,
    subscriptionId: string,
  ) {
    return fetchAllPages<AzureSecurityAssessment>(
      accessToken,
      `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Security/assessments?api-version=2021-06-01`,
    );
  }

  private mapSeverity(azureSeverity: string): SecurityFinding['severity'] {
    const map: Record<string, SecurityFinding['severity']> = {
      High: 'high',
      Medium: 'medium',
      Low: 'low',
      Informational: 'info',
    };
    return map[azureSeverity] || 'medium';
  }
}

import { Injectable, Logger } from '@nestjs/common';
import type { SecurityFinding } from '../cloud-security.service';

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
    status: {
      code: string;
      description?: string;
    };
    metadata?: {
      severity?: string;
      description?: string;
      remediationDescription?: string;
      category?: string;
    };
    resourceDetails?: unknown;
  };
}

interface AzureListResponse<T> {
  value: T[];
  nextLink?: string;
}

@Injectable()
export class AzureSecurityService {
  private readonly logger = new Logger(AzureSecurityService.name);

  async scanSecurityFindings(
    credentials: Record<string, unknown>,
    _variables: Record<string, unknown>,
  ): Promise<SecurityFinding[]> {
    const tenantId = credentials.tenantId as string;
    const clientId = credentials.clientId as string;
    const clientSecret = credentials.clientSecret as string;
    const subscriptionId = credentials.subscriptionId as string;

    if (!tenantId || !clientId || !clientSecret || !subscriptionId) {
      throw new Error(
        'Azure credentials incomplete. Ensure tenantId, clientId, clientSecret, and subscriptionId are configured.',
      );
    }

    this.logger.log(`Scanning Azure subscription ${subscriptionId}`);

    // Get access token
    const accessToken = await this.getAccessToken(
      tenantId,
      clientId,
      clientSecret,
    );

    const findings: SecurityFinding[] = [];

    // Fetch security alerts
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
            alertType: alert.properties.alertType,
            compromisedEntity: alert.properties.compromisedEntity,
            intent: alert.properties.intent,
            startTime: alert.properties.startTimeUtc,
          },
          createdAt: alert.properties.startTimeUtc || new Date().toISOString(),
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to fetch security alerts: ${errorMsg}`);

      if (
        errorMsg.includes('403') ||
        errorMsg.includes('AuthorizationFailed')
      ) {
        findings.push({
          id: `permission-alerts-${subscriptionId}`,
          title: 'Unable to access Security Alerts',
          description:
            'The service principal does not have permission to read security alerts.',
          severity: 'medium',
          resourceType: 'security-alerts',
          resourceId: subscriptionId,
          remediation:
            'Assign the "Security Reader" role to your App Registration on the subscription.',
          evidence: { error: errorMsg },
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Fetch security assessments
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

      // Limit to 50 to avoid overwhelming
      for (const assessment of unhealthy.slice(0, 50)) {
        findings.push({
          id: assessment.name,
          title: assessment.properties.displayName,
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
            status: assessment.properties.status,
            category: assessment.properties.metadata?.category,
          },
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to fetch security assessments: ${errorMsg}`);

      if (
        errorMsg.includes('403') ||
        errorMsg.includes('AuthorizationFailed')
      ) {
        findings.push({
          id: `permission-assessments-${subscriptionId}`,
          title: 'Unable to access Security Assessments',
          description:
            'The service principal does not have permission to read security assessments.',
          severity: 'medium',
          resourceType: 'security-assessments',
          resourceId: subscriptionId,
          remediation:
            'Assign the "Security Reader" role to your App Registration on the subscription.',
          evidence: { error: errorMsg },
          createdAt: new Date().toISOString(),
        });
      }
    }

    this.logger.log(`Azure scan complete: ${findings.length} total findings`);
    return findings;
  }

  private async getAccessToken(
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

    const data = await response.json();
    return data.access_token;
  }

  private async getSecurityAlerts(
    accessToken: string,
    subscriptionId: string,
  ): Promise<AzureSecurityAlert[]> {
    const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Security/alerts?api-version=2022-01-01`;
    return this.fetchAllPages<AzureSecurityAlert>(accessToken, url);
  }

  private async getSecurityAssessments(
    accessToken: string,
    subscriptionId: string,
  ): Promise<AzureSecurityAssessment[]> {
    const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Security/assessments?api-version=2021-06-01`;
    return this.fetchAllPages<AzureSecurityAssessment>(accessToken, url);
  }

  private async fetchAllPages<T>(
    accessToken: string,
    initialUrl: string,
  ): Promise<T[]> {
    const results: T[] = [];
    let url: string | undefined = initialUrl;

    while (url) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Azure API error (${response.status}): ${error}`);
      }

      const data: AzureListResponse<T> = await response.json();
      results.push(...data.value);
      url = data.nextLink;
    }

    return results;
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

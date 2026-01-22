import { Injectable, Logger } from '@nestjs/common';
import type { SecurityFinding } from '../cloud-security.service';

interface GCPFindingResult {
  finding: {
    name: string;
    category: string;
    severity: string;
    state: string;
    resourceName: string;
    description?: string;
    createTime: string;
    eventTime: string;
  };
}

@Injectable()
export class GCPSecurityService {
  private readonly logger = new Logger(GCPSecurityService.name);

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
      throw new Error(
        'Organization ID is required. Configure it in the integration variables.',
      );
    }

    this.logger.log(
      `Scanning GCP Security Command Center for org ${organizationId}`,
    );

    const allFindings: SecurityFinding[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.fetchSecurityFindings(
        accessToken,
        organizationId,
        pageToken,
      );

      for (const result of response.findings) {
        const finding = result.finding;
        const severity = this.mapSeverity(finding.severity);

        allFindings.push({
          id: finding.name,
          title: finding.category,
          description:
            finding.description || `Security finding: ${finding.category}`,
          severity,
          resourceType: 'gcp-resource',
          resourceId: finding.resourceName,
          remediation:
            'Review and remediate this finding in GCP Security Command Centre',
          evidence: {
            findingName: finding.name,
            category: finding.category,
            state: finding.state,
            resourceName: finding.resourceName,
            severity: finding.severity,
            eventTime: finding.eventTime,
          },
          createdAt: finding.createTime,
        });
      }

      pageToken = response.nextPageToken;
    } while (pageToken);

    this.logger.log(`Found ${allFindings.length} GCP security findings`);
    return allFindings;
  }

  private async fetchSecurityFindings(
    accessToken: string,
    organizationId: string,
    pageToken?: string,
  ): Promise<{ findings: GCPFindingResult[]; nextPageToken?: string }> {
    const url = new URL(
      `https://securitycenter.googleapis.com/v2/organizations/${organizationId}/sources/-/findings`,
    );
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('filter', 'state="ACTIVE"');

    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`GCP API error: ${errorText}`);

      // Parse and provide helpful error messages
      if (errorText.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
        throw new Error(
          'OAuth scopes insufficient. Please disconnect and reconnect the GCP integration.',
        );
      }

      if (
        errorText.includes('PERMISSION_DENIED') ||
        errorText.includes('403')
      ) {
        throw new Error(
          'Permission denied. Grant the "Security Center Findings Viewer" role to your Google account at the organization level.',
        );
      }

      throw new Error(`GCP API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    return {
      findings: data.listFindingsResults || [],
      nextPageToken: data.nextPageToken,
    };
  }

  private mapSeverity(gcpSeverity: string): SecurityFinding['severity'] {
    const map: Record<string, SecurityFinding['severity']> = {
      CRITICAL: 'critical',
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low',
    };
    return map[gcpSeverity] || 'medium';
  }
}

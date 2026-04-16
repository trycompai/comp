import type { SecurityFinding } from '../../cloud-security.service';
import type { AzureServiceAdapter } from './azure-service-adapter';

interface PolicyStateSummary {
  results: {
    queryResultsTable: {
      rows: unknown[][];
      columns: Array<{ name: string; type: string }>;
    };
  };
  'policyAssignments@odata.count'?: number;
  policyAssignments?: Array<{
    policyAssignmentId: string;
    results: {
      nonCompliantResources: number;
      nonCompliantPolicies: number;
    };
  }>;
}

interface PolicySummaryResponse {
  value: Array<{
    policyAssignmentId: string;
    policyDefinitionId: string;
    results: {
      nonCompliantResources: number;
      nonCompliantPolicies: number;
      resourceDetails?: Array<{
        complianceState: string;
        count: number;
      }>;
    };
  }>;
}

export class PolicyAdapter implements AzureServiceAdapter {
  readonly serviceId = 'policy';

  async scan({
    accessToken,
    subscriptionId,
  }: {
    accessToken: string;
    subscriptionId: string;
  }): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    const baseUrl = 'https://management.azure.com';

    try {
      const response = await fetch(
        `${baseUrl}/subscriptions/${subscriptionId}/providers/Microsoft.PolicyInsights/policyStates/latest/summarize?api-version=2019-10-01`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const error = await response.text();
        if (error.includes('403') || error.includes('AuthorizationFailed')) {
          findings.push({
            id: `azure-policy-permission-${subscriptionId}`,
            title: 'Unable to Access Policy Compliance',
            description:
              'The service principal does not have permission to read policy states.',
            severity: 'medium',
            resourceType: 'policy',
            resourceId: subscriptionId,
            remediation:
              'Assign the "Reader" role to your App Registration on the subscription.',
            evidence: {
              serviceId: this.serviceId,
              serviceName: 'Azure Policy',
              findingKey: 'azure-policy-permission',
            },
            createdAt: new Date().toISOString(),
          });
          return findings;
        }
        throw new Error(`Azure Policy API error: ${error}`);
      }

      const data = (await response.json()) as {
        value: PolicySummaryResponse['value'];
      };
      const assignments = data.value ?? [];

      let totalNonCompliant = 0;
      const topOffenders: Array<{ id: string; count: number }> = [];

      for (const assignment of assignments) {
        const count = assignment.results.nonCompliantResources;
        if (count > 0) {
          totalNonCompliant += count;
          topOffenders.push({ id: assignment.policyAssignmentId, count });
        }
      }

      topOffenders.sort((a, b) => b.count - a.count);

      if (totalNonCompliant > 0) {
        findings.push({
          id: `azure-policy-noncompliant-${subscriptionId}`,
          title: 'Non-Compliant Resources Detected',
          description: `${totalNonCompliant} resource(s) across ${topOffenders.length} policy assignment(s) are non-compliant. Review and remediate compliance violations.`,
          severity: totalNonCompliant > 20 ? 'high' : 'medium',
          resourceType: 'policy-state',
          resourceId: subscriptionId,
          remediation:
            'Review non-compliant resources in Azure Policy and remediate or create exemptions for known exceptions.',
          evidence: {
            serviceId: this.serviceId,
            serviceName: 'Azure Policy',
            findingKey: 'azure-policy-non-compliant-resources',
            totalNonCompliant,
            topAssignments: topOffenders.slice(0, 5),
          },
          createdAt: new Date().toISOString(),
        });
      } else {
        findings.push({
          id: `azure-policy-compliant-${subscriptionId}`,
          title: 'Policy Compliance',
          description:
            'All resources are compliant with assigned Azure Policies.',
          severity: 'info',
          resourceType: 'policy-state',
          resourceId: subscriptionId,
          remediation: 'No action needed.',
          evidence: {
            serviceId: this.serviceId,
            serviceName: 'Azure Policy',
            findingKey: 'azure-policy-compliant',
          },
          createdAt: new Date().toISOString(),
          passed: true,
        });
      }

      // Check: No policies assigned at all
      if (assignments.length === 0) {
        findings.push({
          id: `azure-policy-none-${subscriptionId}`,
          title: 'No Azure Policies Assigned',
          description:
            'This subscription has no Azure Policy assignments. Consider applying security baseline policies.',
          severity: 'medium',
          resourceType: 'policy-state',
          resourceId: subscriptionId,
          remediation:
            'Assign the Azure Security Benchmark initiative or other security-focused policy sets.',
          evidence: {
            serviceId: this.serviceId,
            serviceName: 'Azure Policy',
            findingKey: 'azure-policy-no-assignments',
          },
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (!msg.includes('permission')) {
        throw error;
      }
    }

    return findings;
  }
}

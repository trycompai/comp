import type { SecurityFinding } from '../../cloud-security.service';
import type { AzureServiceAdapter } from './azure-service-adapter';
import { fetchAllPages } from './azure-service-adapter';

interface WebApp {
  id: string;
  name: string;
  location: string;
  kind: string; // 'app' | 'functionapp' | 'app,linux' etc.
  identity?: {
    type: string;
  };
  properties: {
    httpsOnly?: boolean;
    clientCertEnabled?: boolean;
    siteConfig?: {
      minTlsVersion?: string;
      ftpsState?: string;
      remoteDebuggingEnabled?: boolean;
      http20Enabled?: boolean;
      managedPipelineMode?: string;
    };
    state?: string;
  };
}

export class AppServiceAdapter implements AzureServiceAdapter {
  readonly serviceId = 'app-service';

  async scan({ accessToken, subscriptionId }: {
    accessToken: string;
    subscriptionId: string;
  }): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    const apps = await fetchAllPages<WebApp>(
      accessToken,
      `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Web/sites?api-version=2023-12-01`,
    );

    // Only check running apps
    const activeApps = apps.filter((a) => a.properties.state === 'Running');
    if (activeApps.length === 0) return findings;

    for (const app of activeApps) {
      const props = app.properties;
      const config = props.siteConfig;

      // Check 1: HTTPS-only
      if (props.httpsOnly !== true) {
        findings.push(this.finding(app, {
          key: 'https-disabled',
          title: `HTTPS Not Enforced: ${app.name}`,
          description: `App Service "${app.name}" does not enforce HTTPS-only traffic. HTTP requests are not redirected.`,
          severity: 'high',
          remediation: 'Enable "HTTPS Only" in the app TLS/SSL settings.',
        }));
      }

      // Check 2: TLS version
      if (config?.minTlsVersion && config.minTlsVersion < '1.2') {
        findings.push(this.finding(app, {
          key: 'tls-outdated',
          title: `Outdated TLS Version: ${app.name}`,
          description: `App Service "${app.name}" allows TLS versions below 1.2 (current: ${config.minTlsVersion}).`,
          severity: 'medium',
          remediation: 'Set minimum TLS version to 1.2 in the TLS/SSL settings.',
        }));
      }

      // Check 3: Remote debugging
      if (config?.remoteDebuggingEnabled === true) {
        findings.push(this.finding(app, {
          key: 'remote-debug',
          title: `Remote Debugging Enabled: ${app.name}`,
          description: `App Service "${app.name}" has remote debugging enabled. This opens additional ports and should only be used during development.`,
          severity: 'high',
          remediation: 'Disable remote debugging in the app configuration.',
        }));
      }

      // Check 4: FTPS state
      if (config?.ftpsState === 'AllAllowed') {
        findings.push(this.finding(app, {
          key: 'ftp-allowed',
          title: `FTP Access Allowed: ${app.name}`,
          description: `App Service "${app.name}" allows unencrypted FTP. Use FTPS or disable FTP entirely.`,
          severity: 'medium',
          remediation: 'Set FTPS state to "FtpsOnly" or "Disabled" in deployment settings.',
        }));
      }

      // Check 5: Managed identity
      const hasIdentity = app.identity?.type && app.identity.type !== 'None';
      if (!hasIdentity) {
        findings.push(this.finding(app, {
          key: 'no-managed-identity',
          title: `No Managed Identity: ${app.name}`,
          description: `App Service "${app.name}" does not use a managed identity. Use managed identities for secure authentication to Azure services.`,
          severity: 'low',
          remediation: 'Enable system-assigned or user-assigned managed identity.',
        }));
      }

      // Check 6: HTTP/2
      if (config?.http20Enabled === false) {
        findings.push(this.finding(app, {
          key: 'http2-disabled',
          title: `HTTP/2 Disabled: ${app.name}`,
          description: `App Service "${app.name}" does not have HTTP/2 enabled. HTTP/2 provides performance and security improvements.`,
          severity: 'info',
          remediation: 'Enable HTTP/2 in the app configuration for improved performance.',
        }));
      }
    }

    if (findings.length === 0) {
      findings.push({
        id: `azure-appservice-ok-${subscriptionId}`,
        title: 'App Service Security',
        description: `All ${activeApps.length} active App Service(s) are properly configured.`,
        severity: 'info',
        resourceType: 'app-service',
        resourceId: subscriptionId,
        remediation: 'No action needed.',
        evidence: { serviceId: this.serviceId, serviceName: 'App Service', findingKey: 'azure-app-service-all-ok' },
        createdAt: new Date().toISOString(),
        passed: true,
      });
    }

    return findings;
  }

  private finding(app: WebApp, opts: {
    key: string; title: string; description: string;
    severity: SecurityFinding['severity']; remediation: string;
  }): SecurityFinding {
    return {
      id: `azure-app-${opts.key}-${app.name}`,
      title: opts.title,
      description: opts.description,
      severity: opts.severity,
      resourceType: 'app-service',
      resourceId: app.id,
      remediation: opts.remediation,
      evidence: {
        serviceId: this.serviceId,
        serviceName: 'App Service',
        findingKey: `azure-app-service-${opts.key}`,
        appName: app.name,
        kind: app.kind,
        location: app.location,
      },
      createdAt: new Date().toISOString(),
    };
  }
}

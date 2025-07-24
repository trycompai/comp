import * as pulumi from '@pulumi/pulumi';
import { ApplicationConfig } from '../types';

export interface SSLValidationRecord {
  domain: string;
  name: pulumi.Output<string>;
  type: pulumi.Output<string>;
  value: pulumi.Output<string>;
}

export interface LoadBalancerInfo {
  app: string;
  loadBalancer: {
    albDnsName: pulumi.Output<string>;
    applicationUrl: pulumi.Output<string>;
  };
}

export interface DNSRecordOutput {
  purpose: string;
  type: string;
  name: string;
  value: string;
}

export function createDNSOutputs(
  applications: ApplicationConfig[],
  sslValidationRecords: SSLValidationRecord[],
  loadBalancers: LoadBalancerInfo[],
  projectName: string,
  enableHttps: boolean,
) {
  // Combined DNS Records - All records you need to create
  const allDnsRecords = pulumi
    .all([
      sslValidationRecords,
      Object.entries(
        applications.reduce(
          (acc, app) => {
            const hostname = app.routing?.hostnames?.[0];
            const loadBalancer = loadBalancers.find((lb) => lb.app === app.name)?.loadBalancer;

            if (hostname && loadBalancer) {
              acc[hostname] = loadBalancer.albDnsName;
            }
            return acc;
          },
          {} as Record<string, pulumi.Output<string>>,
        ),
      ),
    ])
    .apply(([validationRecords, domainRecords]) => {
      const records: DNSRecordOutput[] = [];

      // Add certificate validation records (AWS determines the type - usually CNAME)
      validationRecords.forEach((record) => {
        records.push({
          purpose: `SSL Certificate Validation for ${record.domain}`,
          type: record.type,
          name: record.name,
          value: record.value,
        });
      });

      // Add domain pointing records
      domainRecords.forEach(([hostname, albDns]) => {
        records.push({
          purpose: `Domain pointing for ${hostname}`,
          type: 'CNAME',
          name: hostname,
          value: albDns,
        });
      });

      return records;
    });

  return {
    allDnsRecords,
  };
}

export function createDeploymentInstructions(
  migrationProjectName: pulumi.Output<string>,
  sslValidationRecords: SSLValidationRecord[],
  enableHttps: boolean,
  projectName: string,
  applications: ApplicationConfig[],
  loadBalancers: LoadBalancerInfo[],
) {
  // Get application URLs directly from load balancers
  const applicationUrls = applications.reduce(
    (acc, app) => {
      const loadBalancer = loadBalancers.find((lb) => lb.app === app.name)?.loadBalancer;
      if (loadBalancer) {
        acc[app.name] = loadBalancer.applicationUrl;
      }
      return acc;
    },
    {} as Record<string, pulumi.Output<string>>,
  );

  return pulumi
    .all([
      migrationProjectName,
      sslValidationRecords.length > 0 ? 'SSL certificates created' : 'No SSL certificates needed',
      enableHttps ? 'HTTPS enabled' : 'HTTPS disabled',
      ...Object.values(applicationUrls),
    ])
    .apply(
      ([migrationProject, sslStatus, httpsStatus, ...urls]) => `
DEPLOYMENT INSTRUCTIONS
=======================

${
  sslValidationRecords.length > 0
    ? `
SIMPLIFIED DEPLOYMENT PROCESS:

1. DEPLOY: Initial infrastructure (HTTPS disabled)
   pulumi up
   
2. SETUP DNS: Create ALL required DNS records
   pulumi stack output allDnsRecords
   
   This shows all records you need to create in your DNS provider:
   - SSL certificate validation records (type: CNAME)
   - Domain pointing records (type: CNAME)
   
3. WAIT: 5-10 minutes for certificate validation
   
4. ENABLE HTTPS: Update configuration and redeploy
   pulumi config set ${projectName}:enableHttps true
   pulumi up

Current Status: ${httpsStatus}

ALTERNATIVE SINGLE-STEP:
- Set enableHttps=true from the start
- Deploy, setup DNS, wait, deploy again
`
    : `
SIMPLE DEPLOYMENT (No custom domains):
1. Deploy: pulumi up
2. Your apps are ready!
`
}

Database migrations: aws codebuild start-build --project-name ${migrationProject}
App deployments: Use the buildProject commands from applicationOutputs

Your applications will be available at:
${applications.map((app, i) => `   - ${app.name}: ${urls[i] || 'pending'}`).join('\n')}

DNS Setup:
   pulumi stack output allDnsRecords    # All DNS records needed
`,
    );
}

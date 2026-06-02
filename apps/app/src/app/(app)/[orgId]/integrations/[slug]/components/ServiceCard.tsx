'use client';

import { useConnectionServices } from '@/hooks/use-integration-platform';
import { ChevronRight } from '@trycompai/design-system/icons';
import { Badge } from '@trycompai/ui/badge';
import Link from 'next/link';
import {
  Cloud,
  Database,
  Globe,
  HardDrive,
  Key,
  Lock,
  MonitorCheck,
  Network,
  ScanSearch,
  Server,
  Shield,
  Terminal,
  Workflow,
} from 'lucide-react';

const SERVICE_ICONS: Record<string, React.ElementType> = {
  'security-hub': Shield,
  'iam-analyzer': Key,
  'cloudtrail': ScanSearch,
  's3': HardDrive,
  'ec2-vpc': Server,
  'rds': Database,
  'kms': Lock,
  'cloudwatch': MonitorCheck,
  'config': MonitorCheck,
  'guardduty': Shield,
  'secrets-manager': Key,
  'waf': Shield,
  'elb': Network,
  'acm': Lock,
  'backup': HardDrive,
  'inspector': ScanSearch,
  'ecs-eks': Server,
  'lambda': Terminal,
  'dynamodb': Database,
  'sns-sqs': Workflow,
  'ecr': Server,
  'opensearch': Database,
  'redshift': Database,
  'macie': ScanSearch,
  'route53': Globe,
  'api-gateway': Network,
  'cloudfront': Globe,
  'cognito': Key,
  'elasticache': Database,
  'efs': HardDrive,
  'msk': Workflow,
  'sagemaker': Cloud,
  'systems-manager': Terminal,
  'codebuild': Terminal,
  'network-firewall': Shield,
  'shield': Shield,
  'kinesis': Workflow,
  'glue': Workflow,
  'athena': Database,
  'emr': Cloud,
  'step-functions': Workflow,
  'eventbridge': Workflow,
  'transfer-family': Network,
  'elastic-beanstalk': Cloud,
  'appflow': Workflow,
};

interface ServiceMeta {
  id: string;
  name: string;
  description: string;
  enabledByDefault?: boolean;
  implemented?: boolean;
  mappedTasks?: Array<{ id: string; name: string }>;
}

function ServiceIcon({ serviceId }: { serviceId: string }) {
  const Icon = SERVICE_ICONS[serviceId] as React.ComponentType<{ className?: string }> | undefined;
  if (!Icon) return null;
  return (
    <div className="mt-0.5 shrink-0 flex h-7 w-7 items-center justify-center rounded-md bg-muted">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

interface ServiceCardProps {
  service: ServiceMeta;
  connectionId: string | null;
  orgId: string;
  slug: string;
}

/**
 * A service row inside a cloud integration's detail page. Clicking navigates to
 * the per-service detail page (where the Cloud Tests scan toggle + the evidence
 * tasks it satisfies live). The row itself shows current scan status + the
 * count of evidence tasks the service maps to — it is NOT a toggle.
 */
export function ServiceCard({ service, connectionId, orgId, slug }: ServiceCardProps) {
  const { services, isLoading, error } = useConnectionServices(connectionId);
  const isImplemented = service.implemented !== false;
  const liveService = services.find((s) => s.id === service.id);
  const inServiceList = Boolean(liveService);
  const isEnabled = liveService?.enabled ?? false;
  // Don't assert a scan status until the connection's live services have
  // loaded. A service absent from the loaded list (e.g. AWS baseline services)
  // is always scanned — but only treat "absent" as "always scanned" once the
  // fetch has actually succeeded.
  const servicesLoaded = Boolean(connectionId) && !isLoading && !error;
  let scanningOn = false;
  let scanningLabel: string;
  if (!servicesLoaded) {
    scanningLabel = error ? 'Status unavailable' : 'Checking status…';
  } else if (!inServiceList) {
    scanningOn = true;
    scanningLabel = 'Always scanned';
  } else {
    scanningOn = isEnabled;
    scanningLabel = isEnabled ? 'Scanning on' : 'Scanning off';
  }
  const taskCount = service.mappedTasks?.length ?? 0;

  const href =
    `/${encodeURIComponent(orgId)}/integrations/${encodeURIComponent(slug)}/services/${encodeURIComponent(service.id)}` +
    (connectionId ? `?connectionId=${encodeURIComponent(connectionId)}` : '');

  return (
    <Link
      href={href}
      className={`group relative flex items-start gap-3 rounded-lg border p-4 transition-colors hover:border-primary/40 hover:bg-muted/40 ${
        !isImplemented ? 'opacity-50' : ''
      }`}
    >
      <ServiceIcon serviceId={service.id} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{service.name}</span>
          {!isImplemented && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Coming Soon
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-relaxed">
          {service.description}
        </p>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                scanningOn ? 'bg-primary' : 'bg-muted-foreground/40'
              }`}
            />
            {scanningLabel}
          </span>
          {taskCount > 0 && (
            <span>
              {taskCount} evidence task{taskCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>
      <ChevronRight
        size={16}
        className="mt-0.5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}

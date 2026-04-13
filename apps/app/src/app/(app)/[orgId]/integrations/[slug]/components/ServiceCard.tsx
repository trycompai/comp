'use client';

import { useConnectionServices } from '@/hooks/use-integration-platform';
import { Badge } from '@trycompai/ui/badge';
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
  isConnected: boolean;
  onToggle?: (id: string, enabled: boolean) => void;
  toggling?: boolean;
}

export function ServiceCard({
  service,
  connectionId,
  isConnected,
  onToggle,
  toggling,
}: ServiceCardProps) {
  const { services } = useConnectionServices(connectionId);

  const isImplemented = service.implemented !== false;
  const liveService = services.find((s) => s.id === service.id);
  const isEnabled = liveService?.enabled ?? false;
  const showToggle = isImplemented && isConnected && onToggle;

  return (
    <div
      className={`relative rounded-lg border p-4 ${
        !isImplemented
          ? 'opacity-50'
          : isEnabled && isConnected
            ? 'border-primary/30 bg-primary/5 dark:border-primary/20 dark:bg-primary/5'
            : ''
      }`}
    >
      <div className="flex items-start gap-3 min-w-0">
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
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
            {service.description}
          </p>
        </div>
        {showToggle && (
          <button
            role="switch"
            aria-checked={isEnabled}
            disabled={toggling}
            onClick={() => onToggle(service.id, !isEnabled)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50 ${
              isEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                isEnabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
              }`}
            />
          </button>
        )}
      </div>
    </div>
  );
}

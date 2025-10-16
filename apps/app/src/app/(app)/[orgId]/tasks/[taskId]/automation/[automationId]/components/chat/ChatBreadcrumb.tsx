import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@comp/ui/breadcrumb';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface ChatBreadcrumbProps {
  orgId: string;
  taskId: string;
  taskName?: string;
  automationId: string;
  automationName?: string;
  isEphemeral: boolean;
}

export function ChatBreadcrumb({
  orgId,
  taskId,
  taskName,
  automationId,
  automationName,
  isEphemeral,
}: ChatBreadcrumbProps) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link
              href={`/${orgId}/tasks`}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Tasks
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronRight className="w-3 h-3" />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link
              href={`/${orgId}/tasks/${taskId}`}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {taskName || 'Task'}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronRight className="w-3 h-3" />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            {isEphemeral ? (
              <span className="font-medium text-xs text-foreground/90 cursor-default">
                New Automation
              </span>
            ) : (
              <Link
                href={`/${orgId}/tasks/${taskId}/automations/${automationId}/overview`}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {automationName || 'Automation'}
              </Link>
            )}
          </BreadcrumbLink>
        </BreadcrumbItem>
        {!isEphemeral && (
          <>
            <BreadcrumbSeparator>
              <ChevronRight className="w-3 h-3" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <span className="font-medium text-xs text-foreground/90 cursor-default">Edit</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

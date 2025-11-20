import Link from "next/link";
import { ChevronRight } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@trycompai/ui/breadcrumb";

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
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Tasks
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronRight className="h-3 w-3" />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link
              href={`/${orgId}/tasks/${taskId}`}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              {taskName || "Task"}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronRight className="h-3 w-3" />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            {isEphemeral ? (
              <span className="text-foreground/90 cursor-default text-xs font-medium">
                New Automation
              </span>
            ) : (
              <Link
                href={`/${orgId}/tasks/${taskId}/automations/${automationId}/overview`}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                {automationName || "Automation"}
              </Link>
            )}
          </BreadcrumbLink>
        </BreadcrumbItem>
        {!isEphemeral && (
          <>
            <BreadcrumbSeparator>
              <ChevronRight className="h-3 w-3" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <span className="text-foreground/90 cursor-default text-xs font-medium">
                  Edit
                </span>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

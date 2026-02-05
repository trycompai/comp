'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Badge } from '@comp/ui/badge';
import { cn } from '@comp/ui/cn';
import { ScrollArea } from '@comp/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comp/ui/tooltip';
import { AuditLog, AuditLogEntityType } from '@db';
import { Collapsible, CollapsibleContent, CollapsibleTrigger, HStack, Section, Stack, Text } from '@trycompai/design-system';
import { format } from 'date-fns';
import {
  ActivityIcon,
  AlertTriangle,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  FileIcon,
  FileTextIcon,
  ShieldIcon,
} from 'lucide-react';
import { AuditLogWithRelations } from '../data';

type LogActionType = 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'review';

interface LogData {
  action?: LogActionType;
  details?: Record<string, unknown>;
  changes?: Record<string, { previous: unknown; current: unknown }>;
}

const getActionColor = (action: LogActionType | string) => {
  switch (action) {
    case 'create':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'update':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'delete':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case 'approve':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
    case 'reject':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    case 'review':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
};

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

const formatChangeValue = (value: unknown): string => {
  if (value === null || value === undefined) return '(empty)';
  const str = String(value);
  if (!str || str === 'null' || str === 'undefined') return '(empty)';
  if (ISO_DATE_REGEX.test(str)) {
    try {
      return format(new Date(str), 'MMM d, yyyy');
    } catch {
      return str;
    }
  }
  return str;
};

const getInitials = (name = '') => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getEntityTypeIcon = (entityType: AuditLogEntityType | null | undefined) => {
  switch (entityType) {
    case AuditLogEntityType.policy:
      return <FileTextIcon className="h-3 w-3" />;
    case AuditLogEntityType.control:
      return <ShieldIcon className="h-3 w-3" />;
    default:
      return <FileIcon className="h-3 w-3" />;
  }
};

const parseLogData = (log: AuditLog): LogData => {
  try {
    if (typeof log.data === 'object' && log.data !== null) {
      const data = log.data as Record<string, unknown>;
      return {
        action: data.action as LogActionType,
        details: data.details as Record<string, unknown>,
        changes: data.changes as Record<string, { previous: unknown; current: unknown }>,
      };
    }
  } catch (e) {
    console.error('Error parsing audit log data', e);
  }

  return {};
};

const getUserInfo = (log: AuditLogWithRelations) => {
  if (log.user) {
    return {
      name: log.user.name,
      email: log.user.email,
      avatarUrl: log.user.image || undefined,
      deactivated: log.member?.deactivated || false,
    };
  }

  return {
    name: undefined,
    email: undefined,
    avatarUrl: undefined,
    deactivated: false,
  };
};

const LogItem = ({ log }: { log: AuditLogWithRelations }) => {
  const logData = parseLogData(log);
  const userInfo = getUserInfo(log);
  const actionType = logData.action || 'update';

  return (
    <div className="py-4">
      <HStack gap="4" align="start">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={userInfo.avatarUrl || ''} alt={userInfo.name || 'User'} />
            <AvatarFallback>{getInitials(userInfo.name)}</AvatarFallback>
          </Avatar>
          {userInfo.deactivated && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute -bottom-0.5 -right-0.5 rounded-full">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 fill-yellow-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This user is deactivated.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="flex-1">
          <Stack gap="2">
            <HStack justify="between" align="center">
              <Text size="sm" weight="medium">
                {userInfo.name || `User ${log.userId.substring(0, 6)}`}
              </Text>
              <Badge
                variant="outline"
                className={cn('text-xs font-medium', getActionColor(actionType))}
              >
                {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
              </Badge>
            </HStack>

            <Text size="sm" variant="muted">
              {log.description || 'No description available'}
            </Text>

            {logData.changes && Object.keys(logData.changes).length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="group flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronRightIcon className="h-3 w-3 transition-transform group-data-[panel-open]:rotate-90" />
                  <span>{Object.keys(logData.changes).length} field{Object.keys(logData.changes).length > 1 ? 's' : ''} changed</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="bg-muted/40 rounded-md p-2 text-xs mt-1">
                    <Stack gap="1">
                      {Object.entries(logData.changes).map(([field, { previous, current }]) => (
                        <Text key={field} size="xs">
                          <Text as="span" size="xs" weight="medium">
                            {field}:
                          </Text>{' '}
                          <span className="text-muted-foreground line-through">
                            {formatChangeValue(previous)}
                          </span>{' '}
                          → {formatChangeValue(current)}
                        </Text>
                      ))}
                    </Stack>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            <HStack gap="4" wrap="wrap">
              <HStack gap="1" align="center">
                <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                <Text size="xs" variant="muted">
                  {format(log.timestamp, 'MMM d, yyyy')}
                </Text>
              </HStack>
              <HStack gap="1" align="center">
                <ClockIcon className="h-3 w-3 text-muted-foreground" />
                <Text size="xs" variant="muted">
                  {format(log.timestamp, 'h:mm a')}
                </Text>
              </HStack>
              {log.entityType && (
                <HStack gap="1" align="center">
                  <span className="text-muted-foreground">{getEntityTypeIcon(log.entityType)}</span>
                  <Text size="xs" variant="muted">
                    {log.entityType}
                  </Text>
                </HStack>
              )}
              {log.entityId && (
                <HStack gap="1" align="center">
                  <ActivityIcon className="h-3 w-3 text-muted-foreground" />
                  <Text size="xs" variant="muted">
                    ID: {log.entityId.substring(0, 8)}
                  </Text>
                </HStack>
              )}
            </HStack>
          </Stack>
        </div>
      </HStack>
    </div>
  );
};

export const RecentAuditLogs = ({ logs }: { logs: AuditLogWithRelations[] }) => {
  return (
    <Section title="Recent Activity">
      <ScrollArea>
        {logs.length > 0 ? (
          <div className="max-h-[400px] divide-y">
            {logs.map((log) => (
              <LogItem key={log.id} log={log} />
            ))}
          </div>
        ) : (
          <div className="py-12">
            <Stack gap="sm" align="center">
              <ActivityIcon className="text-muted-foreground h-8 w-8" />
              <Text size="sm" weight="medium">
                No recent activity
              </Text>
              <Text size="xs" variant="muted">
                Activity will appear here when changes are made to this policy
              </Text>
            </Stack>
          </div>
        )}
      </ScrollArea>
    </Section>
  );
};

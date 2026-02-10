'use client';

import { useAssignableMembers } from '@/hooks/use-organization-members';
import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import type { Departments, Member, Task, TaskFrequency, TaskStatus, User } from '@db';
import { format } from 'date-fns';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { TaskStatusIndicator } from '../../components/TaskStatusIndicator';
import { usePermissions } from '@/hooks/use-permissions';
import { useTask } from '../hooks/use-task';
import { PropertySelector } from './PropertySelector';
import { DEPARTMENT_COLORS, taskDepartments, taskFrequencies, taskStatuses } from './constants';

interface TaskPropertiesSidebarProps {
  handleUpdateTask: (
    data: Partial<Pick<Task, 'status' | 'assigneeId' | 'frequency' | 'department' | 'reviewDate'>>,
  ) => void;
  initialMembers?: (Member & { user: User })[];
}

export function TaskPropertiesSidebar({ handleUpdateTask, initialMembers }: TaskPropertiesSidebarProps) {
  const { orgId } = useParams<{ orgId: string }>();
  const { task, isLoading } = useTask();
  const { members } = useAssignableMembers({ initialData: initialMembers });
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('task', 'update');
  const canAssign = hasPermission('task', 'assign');

  const assignedMember =
    !task?.assigneeId || !members ? null : members.find((m) => m.id === task.assigneeId);

  if (isLoading) return <div>Loading...</div>;
  if (!task) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Properties</h3>

      <div className="space-y-3">
        {/* Status Selector */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status</span>
          <PropertySelector<TaskStatus>
            value={task.status}
            options={taskStatuses}
            getKey={(status) => status}
            renderOption={(status) => (
              <div className="flex items-center gap-2">
                <TaskStatusIndicator status={status} />
                <span className="capitalize">{status.replace('_', ' ')}</span>
              </div>
            )}
            onSelect={(selectedStatus) => {
              handleUpdateTask({
                status: selectedStatus as TaskStatus,
                reviewDate: selectedStatus === 'done' ? new Date() : task.reviewDate,
              });
            }}
            disabled={!canUpdate}
            trigger={
              <Button
                variant="ghost"
                className="hover:bg-muted data-[state=open]:bg-muted flex h-auto w-auto items-center gap-2 px-2 py-0.5 font-medium capitalize transition-colors cursor-pointer"
              >
                <TaskStatusIndicator status={task.status} />
                {task.status.replace('_', ' ')}
              </Button>
            }
            searchPlaceholder="Change status..."
            emptyText="No status found."
            contentWidth="w-48"
          />
        </div>

        {/* Assignee Selector */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Assignee</span>
          <PropertySelector<Member & { user: User }>
            value={task.assigneeId}
            options={members ?? []}
            getKey={(member) => member.id}
            getSearchValue={(member) => `${member.user?.name || ''} ${member.user?.email || ''}`.trim() || member.id}
            renderOption={(member) => (
              <div className="flex items-center gap-2 w-full">
                <Avatar className="h-5 w-5 shrink-0">
                  {member.user?.image && (
                    <AvatarImage src={member.user.image} alt={member.user.name ?? member.user.email ?? ''} />
                  )}
                  <AvatarFallback>
                    {member.user?.name?.charAt(0) ?? member.user?.email?.charAt(0)?.toUpperCase() ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{member.user.name || member.user.email}</span>
              </div>
            )}
            onSelect={(selectedAssigneeId) => {
              handleUpdateTask({
                assigneeId: selectedAssigneeId === null ? null : selectedAssigneeId,
              });
            }}
            trigger={
              <Button
                variant="ghost"
                className="hover:bg-muted data-[state=open]:bg-muted flex h-auto w-auto items-center justify-end gap-1.5 px-2 py-0.5 transition-colors cursor-pointer"
                disabled={members?.length === 0}
              >
                {assignedMember ? (
                  <>
                    <Avatar className="h-4 w-4">
                      {assignedMember.user?.image && (
                        <AvatarImage
                          src={assignedMember.user.image}
                          alt={assignedMember.user.name ?? assignedMember.user.email ?? ''}
                        />
                      )}
                      <AvatarFallback className="text-[10px]">
                        {assignedMember.user?.name?.charAt(0) ?? assignedMember.user?.email?.charAt(0)?.toUpperCase() ?? '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{assignedMember.user.name || assignedMember.user.email}</span>
                  </>
                ) : (
                  <span className="font-medium">Unassigned</span>
                )}
              </Button>
            }
            searchPlaceholder="Change assignee..."
            emptyText="No member found."
            contentWidth="w-64"
            disabled={!canAssign || members?.length === 0}
            allowUnassign={true} // Enable unassign option
            showCheck={false} // Hide check icon for assignee selector
          />
        </div>

        {/* Frequency Selector */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Frequency</span>
          <PropertySelector<TaskFrequency>
            value={task.frequency}
            options={taskFrequencies}
            getKey={(freq) => freq}
            renderOption={(freq) => <span className="capitalize">{freq.replace('_', ' ')}</span>}
            onSelect={(selectedFreq) => {
              // Pass null directly if 'None' (unassign) was selected
              handleUpdateTask({
                frequency: selectedFreq === null ? null : (selectedFreq as TaskFrequency),
              });
            }}
            disabled={!canUpdate}
            trigger={
              <Button
                variant="ghost"
                className="hover:bg-muted data-[state=open]:bg-muted h-auto w-auto px-2 py-0.5 font-medium capitalize transition-colors cursor-pointer"
              >
                {task.frequency ? task.frequency.replace('_', ' ') : 'None'}
              </Button>
            }
            searchPlaceholder="Change frequency..."
            emptyText="No frequency found."
            contentWidth="w-48"
            allowUnassign={true}
            unassignLabel="None"
          />
        </div>

        {/* Department Selector */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Department</span>
          <PropertySelector<Departments>
            value={task.department ?? 'none'}
            options={taskDepartments}
            getKey={(dept) => dept}
            disabled={!canUpdate}
            renderOption={(dept) => {
              if (dept === 'none') {
                // Render 'none' as plain text
                return <span className="text-muted-foreground">None</span>;
              }
              // Render other departments as colored badges
              const mainColor = DEPARTMENT_COLORS[dept] ?? DEPARTMENT_COLORS.none;
              const lightBgColor = `${mainColor}1A`; // Add opacity for lighter background
              return (
                <Badge
                  className="border-l-2 px-1.5 py-0 text-xs font-normal uppercase"
                  style={{
                    backgroundColor: lightBgColor,
                    color: mainColor,
                    borderLeftColor: mainColor,
                  }}
                >
                  {dept}
                </Badge>
              );
            }}
            onSelect={(selectedDept) => {
              handleUpdateTask({
                department: selectedDept as Departments,
              });
            }}
            trigger={
              <Button
                variant="ghost"
                className="flex h-auto w-auto items-center justify-end gap-1.5 px-2 py-0.5 hover:bg-muted data-[state=open]:bg-muted transition-colors cursor-pointer"
              >
                {(() => {
                  const currentDept = task.department ?? 'none';
                  if (currentDept === 'none') {
                    // Render 'None' as plain text for the trigger
                    return <span className="font-medium">None</span>;
                  }
                  // Render other departments as colored badges
                  const mainColor = DEPARTMENT_COLORS[currentDept] ?? DEPARTMENT_COLORS.none; // Fallback
                  const lightBgColor = `${mainColor}1A`; // Add opacity
                  return (
                    <Badge
                      className="border-l-2 px-1.5 py-0 text-xs font-normal uppercase"
                      style={{
                        backgroundColor: lightBgColor,
                        color: mainColor,
                        borderLeftColor: mainColor,
                      }}
                    >
                      {currentDept}
                    </Badge>
                  );
                })()}
              </Button>
            }
            searchPlaceholder="Change department..."
            emptyText="No department found."
            contentWidth="w-48"
          />
        </div>

        {/* Control */}
        {task.controls && task.controls.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Control</span>
            <div className="flex flex-col items-end gap-1">
              {task.controls.map((control) => (
                <Link
                  key={control.id}
                  href={`/${orgId}/controls/${control.id}`}
                  className="inline-flex items-center px-2 py-1 text-xs bg-muted rounded hover:bg-muted/80 transition-colors max-w-[200px] truncate"
                  title={control.name}
                >
                  {control.name}
                </Link>
              ))}
            </div>
          </div>
        )}
        {/* Review Date Selector */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Review Date</span>
          <div className="flex items-center gap-2">
            {task.reviewDate ? (
              <span className="text-sm font-medium">
                {format(new Date(task.reviewDate), 'M/d/yyyy')}
              </span>
            ) : (
              <span className="text-sm px-2 font-medium">None</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import type { Departments, Member, Task, TaskFrequency, TaskStatus, User } from '@comp/db/types';
import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { MoreVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { TaskStatusIndicator } from '../../components/TaskStatusIndicator';
import { PropertySelector } from './PropertySelector';
import { DEPARTMENT_COLORS, taskDepartments, taskFrequencies, taskStatuses } from './constants';

interface TaskPropertiesSidebarProps {
  task: Task;
  members?: (Member & { user: User })[];
  assignedMember: (Member & { user: User }) | null | undefined; // Allow undefined
  handleUpdateTask: (
    data: Partial<Pick<Task, 'status' | 'assigneeId' | 'frequency' | 'department'>>,
  ) => void;
  onDeleteClick?: () => void;
}

export function TaskPropertiesSidebar({
  task,
  members,
  assignedMember,
  handleUpdateTask,
  onDeleteClick,
}: TaskPropertiesSidebarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  return (
    <aside className="hidden w-full shrink-0 flex-col md:w-64 md:border-l md:pt-8 md:pl-8 lg:flex lg:w-72">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-muted-foreground shrink-0 text-xs font-semibold tracking-wider uppercase">
          Properties
        </h2>
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="m-0 size-auto p-2">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setDropdownOpen(false);
                if (onDeleteClick) onDeleteClick();
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="space-y-4 overflow-y-auto">
        {/* Status Selector */}
        <div className="group flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Status</span>
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
              });
            }}
            trigger={
              <Button
                variant="ghost"
                className="hover:bg-muted data-[state=open]:bg-muted flex h-auto w-auto items-center gap-2 px-2 py-0.5 font-medium capitalize"
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
        <div className="group flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Assignee</span>
          <PropertySelector<Member & { user: User }>
            value={task.assigneeId}
            options={members ?? []}
            getKey={(member) => member.id}
            renderOption={(member) => (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  {member.user?.image && (
                    <AvatarImage src={member.user.image} alt={member.user.name ?? ''} />
                  )}
                  <AvatarFallback>{member.user?.name?.charAt(0) ?? '?'}</AvatarFallback>
                </Avatar>
                <span>{member.user.name}</span>
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
                className="hover:bg-muted data-[state=open]:bg-muted flex h-auto w-auto items-center justify-end gap-1.5 px-2 py-0.5"
                disabled={members?.length === 0}
              >
                {assignedMember ? (
                  <>
                    <Avatar className="h-4 w-4">
                      {assignedMember.user?.image && (
                        <AvatarImage
                          src={assignedMember.user.image}
                          alt={assignedMember.user.name ?? ''}
                        />
                      )}
                      <AvatarFallback className="text-[10px]">
                        {assignedMember.user?.name?.charAt(0) ?? '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-foreground font-medium">{assignedMember.user.name}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Unassigned</span>
                )}
              </Button>
            }
            searchPlaceholder="Change assignee..."
            emptyText="No member found."
            contentWidth="w-56"
            disabled={members?.length === 0}
            allowUnassign={true} // Enable unassign option
          />
        </div>

        {/* Frequency Selector */}
        <div className="group flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Frequency</span>
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
            trigger={
              <Button
                variant="ghost"
                className="hover:bg-muted data-[state=open]:bg-muted h-auto w-auto px-2 py-0.5 font-medium capitalize"
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
        <div className="group flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Department</span>
          <PropertySelector<Departments>
            value={task.department ?? 'none'}
            options={taskDepartments}
            getKey={(dept) => dept}
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
                // Adjust class slightly to handle text vs badge alignment if needed
                className="flex h-auto w-auto items-center justify-end p-0 px-1 hover:bg-transparent data-[state=open]:bg-transparent"
              >
                {(() => {
                  const currentDept = task.department ?? 'none';
                  if (currentDept === 'none') {
                    // Render 'None' as plain text for the trigger
                    return <span className="text-muted-foreground px-1">None</span>;
                  }
                  // Render other departments as colored badges
                  const mainColor = DEPARTMENT_COLORS[currentDept] ?? DEPARTMENT_COLORS.none; // Fallback
                  const lightBgColor = `${mainColor}1A`; // Add opacity
                  return (
                    <Badge
                      className="border-l-2 px-1.5 py-0.5 text-xs font-normal uppercase hover:opacity-80"
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
      </div>
    </aside>
  );
}

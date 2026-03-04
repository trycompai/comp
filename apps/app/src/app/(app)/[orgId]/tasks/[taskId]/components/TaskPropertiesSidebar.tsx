'use client';

import { SelectAssignee } from '@/components/SelectAssignee';
import { useOrganizationMembers } from '@/hooks/use-organization-members';
import { usePermissions } from '@/hooks/use-permissions';
import type { Departments, Member, Task, TaskFrequency, TaskStatus, User } from '@db';
import { format } from 'date-fns';
import { useParams } from 'next/navigation';
import {
  Grid,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Label,
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Calendar } from 'lucide-react';
import { useTask } from '../hooks/use-task';
import { taskStatuses, taskFrequencies, taskDepartments } from './constants';

interface TaskPropertiesSidebarProps {
  handleUpdateTask: (
    data: Partial<Pick<Task, 'status' | 'assigneeId' | 'approverId' | 'frequency' | 'department' | 'reviewDate'>>,
  ) => void;
  evidenceApprovalEnabled?: boolean;
  onRequestApproval?: () => void;
}

export function TaskPropertiesSidebar({
  handleUpdateTask,
  evidenceApprovalEnabled = false,
  onRequestApproval,
}: TaskPropertiesSidebarProps) {
  const { orgId } = useParams<{ orgId: string }>();
  const { task, isLoading } = useTask();
  const { members } = useOrganizationMembers();
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('task', 'update');

  if (isLoading || !task) return null;

  const isStatusLocked = evidenceApprovalEnabled && task.status === 'in_review';

  const handleStatusChange = (selectedStatus: string | null) => {
    if (!selectedStatus || selectedStatus === 'none') return;
    if (isStatusLocked) return;
    if (evidenceApprovalEnabled && selectedStatus === 'done' && onRequestApproval) {
      onRequestApproval();
      return;
    }
    handleUpdateTask({ status: selectedStatus as TaskStatus });
  };

  return (
    <Section title="Evidence Settings">
      <Stack gap="md">
        <Grid cols={{ base: '1', md: '2' }} gap="4">
          {/* Status */}
          <Stack gap="sm">
            <Label>Status</Label>
            <Select
              value={task.status}
              onValueChange={handleStatusChange}
              disabled={!canUpdate || isStatusLocked}
            >
              <SelectTrigger>
                <span className="capitalize">{task.status.replace('_', ' ')}</span>
              </SelectTrigger>
              <SelectContent>
                {taskStatuses.filter((s) => s !== 'in_review').map((status) => (
                  <SelectItem key={status} value={status}>
                    <span className="capitalize">{status.replace('_', ' ')}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Stack>

          {/* Assignee */}
          <Stack gap="sm">
            <Label>Assignee</Label>
            <SelectAssignee
              assignees={members ?? []}
              assigneeId={task.assigneeId ?? ''}
              onAssigneeChange={(id) => handleUpdateTask({ assigneeId: id || null })}
              withTitle={false}
            />
          </Stack>

          {/* Frequency */}
          <Stack gap="sm">
            <Label>Frequency</Label>
            <Select
              value={task.frequency || 'none'}
              onValueChange={(value) => handleUpdateTask({ frequency: (value === 'none' ? null : value) as TaskFrequency | null })}
              disabled={!canUpdate}
            >
              <SelectTrigger>
                <span className="capitalize">{task.frequency ? task.frequency.replace('_', ' ') : 'None'}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {taskFrequencies.map((freq) => (
                  <SelectItem key={freq} value={freq}>
                    <span className="capitalize">{freq.replace('_', ' ')}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Stack>

          {/* Department */}
          <Stack gap="sm">
            <Label>Department</Label>
            <Select
              value={task.department || 'none'}
              onValueChange={(value) => handleUpdateTask({ department: (value === 'none' ? null : value) as Departments | null })}
              disabled={!canUpdate}
            >
              <SelectTrigger>
                {task.department ? task.department.toUpperCase() : 'None'}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {taskDepartments.filter((d) => d !== 'none').map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Stack>

          {/* Review Date */}
          <Stack gap="sm">
            <Label>Review Date</Label>
            <InputGroup>
              <InputGroupInput
                type="text"
                value={task.reviewDate ? format(new Date(task.reviewDate), 'M/d/yyyy') : ''}
                placeholder="Not set"
                disabled
                readOnly
              />
              <InputGroupAddon align="inline-end">
                <Calendar size={16} />
              </InputGroupAddon>
            </InputGroup>
          </Stack>

          {/* Approver */}
          {evidenceApprovalEnabled && (
            <Stack gap="sm">
              <Label>Approver</Label>
              <SelectAssignee
                assignees={members ?? []}
                assigneeId={task.approverId ?? ''}
                onAssigneeChange={(id) => handleUpdateTask({ approverId: id || null })}
                withTitle={false}
              />
            </Stack>
          )}
        </Grid>
      </Stack>
    </Section>
  );
}

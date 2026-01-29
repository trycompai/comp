import type { AssigneeOption } from '@/components/SelectAssignee';
import type { PeopleResponseDto } from '@/hooks/use-people-api';

const ALLOWED_ASSIGNEE_ROLES = new Set(['admin', 'owner']);

export const toAssigneeOptions = (people: PeopleResponseDto[]): AssigneeOption[] => {
  return people
    .filter((member) => member.isActive)
    .filter((member) => {
      const roles = member.role
        .split(',')
        .map((role) => role.trim().toLowerCase())
        .filter(Boolean);
      return roles.some((role) => ALLOWED_ASSIGNEE_ROLES.has(role));
    })
    .map((member) => ({
      id: member.id,
      user: {
        id: member.user.id,
        name: member.user.name ?? null,
        email: member.user.email,
        image: member.user.image ?? null,
      },
    }));
};

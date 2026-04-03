import { api } from '@/lib/api-client';
import type { Member, User } from '@db';
import { useParams } from 'next/navigation';
import useSWR from 'swr';

interface MemberData extends Member {
  user: User;
}

interface MentionUser {
  id: string;
  name: string;
  email: string;
  image: string | null | undefined;
}

/**
 * Returns members who have read access to a specific resource type.
 * Used for @mention suggestions in comments -- only shows users who can see the comment.
 */
export function useMentionableMembers(entityType: string): {
  members: MentionUser[];
  isLoading: boolean;
} {
  const { orgId } = useParams<{ orgId: string }>();

  // Map CommentEntityType to resource name
  // CommentEntityType values are like 'risk', 'policy', 'control', 'task', 'vendor'
  // These map directly to resource names in RBAC
  const resource = entityType.toLowerCase();

  const { data, isLoading } = useSWR(
    orgId ? [`mentionable-members-${orgId}-${resource}`, orgId, resource] : null,
    async () => {
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      const { data } = await api.get<{
        data: MemberData[];
      }>(`/v1/people/mentionable?resource=${encodeURIComponent(resource)}`);

      return data?.data || [];
    },
    {
      revalidateOnFocus: false,
    },
  );

  // Map to MentionUser format
  const members: MentionUser[] = (data || []).map((member) => ({
    id: member.user.id,
    name: member.user.name || member.user.email || 'Unknown',
    email: member.user.email || '',
    image: member.user.image,
  }));

  return { members, isLoading };
}

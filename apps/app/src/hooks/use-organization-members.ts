import { api } from '@/lib/api-client';
import { Member, User } from '@db';
import { useParams } from 'next/navigation';
import useSWR from 'swr';

interface MemberData extends Member {
  user: User;
}

interface UseOrganizationMembersReturn {
  members: MemberData[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  mutate: () => Promise<any>;
}

interface UseOrganizationMembersOptions {
  initialData?: MemberData[];
}

export function useOrganizationMembers({
  initialData,
}: UseOrganizationMembersOptions = {}): UseOrganizationMembersReturn {
  const { orgId } = useParams<{
    orgId: string;
  }>();

  const { data, error, isLoading, mutate } = useSWR(
    orgId ? [`organization-members-${orgId}`, orgId] : null,
    async () => {
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      const { data } = await api.get<{
        data: MemberData[];
        error: string;
        success: boolean;
      }>(`/v1/people`, orgId);

      if (!data?.data) {
        console.error('[useOrganizationMembers] Failed to fetch organization members', data?.error);
        throw new Error(data?.error || 'Failed to fetch organization members');
      }

      return data?.data || [];
    },
    {
      fallbackData: initialData,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    },
  );

  return {
    members: data,
    isLoading,
    isError: !!error,
    error: error as Error | undefined,
    mutate,
  };
}

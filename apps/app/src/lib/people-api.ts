import { serverApi, type ApiResponse } from '@/lib/api-server';

export interface InviteMemberInput {
  email: string;
  roles: string[];
}

export interface InviteMemberResult {
  email: string;
  success: boolean;
  error?: string;
  emailSent?: boolean;
}

interface InviteMembersApiResponse {
  results: InviteMemberResult[];
}

interface DeleteMemberApiResponse {
  success: boolean;
  deletedMember: {
    id: string;
    name: string;
    email: string;
  };
}

export function inviteMembersViaApi({
  invites,
}: {
  invites: InviteMemberInput[];
}): Promise<ApiResponse<InviteMembersApiResponse>> {
  return serverApi.post<InviteMembersApiResponse>('/v1/people/invite', { invites });
}

export async function inviteSingleMemberViaApi({
  email,
  roles,
}: InviteMemberInput): Promise<InviteMemberResult> {
  const response = await inviteMembersViaApi({
    invites: [{ email, roles }],
  });

  if (response.error) {
    throw new Error(response.error);
  }

  const result = response.data?.results[0];
  if (!result) {
    throw new Error('Invite members API returned no result');
  }

  return result;
}

export function removeMemberViaApi({
  memberId,
}: {
  memberId: string;
}): Promise<ApiResponse<DeleteMemberApiResponse>> {
  return serverApi.delete<DeleteMemberApiResponse>(`/v1/people/${memberId}`);
}

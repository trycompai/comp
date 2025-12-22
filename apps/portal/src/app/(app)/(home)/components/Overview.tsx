import type { MembershipsResponse } from '../schemas/memberships';
import { OverviewClient } from './OverviewClient';

interface OverviewProps {
  initialMemberships?: MembershipsResponse;
}

export function Overview({ initialMemberships }: OverviewProps) {
  return <OverviewClient initialMemberships={initialMemberships} />;
}

import { getOrganizationTools } from './organization';
import { getPolicyTools } from './policies';
import { getRiskTools } from './risks-tool';
import { getUserTools } from './user';

export function getTools(t: (content: string) => string) {
  return {
    ...getOrganizationTools(),
    ...getPolicyTools(t),
    ...getRiskTools(t),
    ...getUserTools(),
  };
}

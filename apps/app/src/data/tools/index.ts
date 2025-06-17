import { getOrganizationTools } from './organization';
import { getPolicyTools } from './policies';
import { getRiskTools } from './risks-tool';
import { getUserTools } from './user';

export const tools = {
  ...getOrganizationTools(),
  ...getPolicyTools(),
  ...getRiskTools(),
  ...getUserTools(),
};

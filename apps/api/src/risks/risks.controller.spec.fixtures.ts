import {
  Departments,
  Impact,
  Likelihood,
  RiskCategory,
  RiskStatus,
  RiskTreatmentType,
} from '@trycompai/db';
import type { AuthContext } from '../auth/types';

export const orgId = 'org_test123';

export const authContext: AuthContext = {
  organizationId: orgId,
  authType: 'session',
  isApiKey: false,
  isPlatformAdmin: false,
  userRoles: ['admin'],
  userId: 'usr_123',
  userEmail: 'admin@example.com',
  memberId: 'mem_123',
};

export const authContextNoUser: AuthContext = {
  organizationId: orgId,
  authType: 'api-key',
  isApiKey: true,
  isPlatformAdmin: false,
  userRoles: ['admin'],
  userId: undefined,
  userEmail: undefined,
  memberId: undefined,
};

export const authenticatedUser = {
  id: 'usr_123',
  email: 'admin@example.com',
};

/** Plain Risk record (no relations) - matches db.risk.create / db.risk.update */
export const mockRiskBase = {
  id: 'risk_1',
  title: 'Test Risk',
  description: 'A test risk',
  status: RiskStatus.open,
  category: RiskCategory.operations,
  department: Departments.it,
  organizationId: orgId,
  assigneeId: 'mem_123',
  likelihood: Likelihood.very_unlikely,
  impact: Impact.insignificant,
  residualLikelihood: Likelihood.very_unlikely,
  residualImpact: Impact.insignificant,
  treatmentStrategy: RiskTreatmentType.accept,
  treatmentStrategyDescription: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/** Risk with assignee relation - matches findById / findAllByOrganization */
export const mockRisk = { ...mockRiskBase, assignee: null };

export const paginatedResult = {
  data: [mockRisk],
  totalCount: 1,
  page: 1,
  pageCount: 1,
};

export const statsData = [
  {
    id: 'mem_1',
    user: { name: 'User 1', image: null, email: 'u1@test.com' },
    totalRisks: 3,
    openRisks: 1,
    pendingRisks: 1,
    closedRisks: 1,
    archivedRisks: 0,
  },
];

export const deptStats = [
  { department: Departments.it, _count: 5 },
  { department: Departments.gov, _count: 3 },
];

export const createDto = {
  title: 'New Risk',
  description: 'Description',
  category: RiskCategory.operations,
};

export const deleteResult = {
  message: 'Risk deleted successfully',
  deletedRisk: { id: 'risk_1', title: 'Test Risk' },
};

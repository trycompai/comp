import type { Departments, VendorCategory, VendorStatus } from '@db';

export type VendorsQuery = {
  page?: number;
  perPage?: number;
  name?: string;
  status?: VendorStatus | null;
  category?: VendorCategory | null;
  department?: Departments | null;
  assigneeId?: string | null;
  sortId?: 'name' | 'updatedAt' | 'createdAt';
  sortDesc?: boolean;
};

export const buildVendorsQueryString = (params: VendorsQuery): string => {
  const query = new URLSearchParams();

  if (params.page) query.set('page', String(params.page));
  if (params.perPage) query.set('perPage', String(params.perPage));
  if (params.name) query.set('name', params.name);
  if (params.status) query.set('status', params.status);
  if (params.category) query.set('category', params.category);
  if (params.department) query.set('department', params.department);
  if (params.assigneeId) query.set('assigneeId', params.assigneeId);
  if (params.sortId) query.set('sortId', params.sortId);
  if (typeof params.sortDesc === 'boolean') {
    query.set('sortDesc', params.sortDesc ? 'true' : 'false');
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

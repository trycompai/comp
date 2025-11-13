import type { Member, User, Vendor } from '@db';
import { db } from '@db';
import { cache } from 'react';
import type { GetVendorsSchema } from './validations';

// Define and export return types used by the functions below
export type GetVendorsResult = {
  data: (Vendor & { assignee: { user: User | null; id: string } | null })[];
  pageCount: number; // Changed from totalCount and pageSize
};
export type GetAssigneesResult = (Member & { user: User })[];

export const getVendors = cache(
  async (orgId: string, searchParams: GetVendorsSchema): Promise<GetVendorsResult> => {
    const { page, perPage, status, department, assigneeId, filters, sort, name } = searchParams;

    const whereClause: any = {
      organizationId: orgId,
      ...(status && { status: status }),
      ...(department && { department: department }),
      ...(assigneeId && { assigneeId: assigneeId }),
      ...(name && { name: { contains: name, mode: 'insensitive' } }),
    };

    if (filters) {
      // Logic to parse the filters array and add to whereClause
    }

    const totalCount = await db.vendor.count({ where: whereClause });

    const vendors = await db.vendor.findMany({
      where: whereClause,
      include: {
        assignee: {
          select: {
            user: true,
            id: true,
          },
        },
      },
      skip: (page - 1) * perPage,
      take: perPage,
      // TODO: Implement sorting based on `sort` array
    });

    const pageCount = Math.ceil(totalCount / perPage);

    return {
      data: vendors as GetVendorsResult['data'],
      pageCount, // Return calculated pageCount
    };
  },
);

export const getAssignees = cache(async (orgId: string): Promise<GetAssigneesResult> => {
  const assignees = await db.member.findMany({
    where: {
      organizationId: orgId,
      role: {
        notIn: ['employee', 'contractor'],
      },
      deactivated: false,
    },
    include: {
      user: true,
    },
  });

  return assignees;
});

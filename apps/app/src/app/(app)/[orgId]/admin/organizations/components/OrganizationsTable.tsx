'use client';

import { api } from '@/lib/api-client';
import {
  Badge,
  Button,
  DataTableFilters,
  DataTableHeader,
  DataTableSearch,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import {
  Renew,
  View,
} from '@trycompai/design-system/icons';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';

const PAGE_SIZE = 25;

interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: string;
  hasAccess: boolean;
  onboardingCompleted: boolean;
  memberCount: number;
  owner: { id: string; name: string; email: string } | null;
}

interface AdminOrgsResponse {
  data: AdminOrg[];
  total: number;
  page: number;
  limit: number;
}

async function fetchOrgs(
  search: string,
  page: number,
): Promise<AdminOrgsResponse> {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    page: String(page),
  });
  if (search) params.set('search', search);
  const res = await api.get<AdminOrgsResponse>(
    `/v1/admin/organizations?${params}`,
  );
  if (res.error) throw new Error(res.error);
  return res.data ?? { data: [], total: 0, page: 1, limit: PAGE_SIZE };
}

export function OrganizationsTable({
  initialOrgs,
  initialTotal,
  initialPage,
  initialSearch,
  orgId,
}: {
  initialOrgs: AdminOrg[];
  initialTotal: number;
  initialPage: number;
  initialSearch: string;
  orgId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, parseInt(searchParams.get('page') ?? String(initialPage), 10));
  const search = searchParams.get('search') ?? initialSearch;

  const [inputValue, setInputValue] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { data, mutate, isLoading } = useSWR<AdminOrgsResponse>(
    ['admin-orgs', search, page],
    () => fetchOrgs(search, page),
    {
      fallbackData: {
        data: initialOrgs,
        total: initialTotal,
        page: initialPage,
        limit: PAGE_SIZE,
      },
      revalidateOnMount:
        search !== initialSearch || page !== initialPage || !initialOrgs.length,
    },
  );

  const orgs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`);
    },
    [router, pathname, searchParams],
  );

  const handleSearchChange = (value: string) => {
    setInputValue(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams({ search: value || null, page: null });
    }, 300);
  };

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const handlePageChange = (newPage: number) => {
    updateParams({ page: newPage > 1 ? String(newPage) : null });
  };

  return (
    <Stack gap="md">
      <DataTableHeader>
        <DataTableSearch
          placeholder="Search by name, ID, owner..."
          value={inputValue}
          onChange={handleSearchChange}
        />
        <DataTableFilters>
          <Button
            variant="outline"
            onClick={() => mutate()}
            loading={isLoading}
            iconLeft={<Renew size={16} />}
          >
            Refresh
          </Button>
          <Text size="sm" variant="muted">
            {total} organizations
          </Text>
        </DataTableFilters>
      </DataTableHeader>

      {orgs.length === 0 ? (
        <div className="flex h-32 items-center justify-center">
          <Text variant="muted">No organizations found.</Text>
        </div>
      ) : (
        <Table
          variant="bordered"
          pagination={{
            page,
            pageCount: totalPages,
            onPageChange: handlePageChange,
          }}
        >
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...orgs].sort((a, b) => a.name.localeCompare(b.name)).map((org) => (
              <OrgRow
                key={org.id}
                org={org}
                orgId={orgId}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}

function OrgRow({
  org,
  orgId,
}: {
  org: AdminOrg;
  orgId: string;
}) {
  const router = useRouter();
  const detailHref = `/${orgId}/admin/organizations/${org.id}`;

  return (
    <TableRow>
      <TableCell>
        <div className="max-w-[300px]">
          <div className="truncate">
            <Text size="sm" weight="medium">
              {org.name}
            </Text>
          </div>
          <div className="truncate">
            <Text size="xs" variant="muted">
              {org.id}
            </Text>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {org.owner ? (
          <div className="max-w-[250px]">
            <div className="truncate">
              <Text size="sm">{org.owner.name}</Text>
            </div>
            <div className="truncate">
              <Text size="xs" variant="muted">
                {org.owner.email}
              </Text>
            </div>
          </div>
        ) : (
          <Text size="xs" variant="muted">
            No owner
          </Text>
        )}
      </TableCell>
      <TableCell>
        <Text size="sm" variant="muted">
          {org.memberCount}
        </Text>
      </TableCell>
      <TableCell>
        <Text size="sm" variant="muted">
          {new Date(org.createdAt).toLocaleDateString()}
        </Text>
      </TableCell>
      <TableCell>
        <Badge variant={org.hasAccess ? 'default' : 'destructive'}>
          {org.hasAccess ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant="outline"
          iconLeft={<View size={16} />}
          onClick={() => router.push(detailHref)}
        >
          View
        </Button>
      </TableCell>
    </TableRow>
  );
}
